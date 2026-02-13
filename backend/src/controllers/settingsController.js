const asyncHandler = require('express-async-handler');
const SiteSettings = require('../models/SiteSettings');

// @desc    Get site settings (public)
// @route   GET /api/settings
// @access  Public
const getSettings = asyncHandler(async (req, res) => {
    const settings = await SiteSettings.getSettings();
    res.json(settings);
});

// @desc    Update site settings
// @route   PUT /api/settings
// @access  Private/Admin
const updateSettings = asyncHandler(async (req, res) => {
    const settings = await SiteSettings.getSettings();
    
    // Update fields
    const allowedFields = [
        'siteName', 'siteTagline', 'logoUrl', 'faviconUrl', 'primaryColor',
        'metaTitle', 'metaDescription', 'metaKeywords',
        'businessName', 'businessAddress', 'businessPhone', 'businessEmail', 'businessHours',
        'facebookUrl', 'twitterUrl', 'instagramUrl', 'linkedinUrl',
        'ogImage', 'twitterCard'
    ];
    
    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            settings[field] = req.body[field];
        }
    });
    
    settings.updatedBy = req.user._id;
    await settings.save();
    
    res.json(settings);
});

// @desc    Upload logo/favicon
// @route   POST /api/settings/upload
// @access  Private/Admin
const uploadImage = asyncHandler(async (req, res) => {
    if (!req.file) {
        res.status(400);
        throw new Error('No file uploaded');
    }
    
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ url: imageUrl });
});

module.exports = {
    getSettings,
    updateSettings,
    uploadImage
};
