const express = require('express');
const router = express.Router();
const { getSuppliers, createSupplier, updateSupplier, deleteSupplier } = require('../controllers/supplierController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getSuppliers);
router.post('/', authorize('admin', 'manager', 'technician'), createSupplier);
router.put('/:id', authorize('admin', 'manager', 'technician'), updateSupplier);
router.delete('/:id', authorize('admin', 'manager'), deleteSupplier);

module.exports = router;
