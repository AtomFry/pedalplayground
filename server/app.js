/**
 * Pedal Playground API Server
 * Express.js REST API for pedals and pedalboards data
 */

const express = require('express');
const path = require('path');

// Import middleware
const corsMiddleware = require('./middleware/cors');
const { errorHandler, notFoundHandler } = require('./middleware/error');

// Import database connection
const db = require('./database/connection');

// Import routes
const pedalsRoutes = require('./routes/pedals');
const pedalboardsRoutes = require('./routes/pedalboards');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware setup
app.use(corsMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging (development only)
if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
        console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
        next();
    });
}

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Pedal Playground API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// API routes
app.use('/api/pedals', pedalsRoutes);
app.use('/api/pedalboards', pedalboardsRoutes);

// 404 handler for unknown routes
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

/**
 * Start the server
 */
async function startServer() {
    try {
        // Initialize database connection
        await db.connect();
        
        // Start Express server
        app.listen(PORT, () => {
            console.log('🎸 Pedal Playground API Server');
            console.log('================================');
            console.log(`🚀 Server running on http://localhost:${PORT}`);
            console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
            console.log(`🎛️  Pedals API: http://localhost:${PORT}/api/pedals`);
            console.log(`📋 Pedalboards API: http://localhost:${PORT}/api/pedalboards`);
            console.log('================================');
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    db.close();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down server...');
    db.close();
    process.exit(0);
});

// Start the server
if (require.main === module) {
    startServer();
}

module.exports = app;