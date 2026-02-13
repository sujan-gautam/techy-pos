const asyncHandler = require('express-async-handler');
const Store = require('../models/Store');

const createStore = asyncHandler(async (req, res) => {
    const { name, address, timezone, franchiseId } = req.body;
    const store = await Store.create({ name, address, timezone, franchiseId });
    res.status(201).json(store);
});

const getStores = asyncHandler(async (req, res) => {
    const stores = await Store.find({});
    res.json(stores);
});

const updateStore = asyncHandler(async (req, res) => {
    const store = await Store.findById(req.params.id);
    if (store) {
        store.name = req.body.name || store.name;
        store.address = req.body.address || store.address;
        store.timezone = req.body.timezone || store.timezone;
        const updatedStore = await store.save();
        res.json(updatedStore);
    } else {
        res.status(404);
        throw new Error('Store not found');
    }
});

const deleteStore = asyncHandler(async (req, res) => {
    const store = await Store.findById(req.params.id);
    if (store) {
        await store.remove();
        res.json({ message: 'Store removed' });
    } else {
        res.status(404);
        throw new Error('Store not found');
    }
});

module.exports = { createStore, getStores, updateStore, deleteStore };
