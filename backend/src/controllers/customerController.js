const asyncHandler = require('express-async-handler');
const Customer = require('../models/Customer');
const Job = require('../models/Job');

// @desc    Get all customers
// @route   GET /api/customers
// @access  Private
const getCustomers = asyncHandler(async (req, res) => {
    const pageSize = 20;
    const page = Number(req.query.pageNumber) || 1;
    const storeId = req.user.storeId;

    const keyword = req.query.keyword ? {
        $or: [
            { name: { $regex: req.query.keyword, $options: 'i' } },
            { phone: { $regex: req.query.keyword, $options: 'i' } },
            { email: { $regex: req.query.keyword, $options: 'i' } }
        ]
    } : {};

    const count = await Customer.countDocuments({ ...keyword, storeId });
    const customers = await Customer.find({ ...keyword, storeId })
        .sort({ updatedAt: -1 })
        .limit(pageSize)
        .skip(pageSize * (page - 1));

    res.json({ customers, page, pages: Math.ceil(count / pageSize) });
});

// @desc    Get customer by ID with history
// @route   GET /api/customers/:id
// @access  Private
const getCustomerById = asyncHandler(async (req, res) => {
    const customer = await Customer.findById(req.params.id);

    if (customer) {
        // Fetch jobs for this customer
        const jobs = await Job.find({ customerId: customer._id }).sort({ createdAt: -1 });
        res.json({ customer, jobs });
    } else {
        res.status(404);
        throw new Error('Customer not found');
    }
});

// @desc    Create or Update Customer (Internal utility used by Job Controller or separately)
const upsertCustomer = async (customerData, storeId) => {
    const { name, phone, email } = customerData;
    
    let customer = null;
    
    // Try to find by phone if provided
    if (phone) {
        customer = await Customer.findOne({ phone, storeId });
    }
    
    // If not found by phone, try to find by name (for walk-in customers)
    if (!customer && name) {
        customer = await Customer.findOne({ name, storeId, phone: { $exists: false } });
    }
    
    if (customer) {
        customer.name = name || customer.name;
        customer.email = email || customer.email;
        if (phone) customer.phone = phone;
        customer.jobCount += 1;
        await customer.save();
    } else {
        customer = await Customer.create({
            name,
            phone: phone || undefined,
            email,
            storeId,
            jobCount: 1
        });
    }
    return customer;
};

// @desc    Update customer details
// @route   PUT /api/customers/:id
// @access  Private
const updateCustomer = asyncHandler(async (req, res) => {
    const customer = await Customer.findById(req.params.id);

    if (customer) {
        customer.name = req.body.name || customer.name;
        customer.email = req.body.email || customer.email;
        customer.phone = req.body.phone || customer.phone;
        customer.address = req.body.address || customer.address;
        customer.notes = req.body.notes || customer.notes;

        const updatedCustomer = await customer.save();
        res.json(updatedCustomer);
    } else {
        res.status(404);
        throw new Error('Customer not found');
    }
});

module.exports = { getCustomers, getCustomerById, updateCustomer, upsertCustomer };
