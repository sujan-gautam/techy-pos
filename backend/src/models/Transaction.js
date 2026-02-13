const mongoose = require('mongoose');

const transactionSchema = mongoose.Schema({
    partId: { type: mongoose.Schema.Types.ObjectId, ref: 'Part', required: true },
    inventoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory' }, // Link to specific store stock
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
    type: {
        type: String,
        enum: ['adjustment', 'job_use', 'job_return', 'purchase_receive', 'transfer_in', 'transfer_out', 'vendor_return'],
        required: true
    },
    qtyChange: { type: Number, required: true }, // Can be positive or negative
    prevQty: { type: Number, required: true },
    newQty: { type: Number, required: true },
    referenceType: { type: String, enum: ['Job', 'PurchaseOrder', 'Return', 'Integration', 'Manual'] },
    referenceId: { type: mongoose.Schema.Types.ObjectId, refPath: 'referenceType' }, // ID of Job, PO, Return, etc.
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String }, // Mandatory for manual adjustments
    note: { type: String },
    timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

const Transaction = mongoose.model('Transaction', transactionSchema);
module.exports = Transaction;
