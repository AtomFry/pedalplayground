/**
 * Error Handling Middleware
 * Provides consistent error responses across all API endpoints
 */

/**
 * Global error handler
 */
function errorHandler(err, req, res, next) {
    console.error('🚨 API Error:', err);

    // Default error response
    let status = 500;
    let message = 'Internal server error';
    let details = null;

    // Handle specific error types
    if (err.code === 'SQLITE_ERROR') {
        status = 500;
        message = 'Database error';
        details = process.env.NODE_ENV === 'development' ? err.message : null;
    } else if (err.name === 'ValidationError') {
        status = 400;
        message = 'Invalid request parameters';
        details = err.message;
    } else if (err.status) {
        status = err.status;
        message = err.message;
    }

    res.status(status).json({
        success: false,
        error: {
            message,
            status,
            ...(details && { details }),
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        }
    });
}

/**
 * 404 handler for unknown routes
 */
function notFoundHandler(req, res) {
    res.status(404).json({
        success: false,
        error: {
            message: 'Endpoint not found',
            status: 404,
            path: req.originalUrl,
            method: req.method
        }
    });
}

/**
 * Async wrapper to catch async errors
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

/**
 * Create validation error
 */
function createValidationError(message) {
    const error = new Error(message);
    error.name = 'ValidationError';
    return error;
}

module.exports = {
    errorHandler,
    notFoundHandler,
    asyncHandler,
    createValidationError
};