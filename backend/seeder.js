const mongoose = require('mongoose');
const dotenv = require('dotenv');
const colors = require('colors');
const User = require('./src/models/User');
const Store = require('./src/models/Store');
const Part = require('./src/models/Part');
const Inventory = require('./src/models/Inventory');
const connectDB = require('./src/config/db');

dotenv.config();

connectDB();

const importData = async () => {
    try {
        await User.deleteMany();
        await Store.deleteMany();
        await Part.deleteMany();
        await Inventory.deleteMany();

        const store = await Store.create({
            name: 'Techy Repair Main Hub',
            address: '123 Tech St, Silicon Valley',
            timezone: 'America/Los_Angeles'
        });

        await User.create([
            {
                name: 'Admin User',
                email: 'admin@example.com',
                password: 'password123',
                role: 'admin',
                storeId: store._id
            },
            {
                name: 'Technician John',
                email: 'tech@example.com',
                password: 'password123',
                role: 'technician',
                storeId: store._id
            }
        ]);

        const appleModels = [
            'iPhone 6', 'iPhone 6 Plus', 'iPhone 6s', 'iPhone 6s Plus',
            'iPhone 7', 'iPhone 7 Plus', 'iPhone 8', 'iPhone 8 Plus',
            'iPhone SE (2020)', 'iPhone SE (2022)',
            'iPhone X', 'iPhone XR', 'iPhone XS', 'iPhone XS Max',
            'iPhone 11', 'iPhone 11 Pro', 'iPhone 11 Pro Max',
            'iPhone 12 Mini', 'iPhone 12', 'iPhone 12 Pro', 'iPhone 12 Pro Max',
            'iPhone 13 Mini', 'iPhone 13', 'iPhone 13 Pro', 'iPhone 13 Pro Max',
            'iPhone 14', 'iPhone 14 Plus', 'iPhone 14 Pro', 'iPhone 14 Pro Max',
            'iPhone 15', 'iPhone 15 Plus', 'iPhone 15 Pro', 'iPhone 15 Pro Max'
        ];

        const samsungSModels = [
            'Galaxy S10', 'Galaxy S10+', 'Galaxy S10e', 'Galaxy S20', 'Galaxy S20+', 'Galaxy S20 Ultra', 'Galaxy S20 FE',
            'Galaxy S21', 'Galaxy S21+', 'Galaxy S21 Ultra', 'Galaxy S21 FE',
            'Galaxy S22', 'Galaxy S22+', 'Galaxy S22 Ultra',
            'Galaxy S23', 'Galaxy S23+', 'Galaxy S23 Ultra', 'Galaxy S23 FE',
            'Galaxy S24', 'Galaxy S24+', 'Galaxy S24 Ultra'
        ];

        const samsungAModels = [
            'Galaxy A03', 'Galaxy A04', 'Galaxy A05',
            'Galaxy A13', 'Galaxy A14', 'Galaxy A15',
            'Galaxy A23', 'Galaxy A24', 'Galaxy A25',
            'Galaxy A33', 'Galaxy A34', 'Galaxy A35',
            'Galaxy A53', 'Galaxy A54', 'Galaxy A55',
            'Galaxy A73'
        ];

        const partsData = [];
        const seenSkus = new Set();

        const addPart = (part) => {
            if (!seenSkus.has(part.sku)) {
                partsData.push(part);
                seenSkus.add(part.sku);
            } else {
                console.log(`Skipping duplicate SKU: ${part.sku}`.yellow);
            }
        };

        // Generate Apple Parts
        appleModels.forEach(model => {
            addPart({
                sku: `APL-${model.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}-SCR`,
                name: `${model} High-Quality Screen Assembly`,
                brand: 'Apple',
                category: 'Screen',
                series: 'iPhone',
                compatible_models: [model],
                cost_price: 35.00,
                retail_price: 110.00,
                reorder_threshold: 5,
                is_serialized: true
            });
            addPart({
                sku: `APL-${model.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}-BAT`,
                name: `${model} High-Capacity Battery`,
                brand: 'Apple',
                category: 'Battery',
                series: 'iPhone',
                compatible_models: [model],
                cost_price: 12.00,
                retail_price: 49.00,
                reorder_threshold: 8
            });
        });

        // Generate Samsung S Series
        samsungSModels.forEach(model => {
            addPart({
                sku: `SAM-${model.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}-SCR`,
                name: `${model} Super AMOLED Service Pack`,
                brand: 'Samsung',
                category: 'Screen',
                series: 'S Series',
                compatible_models: [model],
                cost_price: 145.00,
                retail_price: 280.00,
                reorder_threshold: 3,
                is_serialized: true
            });
            addPart({
                sku: `SAM-${model.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}-BAT`,
                name: `${model} Genuine Replacement Battery`,
                brand: 'Samsung',
                category: 'Battery',
                series: 'S Series',
                compatible_models: [model],
                cost_price: 22.00,
                retail_price: 65.00,
                reorder_threshold: 5
            });
        });

        // Generate Samsung A Series
        samsungAModels.forEach(model => {
            addPart({
                sku: `SAM-${model.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}-SCR`,
                name: `${model} LCD Display Assembly`,
                brand: 'Samsung',
                category: 'Screen',
                series: 'A Series',
                compatible_models: [model],
                cost_price: 45.00,
                retail_price: 120.00,
                reorder_threshold: 4
            });
            addPart({
                sku: `SAM-${model.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}-BAT`,
                name: `${model} Replacement Battery`,
                brand: 'Samsung',
                category: 'Battery',
                series: 'A Series',
                compatible_models: [model],
                cost_price: 15.00,
                retail_price: 55.00,
                reorder_threshold: 6
            });
        });

        const createdParts = await Part.create(partsData);

        const inventoryData = createdParts.map(part => ({
            partId: part._id,
            storeId: store._id,
            quantity: 0,
            reservedQuantity: 0
        }));

        await Inventory.insertMany(inventoryData);

        console.log(`Successfully seeded ${partsData.length} parts across all models!`.green.inverse);
        process.exit();
    } catch (error) {
        console.error(`${error}`.red.inverse);
        process.exit(1);
    }
};

const destroyData = async () => {
    try {
        await User.deleteMany();
        await Store.deleteMany();
        await Part.deleteMany();
        await Inventory.deleteMany();
        console.log('Data Destroyed!'.red.inverse);
        process.exit();
    } catch (error) {
        console.error(`${error}`.red.inverse);
        process.exit(1);
    }
};

if (process.argv[2] === '-d') {
    destroyData();
} else {
    importData();
}
