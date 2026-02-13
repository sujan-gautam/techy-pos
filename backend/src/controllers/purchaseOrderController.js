const asyncHandler = require('express-async-handler');
const PurchaseOrder = require('../models/PurchaseOrder');
const Inventory = require('../models/Inventory');
const Part = require('../models/Part');
const Transaction = require('../models/Transaction');
const { checkLowStock } = require('./inventoryController');

// @desc    Create new PO
// @route   POST /api/pos
// @access  Private (Manager/Admin)
const createPO = asyncHandler(async (req, res) => {
    const { supplier, items, expectedDate, storeId } = req.body;

    const poCount = await PurchaseOrder.countDocuments();
    const poId = `PO-${new Date().getFullYear()}-${1000 + poCount + 1}`;

    // Validate items
    // Should probably check if parts exist

    const purchaseOrder = await PurchaseOrder.create({
        poId,
        storeId: storeId || req.user.storeId,
        supplier,
        items, // [{ partId, orderedQty, costPerUnit }]
        expectedDate,
        createdBy: req.user._id,
        status: 'ordered' // Simply go to ordered for MVP
    });

    await Notification.create({
        storeId: purchaseOrder.storeId,
        type: 'purchase_order',
        title: 'New Purchase Order',
        message: `PO ${poId} has been generated for ${supplier}.`,
        link: `/pos/${purchaseOrder._id}`,
        metadata: { poId: purchaseOrder._id }
    });

    res.status(201).json(purchaseOrder);
});

// @desc    Get POs
// @route   GET /api/pos
// @access  Private
const getPOs = asyncHandler(async (req, res) => {
    const storeId = req.user.storeId;
    const pos = await PurchaseOrder.find({ storeId })
        .populate('items.partId', 'name sku')
        .sort({ createdAt: -1 });
    res.json(pos);
});

// @desc    Get PO by ID
// @route   GET /api/pos/:id
// @access  Private
const getPOById = asyncHandler(async (req, res) => {
    const po = await PurchaseOrder.findById(req.params.id)
        .populate('items.partId', 'name sku series');

    if (po) {
        res.json(po);
    } else {
        res.status(404);
        throw new Error('Purchase Order not found');
    }
});

// @desc    Receive PO (Full or Partial)
// @route   POST /api/pos/:id/receive
// @access  Private (Manager/Admin)
const receivePO = asyncHandler(async (req, res) => {
    const { items, note } = req.body; // items: [{ partId, qty, serialNumbers[] }]
    const po = await PurchaseOrder.findById(req.params.id);

    if (!po) {
        res.status(404);
        throw new Error('PO not found');
    }

    if (po.status === 'received' || po.status === 'cancelled') {
        res.status(400);
        throw new Error(`PO is already ${po.status}`);
    }

    // Process reception
    const receivedChunk = {
        receivedAt: Date.now(),
        receivedBy: req.user._id,
        note,
        items: []
    };

    for (const item of items) {
        const { partId, qty, serialNumbers } = item;
        
        // Update PO item receivedQty
        const poItem = po.items.find(p => p.partId.toString() === partId);
        if (poItem) {
            poItem.receivedQty += qty;
        }

        // Update Inventory
        // Find or create inventory for this store/part
        let inventory = await Inventory.findOne({ partId, storeId: po.storeId });
        
        if (!inventory) {
            inventory = await Inventory.create({
                partId,
                storeId: po.storeId,
                quantity: 0,
                locationId: null
            });
        }

        // Add Stock
        inventory.quantity += qty;
        if (serialNumbers && serialNumbers.length > 0) {
            inventory.serialNumbers.push(...serialNumbers);
        }
        await inventory.save();

        // Create Transaction
        await Transaction.create({
            partId,
            storeId: po.storeId,
            inventoryId: inventory._id,
            type: 'purchase_receive',
            qtyChange: qty,
            prevQty: inventory.quantity - qty,
            newQty: inventory.quantity,
            referenceType: 'PurchaseOrder',
            referenceId: po._id,
            performedBy: req.user._id,
            note: `Received from PO ${po.poId}`, 
            timestamp: Date.now()
        });
        
        receivedChunk.items.push({ partId, qty, serialNumbers });
        
        // Check for low stock alerts (or clear existing ones)
        await checkLowStock(partId, po.storeId);
    }

    po.receivedChunks.push(receivedChunk);

    // Check if fully received
    const allReceived = po.items.every(item => item.receivedQty >= item.orderedQty);
    if (allReceived) {
        po.status = 'received';
    } else {
        po.status = 'partial_received';
    }

    await po.save();
    
    // Notify
    const io = req.app.get('io');
    io.emit('stock_update', { storeId: po.storeId });

    res.json(po);
});

module.exports = { createPO, getPOs, receivePO, getPOById };
