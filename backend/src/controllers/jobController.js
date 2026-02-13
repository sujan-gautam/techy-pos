const asyncHandler = require('express-async-handler');
const Job = require('../models/Job');
const Inventory = require('../models/Inventory');
const Part = require('../models/Part');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const { upsertCustomer } = require('./customerController');

// @desc    Create new job with automatic part reservation
// @route   POST /api/jobs
// @access  Private (Tech/Manager)
const createJob = asyncHandler(async (req, res) => {
    const { 
        customer, 
        device_model, 
        fault_description, 
        storeId, 
        priority, 
        repairTypes,
        repairPrice,
        promisedTime,
        partsToReserve // Array of { partId, qty }
    } = req.body;

    // Build job
    const jobCount = await Job.countDocuments();
    const jobId = `JOB-${new Date().getFullYear()}-${1000 + jobCount + 1}`;

    const effectiveStoreId = storeId || req.user.storeId;

    // Upsert Customer
    const customerObj = await upsertCustomer(customer, effectiveStoreId);

    // Auto-generate description from repair types if not provided
    const description = fault_description || (repairTypes && repairTypes.length > 0 
        ? repairTypes.join(', ') 
        : 'General repair');

    const job = await Job.create({
        jobId,
        storeId: effectiveStoreId,
        customer,
        customerId: customerObj._id,
        device_model,
        fault_description: description,
        priority: priority || 'normal',
        repairTypes: repairTypes || [],
        totalCost: repairPrice || 0,
        promisedTime,
        createdBy: req.user._id,
        assignedTechId: req.user._id,
        status: 'pending'
    });

    await Notification.create({
        storeId: effectiveStoreId,
        type: 'job_update',
        title: 'New Repair Job',
        message: `${customer.name} - ${device_model} (ID: ${jobId})`,
        link: `/jobs/${job._id}`,
        metadata: { jobId: job._id }
    });

    // Auto-reserve parts if provided
    if (partsToReserve && partsToReserve.length > 0) {
        for (const { partId, qty } of partsToReserve) {
            try {
                const inventory = await Inventory.findOne({ 
                    partId, 
                    storeId: effectiveStoreId
                });

                if (inventory && inventory.quantity >= qty) {
                    // Reserve the part
                    await Inventory.findOneAndUpdate(
                        { _id: inventory._id, quantity: { $gte: qty } },
                        { $inc: { quantity: -qty, reservedQuantity: qty } }
                    );

                    job.partsRequested.push({
                        partId,
                        qty,
                        status: 'reserved'
                    });
                }
            } catch (error) {
                console.error(`Failed to reserve part ${partId}:`, error);
            }
        }
        await job.save();
    }

    const populatedJob = await Job.findById(job._id)
        .populate('partsRequested.partId', 'name sku retail_price')
        .populate('assignedTechId', 'name');

    res.status(201).json(populatedJob);
});

// @desc    Get compatible parts for device
// @route   GET /api/jobs/compatible-parts
// @access  Private
const getCompatibleParts = asyncHandler(async (req, res) => {
    const { device_model, category, storeId } = req.query;
    
    const effectiveStoreId = storeId || req.user.storeId;

    // Search for parts that match the device model
    const parts = await Part.find({
        $or: [
            { name: { $regex: device_model, $options: 'i' } },
            { compatible_models: { $regex: device_model, $options: 'i' } }
        ],
        ...(category && { category })
    }).limit(20);

    // Get inventory status for each part
    const partsWithStock = await Promise.all(
        parts.map(async (part) => {
            const inventory = await Inventory.findOne({ 
                partId: part._id, 
                storeId: effectiveStoreId 
            });
            
            return {
                _id: part._id,
                name: part.name,
                sku: part.sku,
                category: part.category,
                retail_price: part.retail_price,
                stock: inventory ? {
                    available: inventory.quantity,
                    reserved: inventory.reservedQuantity
                } : { available: 0, reserved: 0 }
            };
        })
    );

    res.json(partsWithStock);
});

// @desc    Get all jobs
// @route   GET /api/jobs
// @access  Private
const getJobs = asyncHandler(async (req, res) => {
    const pageSize = 20;
    const page = Number(req.query.pageNumber) || 1;
    
    const keyword = req.query.keyword ? {
        $or: [
            { 'customer.name': { $regex: req.query.keyword, $options: 'i' } },
            { jobId: { $regex: req.query.keyword, $options: 'i' } },
            { device_model: { $regex: req.query.keyword, $options: 'i' } }
        ]
    } : {};

    const statusFilter = req.query.status ? { status: req.query.status } : {};
    const storeFilter = req.user.role === 'admin' ? {} : { storeId: req.user.storeId };
    const assignedFilter = req.query.assignedTechId ? { assignedTechId: req.query.assignedTechId } : {};

    const count = await Job.countDocuments({ ...keyword, ...statusFilter, ...storeFilter, ...assignedFilter });
    const jobs = await Job.find({ ...keyword, ...statusFilter, ...storeFilter, ...assignedFilter })
        .populate('assignedTechId', 'name')
        .populate('partsRequested.partId', 'name sku')
        .limit(pageSize)
        .skip(pageSize * (page - 1))
        .sort({ createdAt: -1 });

    res.json({ jobs, page, pages: Math.ceil(count / pageSize) });
});

// @desc    Get job by ID
// @route   GET /api/jobs/:id
// @access  Private
const getJobById = asyncHandler(async (req, res) => {
    const job = await Job.findById(req.params.id)
        .populate('assignedTechId', 'name email')
        .populate('partsRequested.partId', 'name sku retail_price')
        .populate('partsUsed.partId', 'name sku retail_price')
        .populate('notes.author', 'name');

    if (job) {
        res.json(job);
    } else {
        res.status(404);
        throw new Error('Job not found');
    }
});

// @desc    Reserve part for job
// @route   POST /api/jobs/:id/parts/reserve
// @access  Private (Tech)
const reservePart = asyncHandler(async (req, res) => {
    const { partId, qty } = req.body;
    const job = await Job.findById(req.params.id);

    if (!job) {
        res.status(404);
        throw new Error('Job not found');
    }

    const inventory = await Inventory.findOne({ 
        partId, 
        storeId: job.storeId
    });

    if (!inventory) {
        res.status(404);
        throw new Error('Part not found in this store');
    }

    const updatedInventory = await Inventory.findOneAndUpdate(
        { _id: inventory._id, quantity: { $gte: qty } },
        { $inc: { quantity: -qty, reservedQuantity: qty } },
        { new: true }
    );

    if (!updatedInventory) {
        res.status(400);
        throw new Error('Insufficient stock to reserve');
    }

    job.partsRequested.push({
        partId,
        qty,
        status: 'reserved'
    });

    await job.save();

    const io = req.app.get('io');
    io.emit('stock_update', { partId, storeId: job.storeId });

    res.json({ message: 'Part reserved successfully', inventory: updatedInventory });
});

// @desc    Use part (finalize usage)
// @route   POST /api/jobs/:id/parts/use
// @access  Private (Tech)
const usePart = asyncHandler(async (req, res) => {
    const { partId, qty, serialNumber, note, techId } = req.body;
    const job = await Job.findById(req.params.id);

    if (!job) {
        res.status(404);
        throw new Error('Job not found');
    }

    const effectiveTechId = techId || req.user._id;
    const inventory = await Inventory.findOne({ partId, storeId: job.storeId });
    if (!inventory) {
        res.status(404);
        throw new Error('Part inventory not found');
    }
    
    let consumedFromReserved = 0;
    let consumedFromStock = 0;
    
    const reservedEntryIndex = job.partsRequested.findIndex(p => p.partId.toString() === partId && p.status === 'reserved');
    
    if (reservedEntryIndex !== -1) {
        const reservedQty = job.partsRequested[reservedEntryIndex].qty;
        
        if (reservedQty >= qty) {
            consumedFromReserved = qty;
            if (reservedQty === qty) {
                 job.partsRequested[reservedEntryIndex].status = 'used';
            } else {
                 job.partsRequested[reservedEntryIndex].qty -= qty;
            }
        } else {
            consumedFromReserved = reservedQty;
            consumedFromStock = qty - reservedQty;
            job.partsRequested[reservedEntryIndex].status = 'used';
        }
    } else {
        consumedFromStock = qty;
    }

    if (consumedFromReserved > 0) {
         await Inventory.updateOne(
            { _id: inventory._id },
            { $inc: { reservedQuantity: -consumedFromReserved } }
        );
    }

    if (consumedFromStock > 0) {
         const stockUpdate = await Inventory.findOneAndUpdate(
            { _id: inventory._id, quantity: { $gte: consumedFromStock } },
            { $inc: { quantity: -consumedFromStock } }
        );
        
        if (!stockUpdate) {
            res.status(400);
            throw new Error(`Insufficient stock. Reserved: ${consumedFromReserved}, Needed from stock: ${consumedFromStock}`);
        }
    }

    await Transaction.create({
        partId,
        storeId: job.storeId,
        type: 'job_use',
        qtyChange: -qty,
        prevQty: inventory.quantity + inventory.reservedQuantity,
        newQty: (inventory.quantity - consumedFromStock) + (inventory.reservedQuantity - consumedFromReserved),
        referenceType: 'Job',
        referenceId: job._id,
        performedBy: effectiveTechId,
        note: note || `Used in Job ${job.jobId}`,
        timestamp: Date.now()
    });

    job.partsUsed.push({
        partId,
        qty,
        serialNumber,
        techId: effectiveTechId,
        usedAt: Date.now()
    });

    const part = await Part.findById(partId);
    
    // Add accountability note
    job.notes.push({
        text: `Installed component: ${qty}x ${part?.name || 'Unknown Component'}. ${serialNumber ? `SN: ${serialNumber}` : ''}`,
        author: effectiveTechId,
        timestamp: Date.now()
    });

    await job.save();
    
    const io = req.app.get('io');
    io.emit('stock_update', { partId, storeId: job.storeId });
    io.emit('job_update', { jobId: job._id });

    res.json({ message: 'Part used', job });
});

// @desc    Complete job (auto-consume reserved parts)
// @route   POST /api/jobs/:id/complete
// @access  Private (Tech)
const completeJob = asyncHandler(async (req, res) => {
    const job = await Job.findById(req.params.id);

    if (!job) {
        res.status(404);
        throw new Error('Job not found');
    }

    // Auto-consume all reserved parts
    for (const partRequest of job.partsRequested) {
        if (partRequest.status === 'reserved') {
            const inventory = await Inventory.findOne({ 
                partId: partRequest.partId, 
                storeId: job.storeId 
            });

            if (inventory) {
                // Move from reserved to consumed
                await Inventory.updateOne(
                    { _id: inventory._id },
                    { $inc: { reservedQuantity: -partRequest.qty } }
                );

                // Log transaction
                await Transaction.create({
                    partId: partRequest.partId,
                    storeId: job.storeId,
                    type: 'job_use',
                    qtyChange: -partRequest.qty,
                    referenceType: 'Job',
                    referenceId: job._id,
                    performedBy: req.user._id,
                    note: `Auto-consumed on job completion: ${job.jobId}`,
                    timestamp: Date.now()
                });

                // Add to partsUsed
                job.partsUsed.push({
                    partId: partRequest.partId,
                    qty: partRequest.qty,
                    techId: req.user._id,
                    usedAt: Date.now()
                });

                partRequest.status = 'used';
            }
        }
    }

    job.status = 'completed';
    job.completedAt = Date.now();
    await job.save();

    const io = req.app.get('io');
    io.emit('job_update', { jobId: job._id });

    res.json({ message: 'Job completed successfully', job });
});

// @desc    Cancel job (return reserved parts)
// @route   POST /api/jobs/:id/cancel
// @access  Private (Tech/Manager)
const cancelJob = asyncHandler(async (req, res) => {
    const { reason } = req.body;
    const job = await Job.findById(req.params.id);

    if (!job) {
        res.status(404);
        throw new Error('Job not found');
    }

    // Return all reserved parts to inventory
    for (const partRequest of job.partsRequested) {
        if (partRequest.status === 'reserved') {
            await Inventory.updateOne(
                { partId: partRequest.partId, storeId: job.storeId },
                { $inc: { quantity: partRequest.qty, reservedQuantity: -partRequest.qty } }
            );

            partRequest.status = 'cancelled';
        }
    }

    job.status = 'cancelled';
    if (reason) {
        job.notes.push({
            text: `Job cancelled: ${reason}`,
            author: req.user._id
        });
    }
    await job.save();

    const io = req.app.get('io');
    io.emit('job_update', { jobId: job._id });

    res.json({ message: 'Job cancelled, parts returned to inventory', job });
});

// @desc    Update Job (Status, Assignee, Notes)
// @route   PUT /api/jobs/:id
// @access  Private
const updateJob = asyncHandler(async (req, res) => {
    const { status, note, assignedTechId, priority } = req.body;
    const job = await Job.findById(req.params.id);

    if (job) {
        if (status) job.status = status;
        if (assignedTechId) job.assignedTechId = assignedTechId;
        if (priority) job.priority = priority;

        if (note) {
            job.notes.push({
                text: note,
                author: req.user._id
            });
        }
        await job.save();
        res.json(job);
    } else {
        res.status(404);
        throw new Error('Job not found');
    }
});

// @desc    Reverse part usage (return to stock)
// @route   POST /api/jobs/:id/parts/reverse-use
// @access  Private (Tech)
const reverseUsePart = asyncHandler(async (req, res) => {
    const { partUsedId } = req.body; // The _id of the entry in partsUsed array
    const job = await Job.findById(req.params.id);

    if (!job) {
        res.status(404);
        throw new Error('Job not found');
    }

    const partUsedIndex = job.partsUsed.findIndex(p => p._id.toString() === partUsedId);
    if (partUsedIndex === -1) {
        res.status(404);
        throw new Error('Used part entry not found');
    }

    const partEntry = job.partsUsed[partUsedIndex];
    const { partId, qty } = partEntry;

    // 1. Return items to stock
    const inventory = await Inventory.findOne({ partId, storeId: job.storeId });
    if (!inventory) {
        // If inventory record somehow doesn't exist, create it? 
        // Better to just error or handle if it's a valid part.
        res.status(404);
        throw new Error('Part inventory record not found');
    }

    await Inventory.updateOne(
        { _id: inventory._id },
        { $inc: { quantity: qty } }
    );

    // 2. Log transaction
    await Transaction.create({
        partId,
        storeId: job.storeId,
        type: 'job_return',
        qtyChange: qty,
        prevQty: inventory.quantity + inventory.reservedQuantity,
        newQty: inventory.quantity + inventory.reservedQuantity + qty,
        referenceType: 'Job',
        referenceId: job._id,
        performedBy: req.user._id,
        note: `Reversed usage from Job ${job.jobId}`,
        timestamp: Date.now()
    });

    // 3. Remove from job.partsUsed
    job.partsUsed.splice(partUsedIndex, 1);
    
    // 4. Add a note about the reversal
    const part = await Part.findById(partId);
    job.notes.push({
        text: `REVERSED: Removed ${qty}x ${part?.name || 'Component'} from build. Reason: Error in selection.`,
        author: req.user._id
    });

    await job.save();

    const io = req.app.get('io');
    io.emit('stock_update', { partId, storeId: job.storeId });
    io.emit('job_update', { jobId: job._id });

    res.json({ message: 'Part usage reversed', job });
});

module.exports = { 
    createJob, 
    getJobs, 
    getJobById, 
    getCompatibleParts,
    reservePart, 
    usePart, 
    reverseUsePart,
    completeJob,
    cancelJob,
    updateJob 
};
