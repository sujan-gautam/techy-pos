const mongoose = require('mongoose');

const supplierSchema = mongoose.Schema({
    name: { type: String, required: true },
    contactName: String,
    phone: String,
    email: String,
    address: String,
    website: String,
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
    notes: String,
    categories: [String], // e.g. ["Screens", "Batteries", "Tools"]
}, { timestamps: true });

const Supplier = mongoose.model('Supplier', supplierSchema);
module.exports = Supplier;
