const mongoose = require('mongoose');

const returnSchema = mongoose.Schema({
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' }, // If returned from a job
    partId: { type: mongoose.Schema.Types.ObjectId, ref: 'Part', required: true },
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
    qty: { type: Number, required: true },
    serialNumber: { type: String }, 
    reason: { type: String, required: true }, // "Defective", "Customer Cancelled", etc.
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'refunded', 'replaced'], default: 'pending' },
    vendorRMA: { type: String }, // Vendor Return Authorization
    trackingNumber: { type: String }, // Shipping to vendor
    replacementReceived: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

const Return = mongoose.model('Return', returnSchema);
module.exports = Return;
