const mongoose = require('mongoose');

const stockLocationSchema = mongoose.Schema({
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
    name: { type: String, required: true }, // e.g. "Shelf A", "Bin 12"
    type: { type: String, enum: ['shelf', 'bin', 'cabinet', 'room'], default: 'shelf' },
}, { timestamps: true });

const StockLocation = mongoose.model('StockLocation', stockLocationSchema);
module.exports = StockLocation;
