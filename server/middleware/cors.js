/**
 * CORS Middleware Configuration
 * Allows frontend to access API from different port during development
 */

const cors = require('cors');

const corsOptions = {
    origin: [
        'http://localhost:3000',     // Browser-sync default
        'http://127.0.0.1:3000',
        'http://localhost:8080',     // Alternative development port
        'http://127.0.0.1:8080'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true
};

module.exports = cors(corsOptions);