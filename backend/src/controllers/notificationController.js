const asyncHandler = require('express-async-handler');
const Notification = require('../models/Notification');

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
const getNotifications = asyncHandler(async (req, res) => {
    const storeId = req.user.storeId;
    
    // Get notifications for this specific user OR global ones for this store
    const notifications = await Notification.find({
        storeId,
        $or: [
            { recipient: req.user._id },
            { recipient: null }
        ]
    })
    .sort({ createdAt: -1 })
    .limit(20);

    res.json(notifications);
});

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markAsRead = asyncHandler(async (req, res) => {
    const notification = await Notification.findById(req.params.id);

    if (notification) {
        notification.isRead = true;
        await notification.save();
        res.json({ message: 'Notification marked as read' });
    } else {
        res.status(404);
        throw new Error('Notification not found');
    }
});

// @desc    Mark all as read
// @route   PUT /api/notifications/read-all
// @access  Private
const markAllAsRead = asyncHandler(async (req, res) => {
    await Notification.updateMany(
        { 
            storeId: req.user.storeId,
            $or: [
                { recipient: req.user._id },
                { recipient: null }
            ],
            isRead: false 
        },
        { isRead: true }
    );
    res.json({ message: 'All notifications marked as read' });
});

module.exports = {
    getNotifications,
    markAsRead,
    markAllAsRead
};
