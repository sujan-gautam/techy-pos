const mongoose = require('mongoose');

const invoiceSchema = mongoose.Schema({
    invoiceId: { type: String, required: true, unique: true }, // e.g. INV-2023-1001
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
    customer: {
        name: String,
        email: String,
        phone: String,
        address: String
    },
    items: [{
        description: { type: String, required: true },
        qty: { type: Number, required: true },
        unitPrice: { type: Number, required: true },
        amount: { type: Number, required: true },
        type: { type: String, enum: ['part', 'labor', 'service', 'other'] }
    }],
    subtotal: { type: Number, required: true },
    tax: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    
    status: { 
        type: String, 
        enum: ['draft', 'issued', 'paid', 'cancelled', 'refunded'], 
        default: 'draft' 
    },
    paymentDetails: {
        method: { type: String, enum: ['cash', 'card', 'transfer', 'other'] },
        transactionId: String,
        paidAt: Date
    },
    
    issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: String
}, { timestamps: true });

const Invoice = mongoose.model('Invoice', invoiceSchema);
module.exports = Invoice;
