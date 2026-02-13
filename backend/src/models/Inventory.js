const mongoose = require('mongoose');

const inventorySchema = mongoose.Schema({
    partId: { type: mongoose.Schema.Types.ObjectId, ref: 'Part', required: true },
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
    locationId: { type: mongoose.Schema.Types.ObjectId, ref: 'StockLocation' }, // e.g. Shelf A
    quantity: { type: Number, required: true, default: 0 },
    reservedQuantity: { type: Number, default: 0 }, // Reserved for active jobs
    serialNumbers: [{ type: String }], // For serialized parts
    batchNumber: { type: String }, // For batch tracking
}, { timestamps: true });

// Compound index to ensure one inventory record per part per store (per location if needed, but usually per store/location combo)
inventorySchema.index({ partId: 1, storeId: 1, locationId: 1 }, { unique: true });

const Inventory = mongoose.model('Inventory', inventorySchema);
module.exports = Inventory;
