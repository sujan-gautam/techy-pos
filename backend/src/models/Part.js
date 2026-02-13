const mongoose = require('mongoose');

const partSchema = mongoose.Schema({
    sku: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    brand: { type: String },
    category: { type: String, index: true }, // e.g., "Screen", "Battery", "Charging Port"
    series: { type: String, index: true }, // e.g., "A Series", "S Series", "iPhone 13 Series"
    compatible_models: [{ type: String }], // e.g., "iPhone 13", "Samsung S21"
    unit: { type: String, default: 'pcs' }, // pcs, meters, etc.
    cost_price: { type: Number, required: true, min: 0 },
    retail_price: { type: Number, required: true, min: 0 },
    warranty_days: { type: Number, default: 0 },
    reorder_threshold: { type: Number, default: 5 }, // Global default
    is_serialized: { type: Boolean, default: false }, // If true, must track serial numbers
    image: { type: String }, // URL to image
    description: { type: String },
}, { timestamps: true });

const Part = mongoose.model('Part', partSchema);
module.exports = Part;
