const express = require('express');
const router = express.Router();
const { getInventory, adjustInventory, getInventoryAllocations, logUsage } = require('../controllers/inventoryController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, getInventory)
    .post(protect, authorize('admin', 'manager'), adjustInventory); // Manual adjustment

router.post('/use', protect, logUsage); // Technician usage (Job optional)

router.get('/:id/allocations', protect, getInventoryAllocations);

module.exports = router;
