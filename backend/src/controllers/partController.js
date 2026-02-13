const asyncHandler = require('express-async-handler');
const Part = require('../models/Part');
const Inventory = require('../models/Inventory');
const Store = require('../models/Store');
const mongoose = require('mongoose');

const createPart = asyncHandler(async (req, res) => {
    const { sku, name, brand, category, series, compatible_models, unit, cost_price, retail_price, reorder_threshold, warranty_days, is_serialized } = req.body;
    
    const partExists = await Part.findOne({ sku });
    if (partExists) {
        res.status(400);
        throw new Error('Part with this SKU already exists');
    }

    const part = await Part.create({ sku, name, brand, category, series, compatible_models, unit, cost_price, retail_price, reorder_threshold, warranty_days, is_serialized });

    // Link: Automatically initialize inventory for this part in ALL stores (or just current)
    // To be thorough, let's create for all active stores
    const stores = await Store.find({});
    const inventoryData = stores.map(store => ({
        partId: part._id,
        storeId: store._id,
        quantity: 0,
        reservedQuantity: 0
    }));
    await Inventory.insertMany(inventoryData);

    res.status(201).json(part);
});

const getParts = asyncHandler(async (req, res) => {
    const { keyword, category, brand } = req.query;
    const storeId = req.user.storeId;

    const pipeline = [];

    // 1. Search Filter
    if (keyword) {
        pipeline.push({
            $match: {
                $or: [
                    { name: { $regex: keyword, $options: 'i' } },
                    { sku: { $regex: keyword, $options: 'i' } },
                    { brand: { $regex: keyword, $options: 'i' } },
                    { category: { $regex: keyword, $options: 'i' } },
                    { series: { $regex: keyword, $options: 'i' } }
                ]
            }
        });
    }

    if (category) pipeline.push({ $match: { category } });
    if (brand) pipeline.push({ $match: { brand } });

    // 2. Lookup Inventory for the SPECIFIC STORE of the user
    if (storeId) {
        pipeline.push({
            $lookup: {
                from: 'inventories', 
                let: { part_id: '$_id' },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ['$partId', '$$part_id'] },
                                    { $eq: ['$storeId', new mongoose.Types.ObjectId(storeId)] }
                                ]
                            }
                        }
                    }
                ],
                as: 'inventory'
            }
        });
    } else {
        pipeline.push({
            $lookup: {
                from: 'inventories',
                localField: '_id',
                foreignField: 'partId',
                as: 'inventory'
            }
        });
    }

    // 3. Flatten inventory data
    pipeline.push({
        $addFields: {
            stock: { $arrayElemAt: ['$inventory', 0] }
        }
    });

    pipeline.push({ $sort: { brand: 1, category: 1, name: 1 } });

    const parts = await Part.aggregate(pipeline);
    res.json(parts);
});

const getPartById = asyncHandler(async (req, res) => {
    const part = await Part.findById(req.params.id);
    if (part) {
        res.json(part);
    } else {
        res.status(404);
        throw new Error('Part not found');
    }
});

const updatePart = asyncHandler(async (req, res) => {
    const { sku, name, brand, category, series, compatible_models, unit, cost_price, retail_price, reorder_threshold, warranty_days, is_serialized } = req.body;
    
    const part = await Part.findById(req.params.id);
    if (!part) {
        res.status(404);
        throw new Error('Part not found');
    }

    if (sku && sku !== part.sku) {
        const partExists = await Part.findOne({ sku });
        if (partExists) {
            res.status(400);
            throw new Error('Part with this SKU already exists');
        }
    }

    part.sku = sku || part.sku;
    part.name = name || part.name;
    part.brand = brand || part.brand;
    part.category = category || part.category;
    part.series = series || part.series;
    part.compatible_models = compatible_models || part.compatible_models;
    part.unit = unit || part.unit;
    part.cost_price = cost_price !== undefined ? cost_price : part.cost_price;
    part.retail_price = retail_price !== undefined ? retail_price : part.retail_price;
    part.reorder_threshold = reorder_threshold !== undefined ? reorder_threshold : part.reorder_threshold;
    part.warranty_days = warranty_days !== undefined ? warranty_days : part.warranty_days;
    part.is_serialized = is_serialized !== undefined ? is_serialized : part.is_serialized;

    const updatedPart = await part.save();
    res.json(updatedPart);
});

module.exports = { createPart, getParts, getPartById, updatePart };
