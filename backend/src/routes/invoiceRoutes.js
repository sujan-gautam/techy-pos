const express = require('express');
const router = express.Router();
const { generateInvoice, getInvoices, getInvoiceById, payInvoice } = require('../controllers/invoiceController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getInvoices);
router.post('/generate/:jobId', protect, generateInvoice);
router.get('/:id', protect, getInvoiceById);
router.put('/:id/pay', protect, payInvoice);

module.exports = router;
