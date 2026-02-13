const mongoose = require('mongoose');

const customerSchema = mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String },
    email: { type: String },
    address: { type: String },
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
    notes: String,
    totalSpent: { type: Number, default: 0 },
    jobCount: { type: Number, default: 0 }
}, { timestamps: true });

const Customer = mongoose.model('Customer', customerSchema);
module.exports = Customer;
