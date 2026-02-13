const asyncHandler = require('express-async-handler');
const Inventory = require('../models/Inventory');
const Transaction = require('../models/Transaction');
const Part = require('../models/Part');
const Notification = require('../models/Notification');

const checkLowStock = async (partId, storeId) => {
    const inventory = await Inventory.findOne({ partId, storeId }).populate('partId');
    if (inventory && inventory.partId.reorder_threshold !== undefined) {
        if (inventory.quantity <= inventory.partId.reorder_threshold) {
            // Check if active notification already exists to avoid spam
            const existing = await Notification.findOne({
                storeId,
                type: 'low_stock',
                'metadata.partId': partId,
                isRead: false
            });

            if (!existing) {
                await Notification.create({
                    storeId,
                    type: 'low_stock',
                    title: 'Low Stock Alert',
                    message: `${inventory.partId.name} is low on stock (${inventory.quantity} remaining). Reorder threshold is ${inventory.partId.reorder_threshold}.`,
                    link: '/inventory',
                    metadata: { partId: inventory.partId._id }
                });
            }
        } else {
            // If stock is now ABOVE threshold, clear any active low stock alerts for this part
            await Notification.updateMany({
                storeId,
                type: 'low_stock',
                'metadata.partId': partId,
                isRead: false
            }, { isRead: true });
        }
    }
};

const getInventory = asyncHandler(async (req, res) => {
    const storeId = req.query.storeId || req.user?.storeId;
    
    // If we have a storeId, filter by it. Otherwise return all (for single-store setups or master view)
    const query = storeId ? { storeId } : {};
    
    const inventory = await Inventory.find(query)
        .populate('partId', 'sku name brand cost_price retail_price image category series reorder_threshold');
        
    res.json(inventory);
});

// @desc    Get detailed allocation for a specific inventory item
// @route   GET /api/inventory/:id/allocations
const getInventoryAllocations = asyncHandler(async (req, res) => {
    const inventory = await Inventory.findById(req.params.id);
    if (!inventory) {
        res.status(404);
        throw new Error('Inventory not found');
    }

    // Find all jobs in this store that have this part in 'partsRequested' with status 'reserved'
    const Job = require('../models/Job');
    const jobs = await Job.find({
        storeId: inventory.storeId,
        'partsRequested': {
            $elemMatch: {
                partId: inventory.partId,
                status: 'reserved'
            }
        }
    }).select('jobId customer device_model status createdAt partsRequested');

    // Filter the specific partsRequested item for each job to show qty
    const allocations = jobs.map(job => {
        const partReq = job.partsRequested.find(p => p.partId.toString() === inventory.partId.toString() && p.status === 'reserved');
        return {
            jobId: job.jobId,
            _id: job._id,
            customer: job.customer.name,
            device: job.device_model,
            qty: partReq ? partReq.qty : 0,
            date: job.createdAt
        };
    });

    res.json(allocations);
});

const adjustInventory = asyncHandler(async (req, res) => {
    const { partId, qtyChange, reason, note } = req.body;
    const storeId = req.user.storeId;

    if (!qtyChange || qtyChange === 0) {
        res.status(400);
        throw new Error('Quantity change must be non-zero');
    }

    let inventory;
    let effectivePartId = partId;

    if (req.params.id) {
        inventory = await Inventory.findById(req.params.id);
        if (inventory) {
            effectivePartId = inventory.partId;
        }
    } else if (partId) {
        inventory = await Inventory.findOne({ partId, storeId });
    }

    const effectiveStoreId = inventory ? inventory.storeId : storeId;

    if (!inventory) {
        // If adding stock to new item in store, create inventory record
        if (qtyChange > 0 && effectivePartId && effectiveStoreId) {
             const newInv = await Inventory.create({
                partId: effectivePartId,
                storeId: effectiveStoreId,
                quantity: qtyChange,
                locationId: null 
             });
             
             await Transaction.create({
                partId: effectivePartId,
                storeId: effectiveStoreId,
                inventoryId: newInv._id,
                type: 'adjustment',
                qtyChange,
                prevQty: 0,
                newQty: qtyChange,
                performedBy: req.user._id,
                reason,
                note
            });
            
            res.status(201).json(newInv);
            return;
        }
        res.status(404);
        throw new Error('Inventory not found for this part at this store');
    }

    const prevQty = inventory.quantity;
    const newQty = prevQty + Number(qtyChange);

    if (newQty < 0) {
        res.status(400);
        throw new Error('Cannot reduce stock below zero');
    }

    inventory.quantity = newQty;
    await inventory.save();

    await Transaction.create({
        partId: effectivePartId,
        storeId: effectiveStoreId,
        inventoryId: inventory._id,
        type: 'adjustment',
        qtyChange,
        prevQty,
        newQty,
        performedBy: req.user._id,
        reason,
        note
    });

    await checkLowStock(effectivePartId, effectiveStoreId);

    res.json(inventory);
});

const logUsage = asyncHandler(async (req, res) => {
    const { partId, qty, note, techId } = req.body;
    const storeId = req.user.storeId;
    const effectiveTechId = techId || req.user._id;

    if (!qty || qty <= 0) {
        res.status(400);
        throw new Error('Quantity must be greater than zero');
    }

    // Find inventory - if user has no storeId, search without store filter
    const inventoryQuery = storeId ? { partId, storeId } : { partId };
    const inventory = await Inventory.findOne(inventoryQuery);
    
    if (!inventory) {
        res.status(404);
        throw new Error(`Part not found in inventory${storeId ? ' for your store' : ''}. Please check the part ID.`);
    }

    if (inventory.quantity < qty) {
        res.status(400);
        throw new Error(`Insufficient stock. Available: ${inventory.quantity}, Requested: ${qty}`);
    }

    const prevQty = inventory.quantity;
    inventory.quantity -= Number(qty);
    await inventory.save();

    await Transaction.create({
        partId,
        storeId: inventory.storeId, // Use inventory's storeId
        inventoryId: inventory._id,
        type: 'adjustment',
        qtyChange: -Number(qty),
        prevQty,
        newQty: inventory.quantity,
        performedBy: effectiveTechId,
        reason: 'technician_usage',
        note: note || 'Technician quick-log usage (No Job Reference)'
    });

    await checkLowStock(partId, inventory.storeId);
    res.json({ message: 'Usage logged successfully', inventory });
});

module.exports = { getInventory, adjustInventory, getInventoryAllocations, logUsage, checkLowStock };
