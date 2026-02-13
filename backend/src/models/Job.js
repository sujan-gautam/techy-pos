const mongoose = require('mongoose');

const jobSchema = mongoose.Schema({
    jobId: { type: String, required: true, unique: true }, // Readable ID e.g. JOB-1001
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
    customer: {
        name: { type: String, required: true },
        phone: { type: String },
        email: { type: String },
    },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    device_model: { type: String, required: true }, // e.g. "iPhone 12 Pro"
    fault_description: { type: String, required: true },
    repairTypes: [{ type: String }], // e.g., ['Screen repair', 'Battery repair']
    promisedTime: { type: Date }, // When promised to customer
    status: {
        type: String,
        enum: ['pending', 'diagnosing', 'waiting_parts', 'in_progress', 'completed', 'cancelled', 'returned'],
        default: 'pending'
    },
    priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
    assignedTechId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    
    // Parts workflow
    partsRequested: [{
        partId: { type: mongoose.Schema.Types.ObjectId, ref: 'Part' },
        qty: { type: Number, default: 1 },
        status: { type: String, enum: ['pending', 'reserved', 'used', 'cancelled'], default: 'pending' }
    }],
    partsUsed: [{
        partId: { type: mongoose.Schema.Types.ObjectId, ref: 'Part' },
        qty: { type: Number, default: 1 },
        serialNumber: { type: String }, // If applicable
        priceAtUsage: { type: Number }, // Snapshot of price
        usedAt: { type: Date, default: Date.now },
        techId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } 
    }],
    
    notes: [{
        text: String,
        author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        isPrivate: { type: Boolean, default: false }, // Tech-only notes vs customer visible
        timestamp: { type: Date, default: Date.now }
    }],
    
    images: [{ type: String }], // URLs to images
    
    totalCost: { type: Number, default: 0 },
    laborCost: { type: Number, default: 0 },
    
    completedAt: { type: Date },
}, { timestamps: true });

const Job = mongoose.model('Job', jobSchema);
module.exports = Job;
