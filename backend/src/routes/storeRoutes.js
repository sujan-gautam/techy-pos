const express = require('express');
const router = express.Router();
const { createStore, getStores, updateStore, deleteStore } = require('../controllers/storeController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, getStores)
    .post(protect, authorize('admin'), createStore);
router.route('/:id')
    .put(protect, authorize('admin', 'manager'), updateStore)
    .delete(protect, authorize('admin'), deleteStore);

module.exports = router;
