const asyncHandler = require('express-async-handler');
const Invoice = require('../models/Invoice');
const Job = require('../models/Job');
const Part = require('../models/Part');
const Store = require('../models/Store');

// @desc    Generate Invoice from Job
// @route   POST /api/jobs/:jobId/invoice
// @access  Private
const generateInvoice = asyncHandler(async (req, res) => {
    const job = await Job.findById(req.params.jobId)
        .populate('partsUsed.partId');

    if (!job) {
        res.status(404);
        throw new Error('Job not found');
    }

    // Check if invoice already exists
    const existingInvoice = await Invoice.findOne({ jobId: job._id });
    if (existingInvoice) {
        // Return existing or update it? Let's return existing for now
        return res.json(existingInvoice);
    }
    
    // Calculate Items
    const items = [];
    let subtotal = 0;

    // 1. Parts
    for (const used of job.partsUsed) {
        const part = used.partId;
        const price = used.priceAtUsage || part?.retail_price || 0;
        const amount = price * used.qty;
        
        if (part) {
            items.push({
                description: part.name,
                qty: used.qty,
                unitPrice: price,
                amount: amount,
                type: 'part'
            });
            subtotal += amount;
        }
    }

    // 2. Labor
    if (job.laborCost > 0) {
        items.push({
            description: 'Repair Service Labor',
            qty: 1,
            unitPrice: job.laborCost,
            amount: job.laborCost,
            type: 'labor'
        });
        subtotal += job.laborCost;
    }

    // 3. Tax (Simple 0% for now or mock 10%)
    const taxRate = 0.10; // Mock 10%
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    // Generate ID
    const count = await Invoice.countDocuments();
    const invoiceId = `INV-${new Date().getFullYear()}-${1000 + count + 1}`;

    const invoice = await Invoice.create({
        invoiceId,
        storeId: job.storeId,
        jobId: job._id,
        customer: {
            name: job.customer.name,
            email: job.customer.email,
            phone: job.customer.phone
        },
        items,
        subtotal,
        tax,
        total,
        status: 'draft',
        issuedBy: req.user._id
    });

    res.status(201).json(invoice);
});

// @desc    Get Invoices
// @route   GET /api/invoices
// @access  Private
const getInvoices = asyncHandler(async (req, res) => {
    const pageSize = 20;
    const page = Number(req.query.pageNumber) || 1;
    const storeId = req.user.storeId;
    
    const count = await Invoice.countDocuments({ storeId });
    const invoices = await Invoice.find({ storeId })
        .populate('jobId', 'jobId device_model')
        .sort({ createdAt: -1 })
        .limit(pageSize)
        .skip(pageSize * (page - 1));

    res.json({ invoices, page, pages: Math.ceil(count / pageSize) });
});

// @desc    Get Invoice By ID
// @route   GET /api/invoices/:id
// @access  Private
const getInvoiceById = asyncHandler(async (req, res) => {
    const invoice = await Invoice.findById(req.params.id)
        .populate('jobId')
        .populate('issuedBy', 'name');

    if (invoice) {
        res.json(invoice);
    } else {
        res.status(404);
        throw new Error('Invoice not found');
    }
});

// @desc    Update Invoice Status (Pay)
// @route   PUT /api/invoices/:id/pay
// @access  Private
const payInvoice = asyncHandler(async (req, res) => {
    const { method } = req.body;
    const invoice = await Invoice.findById(req.params.id);

    if (invoice) {
        invoice.status = 'paid';
        invoice.paymentDetails = {
            method: method || 'cash',
            paidAt: Date.now()
        };
        const updatedInvoice = await invoice.save();
        res.json(updatedInvoice);
    } else {
        res.status(404);
        throw new Error('Invoice not found');
    }
});

module.exports = { generateInvoice, getInvoices, getInvoiceById, payInvoice };
