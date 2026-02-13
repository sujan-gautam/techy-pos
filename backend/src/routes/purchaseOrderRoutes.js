const express = require('express');
const router = express.Router();
const { createPO, getPOs, receivePO, getPOById } = require('../controllers/purchaseOrderController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, getPOs)
    .post(protect, authorize('admin', 'manager'), createPO);

router.route('/:id')
    .get(protect, getPOById);

router.route('/:id/receive')
    .post(protect, authorize('admin', 'manager'), receivePO);

module.exports = router;
