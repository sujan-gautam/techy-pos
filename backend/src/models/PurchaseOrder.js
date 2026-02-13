const mongoose = require('mongoose');

const purchaseOrderSchema = mongoose.Schema({
    poId: { type: String, required: true, unique: true }, // e.g. PO-2023-001
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
    supplier: { type: String, required: true },
    status: {
        type: String,
        enum: ['draft', 'ordered', 'partial_received', 'received', 'cancelled'],
        default: 'draft'
    },
    items: [{
        partId: { type: mongoose.Schema.Types.ObjectId, ref: 'Part' },
        orderedQty: { type: Number, required: true },
        receivedQty: { type: Number, default: 0 },
        costPerUnit: { type: Number, required: true }
    }],
    receivedChunks: [{
        receivedAt: { type: Date, default: Date.now },
        receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        note: String,
        items: [{
            partId: { type: mongoose.Schema.Types.ObjectId, ref: 'Part' },
            qty: { type: Number },
            serialNumbers: [String]
        }]
    }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    expectedDate: { type: Date },
}, { timestamps: true });

const PurchaseOrder = mongoose.model('PurchaseOrder', purchaseOrderSchema);
module.exports = PurchaseOrder;
