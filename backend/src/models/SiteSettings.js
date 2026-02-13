const mongoose = require('mongoose');

const siteSettingsSchema = new mongoose.Schema({
    // General Settings
    siteName: {
        type: String,
        default: 'TechyPOS'
    },
    siteTagline: {
        type: String,
        default: 'Professional Repair Management System'
    },
    
    // Branding
    logoUrl: {
        type: String,
        default: ''
    },
    faviconUrl: {
        type: String,
        default: ''
    },
    primaryColor: {
        type: String,
        default: '#2563eb' // blue-600
    },
    
    // SEO
    metaTitle: {
        type: String,
        default: 'TechyPOS - Repair Shop Management'
    },
    metaDescription: {
        type: String,
        default: 'Professional point-of-sale and repair management system for tech repair shops'
    },
    metaKeywords: {
        type: String,
        default: 'repair shop, POS, inventory management, tech repair'
    },
    
    // Business Information
    businessName: {
        type: String,
        default: ''
    },
    businessAddress: {
        type: String,
        default: ''
    },
    businessPhone: {
        type: String,
        default: ''
    },
    businessEmail: {
        type: String,
        default: ''
    },
    businessHours: {
        type: String,
        default: 'Mon-Fri: 9AM-6PM'
    },
    
    // Social Media
    facebookUrl: {
        type: String,
        default: ''
    },
    twitterUrl: {
        type: String,
        default: ''
    },
    instagramUrl: {
        type: String,
        default: ''
    },
    linkedinUrl: {
        type: String,
        default: ''
    },
    
    // Advanced SEO
    ogImage: {
        type: String,
        default: ''
    },
    twitterCard: {
        type: String,
        default: 'summary_large_image'
    },
    
    // System
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Ensure only one settings document exists
siteSettingsSchema.statics.getSettings = async function() {
    let settings = await this.findOne();
    if (!settings) {
        settings = await this.create({});
    }
    return settings;
};

module.exports = mongoose.model('SiteSettings', siteSettingsSchema);
