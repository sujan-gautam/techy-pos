const express = require('express');
const dotenv = require('dotenv');
const colors = require('colors'); // Optional console colors
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const connectDB = require('./src/config/db');
const { notFound, errorHandler } = require('./src/middleware/errorMiddleware');

// Routes
const authRoutes = require('./src/routes/authRoutes');
const storeRoutes = require('./src/routes/storeRoutes');
const inventoryRoutes = require('./src/routes/inventoryRoutes');
const partRoutes = require('./src/routes/partRoutes');
const jobRoutes = require('./src/routes/jobRoutes');
const transactionRoutes = require('./src/routes/transactionRoutes');
const purchaseOrderRoutes = require('./src/routes/purchaseOrderRoutes');
const userRoutes = require('./src/routes/userRoutes');
const reportRoutes = require('./src/routes/reportRoutes');
const invoiceRoutes = require('./src/routes/invoiceRoutes');
const customerRoutes = require('./src/routes/customerRoutes');
const supplierRoutes = require('./src/routes/supplierRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');

dotenv.config();

connectDB();

const app = express();
const server = http.createServer(app);

// Socket.io
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for dev, restrict in prod
        methods: ["GET", "POST"]
    }
});

app.use(express.json());
app.use(cors());
app.use(helmet());

if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Basic Route
app.get('/', (req, res) => {
    res.send('API is running...');
});

app.use('/api/auth', authRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/parts', partRoutes);
app.use('/api/inventory', inventoryRoutes); 
app.use('/api/jobs', jobRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/pos', purchaseOrderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/notifications', notificationRoutes);

// Error Handling
app.use(notFound);
app.use(errorHandler);

// Socket Connection
io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on('disconnect', () => {
        console.log('Socket disconnected');
    });
});

// Make io accessible in routes
app.set('io', io);

const PORT = process.env.PORT || 5000;

// Only listen if not in Vercel environment
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
    server.listen(PORT, () => {
        console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });
}

// Export app for Vercel
module.exports = app;
