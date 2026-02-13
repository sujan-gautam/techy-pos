const asyncHandler = require('express-async-handler');
const Transaction = require('../models/Transaction');

const getTransactions = asyncHandler(async (req, res) => {
    const pageSize = 50;
    const page = Number(req.query.pageNumber) || 1;
    
    let storeFilter = {};
    if (req.user.role !== 'admin') {
        const storeId = req.query.storeId || req.user.storeId;
        if (storeId) {
            storeFilter = { storeId };
        }
    }

    // Filters
    const partId = req.query.partId ? { partId: req.query.partId } : {};
    let type = {};
    if (req.query.type) {
        if (req.query.type.includes(',')) {
            type = { type: { $in: req.query.type.split(',') } };
        } else {
            type = { type: req.query.type };
        }
    }
    const performedBy = req.query.userId ? { performedBy: req.query.userId } : {};
    
    // Usage Only logic: shows job_use, job_return, OR negative adjustments
    let usageQuery = {};
    if (req.query.usageOnly === 'true') {
        usageQuery = {
            $or: [
                { type: 'job_use' },
                { type: 'job_return' },
                { type: 'adjustment', qtyChange: { $lt: 0 } }
            ]
        };
    }

    // Date range - Handle inclusive local dates vs UTC shifts
    const dateQuery = {};
    if (req.query.startDate && req.query.endDate) {
        const start = new Date(req.query.startDate);
        const end = new Date(req.query.endDate);
        
        // Make end date inclusive of the entire day, 
        // and add an extra 24h buffer for UTC transition records 
        // from users in western timezones (like US/Canada)
        end.setHours(23, 59, 59, 999);
        end.setDate(end.getDate() + 1); // Add a day to catch "today's evening in local time" which is "tomorrow's morning in UTC"
        
        dateQuery.timestamp = {
            $gte: start,
            $lte: end
        };
    }

    const finalQuery = { ...storeFilter, ...partId, ...type, ...performedBy, ...dateQuery, ...usageQuery };
    const count = await Transaction.countDocuments(finalQuery);
    const transactions = await Transaction.find(finalQuery)
        .populate('partId', 'sku name')
        .populate('performedBy', 'name email')
        .populate('referenceId') // Polymorphic so just ID usually, can populate if needed
        .sort({ timestamp: -1 })
        .limit(pageSize)
        .skip(pageSize * (page - 1));
        
    res.json({ transactions, page, pages: Math.ceil(count / pageSize) });
});

module.exports = { getTransactions };
