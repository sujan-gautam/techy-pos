const express = require('express');
const router = express.Router();
const { createPart, getParts, getPartById, updatePart } = require('../controllers/partController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, getParts)
    .post(protect, authorize('admin', 'manager'), createPart);
router.route('/:id')
    .get(protect, getPartById)
    .put(protect, authorize('admin', 'manager'), updatePart);

module.exports = router;
