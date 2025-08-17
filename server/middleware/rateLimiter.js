/**
 * Rate Limiting Middleware
 * Prevents abuse by limiting request frequency per IP and user
 */

const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for login attempts
 * Stricter limits to prevent brute force attacks
 */
const loginLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // 5 attempts per minute per IP
    skipSuccessfulRequests: true, // Don't count successful requests
    message: {
        success: false,
        error: 'Too many login attempts. Please try again in a minute.',
        code: 'RATE_LIMITED',
        retryAfter: 60
    },
    standardHeaders: true, // Include rate limit info in response headers
    legacyHeaders: false, // Disable X-RateLimit-* headers
    handler: (req, res) => {
        console.warn(`🚫 Rate limit exceeded for login from IP: ${req.ip}`);
        res.status(429).json({
            success: false,
            error: 'Too many login attempts. Please try again in a minute.',
            code: 'RATE_LIMITED',
            retryAfter: 60
        });
    }
});

/**
 * Rate limiter for registration attempts
 * Prevent account creation spam
 */
const registrationLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 3, // 3 registration attempts per minute per IP
    skipSuccessfulRequests: false, // Count all attempts
    message: {
        success: false,
        error: 'Too many registration attempts. Please try again in a minute.',
        code: 'RATE_LIMITED',
        retryAfter: 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        console.warn(`🚫 Rate limit exceeded for registration from IP: ${req.ip}`);
        res.status(429).json({
            success: false,
            error: 'Too many registration attempts. Please try again in a minute.',
            code: 'RATE_LIMITED',
            retryAfter: 60
        });
    }
});

/**
 * Rate limiter for password reset requests
 * Prevent email flooding
 */
const passwordResetLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 2, // 2 password reset requests per minute per IP
    skipSuccessfulRequests: false,
    message: {
        success: false,
        error: 'Too many password reset requests. Please try again in a minute.',
        code: 'RATE_LIMITED',
        retryAfter: 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        console.warn(`🚫 Rate limit exceeded for password reset from IP: ${req.ip}`);
        res.status(429).json({
            success: false,
            error: 'Too many password reset requests. Please try again in a minute.',
            code: 'RATE_LIMITED',
            retryAfter: 60
        });
    }
});

/**
 * General API rate limiter
 * Moderate limits for general API usage
 */
const generalApiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute per IP
    message: {
        success: false,
        error: 'Too many requests. Please slow down.',
        code: 'RATE_LIMITED',
        retryAfter: 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        console.warn(`🚫 Rate limit exceeded for API from IP: ${req.ip}`);
        res.status(429).json({
            success: false,
            error: 'Too many requests. Please slow down.',
            code: 'RATE_LIMITED',
            retryAfter: 60
        });
    }
});

/**
 * Stricter rate limiter for authenticated user actions
 * Higher limits but still prevents abuse
 */
const userActionLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 actions per minute per IP
    message: {
        success: false,
        error: 'Too many actions. Please slow down.',
        code: 'RATE_LIMITED',
        retryAfter: 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        console.warn(`🚫 Rate limit exceeded for user actions from IP: ${req.ip}`);
        res.status(429).json({
            success: false,
            error: 'Too many actions. Please slow down.',
            code: 'RATE_LIMITED',
            retryAfter: 60
        });
    }
});

/**
 * Rate limiter for layout saves
 * Prevent spam saving
 */
const layoutSaveLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 layout saves per minute per IP
    message: {
        success: false,
        error: 'Too many save requests. Please slow down.',
        code: 'RATE_LIMITED',
        retryAfter: 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        console.warn(`🚫 Rate limit exceeded for layout saves from IP: ${req.ip}`);
        res.status(429).json({
            success: false,
            error: 'Too many save requests. Please slow down.',
            code: 'RATE_LIMITED',
            retryAfter: 60
        });
    }
});

/**
 * Custom rate limiter that can be configured per endpoint
 * @param {Object} options - Rate limiting options
 * @returns {Function} Express middleware function
 */
function createCustomLimiter(options = {}) {
    const defaults = {
        windowMs: 60 * 1000, // 1 minute
        max: 50, // 50 requests per minute
        standardHeaders: true,
        legacyHeaders: false,
        message: {
            success: false,
            error: 'Too many requests. Please try again later.',
            code: 'RATE_LIMITED',
            retryAfter: 60
        },
        handler: (req, res) => {
            console.warn(`🚫 Custom rate limit exceeded from IP: ${req.ip}`);
            res.status(429).json(options.message || defaults.message);
        }
    };

    return rateLimit({ ...defaults, ...options });
}

/**
 * Smart rate limiter that adjusts based on authentication status
 * Authenticated users get higher limits
 * @param {Object} authenticatedOptions - Options for authenticated users
 * @param {Object} guestOptions - Options for guest users
 * @returns {Function} Express middleware function
 */
function createSmartLimiter(authenticatedOptions = {}, guestOptions = {}) {
    const authenticatedLimiter = createCustomLimiter({
        max: 200, // Higher limit for authenticated users
        ...authenticatedOptions
    });

    const guestLimiter = createCustomLimiter({
        max: 50, // Lower limit for guests
        ...guestOptions
    });

    return (req, res, next) => {
        // Check if user is authenticated
        const isAuthenticated = req.session && req.session.userId;
        
        if (isAuthenticated) {
            authenticatedLimiter(req, res, next);
        } else {
            guestLimiter(req, res, next);
        }
    };
}

/**
 * Rate limiter for development/testing
 * Much higher limits for development
 */
const developmentLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 1000, // 1000 requests per minute in development
    message: {
        success: false,
        error: 'Development rate limit exceeded',
        code: 'RATE_LIMITED'
    },
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * Get appropriate rate limiter based on environment
 * @param {string} type - Type of rate limiter
 * @returns {Function} Express middleware function
 */
function getRateLimiter(type = 'general') {
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    if (isDevelopment) {
        return developmentLimiter;
    }

    switch (type) {
        case 'login':
            return loginLimiter;
        case 'registration':
            return registrationLimiter;
        case 'password-reset':
            return passwordResetLimiter;
        case 'user-action':
            return userActionLimiter;
        case 'layout-save':
            return layoutSaveLimiter;
        case 'smart':
            return createSmartLimiter();
        case 'general':
        default:
            return generalApiLimiter;
    }
}

/**
 * Middleware to log rate limit violations for monitoring
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
function logRateLimitViolations(req, res, next) {
    const originalJson = res.json;
    
    res.json = function(data) {
        if (data && data.code === 'RATE_LIMITED') {
            console.warn(`🚫 Rate limit violation:`, {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                url: req.originalUrl,
                method: req.method,
                timestamp: new Date().toISOString()
            });
        }
        return originalJson.call(this, data);
    };
    
    next();
}

module.exports = {
    loginLimiter,
    registrationLimiter,
    passwordResetLimiter,
    generalApiLimiter,
    userActionLimiter,
    layoutSaveLimiter,
    createCustomLimiter,
    createSmartLimiter,
    getRateLimiter,
    logRateLimitViolations
};