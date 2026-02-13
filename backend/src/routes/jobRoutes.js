const express = require('express');
const router = express.Router();
const { 
    createJob, 
    getJobs, 
    getJobById, 
    getCompatibleParts,
    reservePart, 
    usePart, 
    reverseUsePart,
    completeJob,
    cancelJob,
    updateJob 
} = require('../controllers/jobController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, getJobs)
    .post(protect, createJob);

router.route('/compatible-parts')
    .get(protect, getCompatibleParts);

router.route('/:id')
    .get(protect, getJobById)
    .put(protect, updateJob);

router.route('/:id/parts/reserve').post(protect, reservePart);
router.route('/:id/parts/use').post(protect, usePart);
router.route('/:id/parts/reverse-use').post(protect, reverseUsePart);
router.route('/:id/complete').post(protect, completeJob);
router.route('/:id/cancel').post(protect, cancelJob);

module.exports = router;
