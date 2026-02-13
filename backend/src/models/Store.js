const mongoose = require('mongoose');

const storeSchema = mongoose.Schema({
    name: { type: String, required: true },
    address: { type: String }, 
    timezone: { type: String, default: 'UTC' },
    franchiseId: { type: String }, // For multi-franchise grouping
    contactPhone: { type: String },
    contactEmail: { type: String },
}, { timestamps: true });

const Store = mongoose.model('Store', storeSchema);
module.exports = Store;
