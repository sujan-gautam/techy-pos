const express = require('express');
const router = express.Router();
const { getInventory, adjustInventory, getInventoryAllocations, logUsage } = require('../controllers/inventoryController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, getInventory)
    .post(protect, authorize('admin', 'manager', 'technician'), adjustInventory); // Manual adjustment

router.post('/use', protect, logUsage); // Technician usage (Job optional)

router.route('/:id/adjust')
    .patch(protect, authorize('admin', 'manager', 'technician'), adjustInventory);

router.get('/:id/allocations', protect, getInventoryAllocations);

module.exports = router;
