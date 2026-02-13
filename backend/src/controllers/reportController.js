const asyncHandler = require('express-async-handler');
const Job = require('../models/Job');
const Inventory = require('../models/Inventory');
const Part = require('../models/Part');
const Invoice = require('../models/Invoice');
const Transaction = require('../models/Transaction');
const { format } = require('date-fns');

// @desc    Get dashboard/report stats
// @route   GET /api/reports/stats
// @access  Private
const getReportStats = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    let dateFilter = {};
    
    if (startDate && endDate) {
        dateFilter = {
            createdAt: {
                $gte: new Date(startDate),
                $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
            }
        };
    }

    const match = req.user.storeId ? { storeId: req.user.storeId, ...dateFilter } : { ...dateFilter };
    const invoiceMatch = req.user.storeId ? { storeId: req.user.storeId } : {};
    
    let revenueDateFilter = {};
    if (startDate && endDate) {
        revenueDateFilter = {
            'paymentDetails.paidAt': {
                $gte: new Date(startDate),
                $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
            }
        };
    }

    // 1. Job Status Counts
    const jobStatsRaw = await Job.aggregate([
        { $match: match },
        { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const stats = {
        pending: 0,
        in_progress: 0,
        completed: 0,
        cancelled: 0,
        diagnosing: 0,
        waiting_parts: 0
    };
    jobStatsRaw.forEach(s => {
        stats[s._id] = s.count;
    });

    // 2. Low Stock Items (Threshold check)
    const inventoryItems = await Inventory.find(req.user.storeId ? { storeId: req.user.storeId } : {}).populate('partId', 'reorder_threshold');
    const lowStockCount = inventoryItems.filter(item => 
        item.partId && item.quantity <= (item.partId.reorder_threshold || 5)
    ).length;

    // 3. Total Revenue
    const revenueData = await Invoice.aggregate([
        { $match: { ...invoiceMatch, ...revenueDateFilter, status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    // 4. Revenue Trend
    const today = new Date();
    const rangeStart = startDate ? new Date(startDate) : new Date(new Date().setDate(today.getDate() - 7));
    const rangeEnd = endDate ? new Date(endDate) : today;

    const weeklyRevenueRaw = await Invoice.aggregate([
        { 
            $match: { 
                ...invoiceMatch, 
                status: 'paid',
                'paymentDetails.paidAt': { $gte: rangeStart, $lte: new Date(new Date(rangeEnd).setHours(23, 59, 59, 999)) }
            } 
        },
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$paymentDetails.paidAt" } },
                dailyTotal: { $sum: "$total" }
            }
        },
        { $sort: { "_id": 1 } }
    ]);

    const weeklyRevenue = weeklyRevenueRaw.map(item => ({
        name: format(new Date(item._id), 'MMM dd'),
        revenue: item.dailyTotal
    }));

    // 5. Material Usage
    const usageToday = await Transaction.aggregate([
        { 
            $match: { 
                ...(req.user.storeId ? { storeId: req.user.storeId } : {}),
                type: 'job_use',
                timestamp: { $gte: new Date(new Date().setHours(0,0,0,0)) }
            } 
        },
        { $group: { _id: null, totalQty: { $sum: { $abs: '$qtyChange' } } } }
    ]);

    const usageWeekly = await Transaction.aggregate([
        { 
            $match: { 
                ...(req.user.storeId ? { storeId: req.user.storeId } : {}),
                type: 'job_use',
                timestamp: { $gte: rangeStart }
            } 
        },
        { $group: { _id: null, totalQty: { $sum: { $abs: '$qtyChange' } } } }
    ]);

    // 6. Recent Jobs
    const recentJobs = await Job.find(match)
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('customer', 'name');

    res.json({
        jobCounts: stats,
        lowStockCount,
        revenue: revenueData[0]?.total || 0,
        activeRepairs: (stats.in_progress || 0) + (stats.pending || 0) + (stats.diagnosing || 0) + (stats.waiting_parts || 0),
        weeklyRevenue,
        recentJobs,
        usageStats: {
            today: usageToday[0]?.totalQty || 0,
            weekly: usageWeekly[0]?.totalQty || 0
        }
    });
});

// @desc    Export Jobs Report to CSV
const exportJobsReport = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    let dateFilter = {};
    if (startDate && endDate) {
        dateFilter = {
            createdAt: { $gte: new Date(startDate), $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)) }
        };
    }
    const match = req.user.storeId ? { storeId: req.user.storeId, ...dateFilter } : { ...dateFilter };
    const jobs = await Job.find(match).populate('customer', 'name').sort({ createdAt: -1 });

    let csv = 'Job ID,Customer,Model,Status,Total Cost,Labor,Created At\n';
    jobs.forEach(j => {
        csv += `${j.jobId},"${j.customer?.name || 'Walk-in'}","${j.device_model}",${j.status},${j.totalCost},${j.laborCost},${j.createdAt.toISOString()}\n`;
    });

    res.header('Content-Type', 'text/csv');
    res.attachment(`jobs_report_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
});

// @desc    Export Inventory Report to CSV
const exportInventoryReport = asyncHandler(async (req, res) => {
    const match = req.user.storeId ? { storeId: req.user.storeId } : {};
    const inventory = await Inventory.find(match).populate('partId');

    let csv = 'Part Name,SKU,Category,Quantity,In Stock,Reorder Level\n';
    inventory.forEach(i => {
        csv += `"${i.partId?.name}","${i.partId?.sku}","${i.partId?.category}",${i.quantity},${i.quantity > 0 ? 'Yes' : 'No'},${i.partId?.reorder_threshold}\n`;
    });

    res.header('Content-Type', 'text/csv');
    res.attachment(`inventory_report_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
});

// @desc    Export Revenue Report to CSV
const exportRevenueReport = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    let dateFilter = {};
    if (startDate && endDate) {
        dateFilter = {
            'paymentDetails.paidAt': { $gte: new Date(startDate), $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)) }
        };
    }
    const match = req.user.storeId ? { storeId: req.user.storeId, status: 'paid', ...dateFilter } : { status: 'paid', ...dateFilter };
    const invoices = await Invoice.find(match).populate('customer', 'name').sort({ createdAt: -1 });

    let csv = 'Invoice ID,Customer,Amount,Subtotal,Tax,Discount,Paid At\n';
    invoices.forEach(inv => {
        csv += `${inv.invoiceId},"${inv.customer?.name || 'Walk-in'}",${inv.total},${inv.subtotal},${inv.tax},${inv.discount},${inv.paymentDetails?.paidAt?.toISOString() || inv.createdAt.toISOString()}\n`;
    });

    res.header('Content-Type', 'text/csv');
    res.attachment(`revenue_report_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
});

// @desc    Get raw data for custom reports
// @route   GET /api/reports/data
// @access  Private
const getReportData = asyncHandler(async (req, res) => {
    try {
        const { type, startDate, endDate, minQty, status } = req.query;
        let match = req.user.storeId ? { storeId: req.user.storeId } : {};

        if (startDate && startDate !== '' && endDate && endDate !== '') {
            const dateField = type === 'sales' ? 'paymentDetails.paidAt' : 'createdAt';
            const start = new Date(startDate);
            const end = new Date(endDate);
            
            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                match[dateField] = {
                    $gte: start,
                    $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
                };
            }
        }

        if (type === 'sales') {
            const invoices = await Invoice.find({ ...match, status: 'paid' })
                .sort({ 'paymentDetails.paidAt': -1 });
            return res.json(invoices);
        }

        if (type === 'inventory') {
            let invMatch = req.user.storeId ? { storeId: req.user.storeId } : {};
            if (minQty && minQty !== '') {
                invMatch.quantity = { $lt: Number(minQty) };
            }
            const inventory = await Inventory.find(invMatch)
                .populate({
                    path: 'partId',
                    select: 'name sku category cost price reorder_threshold'
                });
            return res.json(inventory);
        }

        if (type === 'jobs') {
            if (status) match.status = status;
            const jobs = await Job.find(match)
                .populate('assignedTechId', 'name')
                .sort({ createdAt: -1 });
            return res.json(jobs);
        }

        res.status(400);
        throw new Error('Invalid report type');
    } catch (error) {
        console.error('Report Data Error:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = {
    getReportStats,
    exportJobsReport,
    exportInventoryReport,
    exportRevenueReport,
    getReportData
};
