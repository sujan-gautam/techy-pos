const asyncHandler = require('express-async-handler');
const Supplier = require('../models/Supplier');

// @desc    Get all suppliers
// @route   GET /api/suppliers
// @access  Private
const getSuppliers = asyncHandler(async (req, res) => {
    const storeId = req.user.storeId;
    const suppliers = await Supplier.find({ storeId }).sort({ name: 1 });
    res.json(suppliers);
});

// @desc    Create supplier
// @route   POST /api/suppliers
// @access  Private/Admin
const createSupplier = asyncHandler(async (req, res) => {
    const { name, contactName, phone, email, address, website, notes, categories } = req.body;
    const storeId = req.user.storeId;

    const supplierExists = await Supplier.findOne({ name, storeId });
    if (supplierExists) {
        res.status(400);
        throw new Error('Supplier with this name already exists');
    }

    const supplier = await Supplier.create({
        name, contactName, phone, email, address, website, notes, categories, storeId
    });

    res.status(201).json(supplier);
});

// @desc    Update supplier
// @route   PUT /api/suppliers/:id
// @access  Private/Admin
const updateSupplier = asyncHandler(async (req, res) => {
    const supplier = await Supplier.findById(req.params.id);

    if (supplier) {
        supplier.name = req.body.name || supplier.name;
        supplier.contactName = req.body.contactName || supplier.contactName;
        supplier.phone = req.body.phone || supplier.phone;
        supplier.email = req.body.email || supplier.email;
        supplier.address = req.body.address || supplier.address;
        supplier.website = req.body.website || supplier.website;
        supplier.notes = req.body.notes || supplier.notes;
        supplier.categories = req.body.categories || supplier.categories;

        const updatedSupplier = await supplier.save();
        res.json(updatedSupplier);
    } else {
        res.status(404);
        throw new Error('Supplier not found');
    }
});

// @desc    Delete supplier
// @route   DELETE /api/suppliers/:id
// @access  Private/Admin
const deleteSupplier = asyncHandler(async (req, res) => {
    const supplier = await Supplier.findById(req.params.id);
    if (supplier) {
        await supplier.deleteOne();
        res.json({ message: 'Supplier removed' });
    } else {
        res.status(404);
        throw new Error('Supplier not found');
    }
});

module.exports = { getSuppliers, createSupplier, updateSupplier, deleteSupplier };
