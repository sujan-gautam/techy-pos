const express = require('express');
const router = express.Router();
const { 
    getReportStats, 
    exportJobsReport, 
    exportInventoryReport, 
    exportRevenueReport,
    getReportData
} = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');

router.get('/stats', protect, getReportStats);
router.get('/data', protect, getReportData);
router.get('/export/jobs', protect, exportJobsReport);
router.get('/export/inventory', protect, exportInventoryReport);
router.get('/export/revenue', protect, exportRevenueReport);

module.exports = router;
