const asyncHandler = require('express-async-handler');
const Job = require('../models/Job');
const Inventory = require('../models/Inventory');
const Part = require('../models/Part');
const Invoice = require('../models/Invoice');

// @desc    Get dashboard/report stats
// @route   GET /api/reports/stats
// @access  Private
const getReportStats = asyncHandler(async (req, res) => {
    const storeId = req.user.storeId; // Filter by store if needed, or all if admin?
    // For now, let's assume scoped to store or all if not specified
    const match = storeId ? { storeId } : {};

    // 1. Job Status Counts
    const jobStats = await Job.aggregate([
        { $match: match },
        { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const stats = {
        pending: 0,
        in_progress: 0,
        completed: 0,
        cancelled: 0
    };

    jobStats.forEach(stat => {
        if (stats[stat._id] !== undefined) {
            stats[stat._id] = stat.count;
        }
    });

    // 2. Low Stock Items (Accurate check against Part threshold)
    const inventoryItems = await Inventory.find(match).populate('partId', 'reorder_threshold');
    const lowStockCount = inventoryItems.filter(item => 
        item.partId && item.quantity <= (item.partId.reorder_threshold || 5)
    ).length;

    // 3. Revenue from PAID invoices
    const revenueData = await Invoice.aggregate([
        { $match: { ...match, status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    // 4. Weekly Revenue (Last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const weeklyRevenueRaw = await Invoice.aggregate([
        { 
            $match: { 
                ...match, 
                status: 'paid',
                'paymentDetails.paidAt': { $gte: sevenDaysAgo }
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

    // Fill missing days with zero
    const weeklyRevenue = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
        const existing = weeklyRevenueRaw.find(r => r._id === dateStr);
        weeklyRevenue.push({
            name: dayName,
            revenue: existing ? existing.dailyTotal : 0
        });
    }

    // 6. Material Usage Stats (New feat snap)
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    
    const Transaction = require('../models/Transaction');
    const usageToday = await Transaction.aggregate([
        {
            $match: {
                ...match,
                timestamp: { $gte: startOfToday },
                type: { $in: ['job_use', 'adjustment'] },
                $or: [
                    { type: 'job_use' },
                    { type: 'adjustment', reason: 'technician_usage' }
                ]
            }
        },
        { $group: { _id: null, totalQty: { $sum: { $abs: "$qtyChange" } } } }
    ]);

    const usageWeekly = await Transaction.aggregate([
        {
            $match: {
                ...match,
                timestamp: { $gte: sevenDaysAgo },
                type: { $in: ['job_use', 'adjustment'] },
                $or: [
                    { type: 'job_use' },
                    { type: 'adjustment', reason: 'technician_usage' }
                ]
            }
        },
        { $group: { _id: null, totalQty: { $sum: { $abs: "$qtyChange" } } } }
    ]);

    // 5. Recent Jobs
    const recentJobs = await Job.find(match)
        .sort({ createdAt: -1 })
        .limit(5)
        .select('jobId device_model status createdAt customer');

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

module.exports = { getReportStats };
