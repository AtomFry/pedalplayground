/**
 * Authentication Middleware
 * Handles user authentication, authorization, and session management
 */

const { sessionUtils } = require('./session');

/**
 * Middleware to require authentication
 * Blocks access if user is not logged in
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
function requireAuth(req, res, next) {
    if (!sessionUtils.isAuthenticated(req)) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required',
            code: 'AUTH_REQUIRED'
        });
    }

    // Attach user info to request for convenience
    req.user = {
        id: sessionUtils.getUserId(req),
        email: req.session.userEmail
    };

    // Touch session to extend expiration
    sessionUtils.touchSession(req);

    next();
}

/**
 * Middleware for optional authentication
 * Attaches user info if logged in, but doesn't block access if not
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
function optionalAuth(req, res, next) {
    if (sessionUtils.isAuthenticated(req)) {
        // Attach user info to request
        req.user = {
            id: sessionUtils.getUserId(req),
            email: req.session.userEmail
        };

        // Touch session to extend expiration
        sessionUtils.touchSession(req);
    } else {
        // No user logged in
        req.user = null;
    }

    next();
}

/**
 * Middleware to check if user is already authenticated
 * Used for login/register endpoints to prevent double-login
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
function requireGuest(req, res, next) {
    if (sessionUtils.isAuthenticated(req)) {
        return res.status(400).json({
            success: false,
            error: 'Already authenticated',
            code: 'ALREADY_AUTHENTICATED'
        });
    }

    next();
}

/**
 * Middleware to attach authentication utilities to request
 * Provides auth helper functions on req.auth
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
function attachAuthUtils(req, res, next) {
    req.auth = {
        /**
         * Check if current user is authenticated
         */
        isAuthenticated() {
            return sessionUtils.isAuthenticated(req);
        },

        /**
         * Get current user ID
         */
        getUserId() {
            return sessionUtils.getUserId(req);
        },

        /**
         * Set user session after login
         */
        async login(user) {
            // Regenerate session ID to prevent session fixation
            await sessionUtils.regenerateSession(req);
            sessionUtils.setUserSession(req, user);
        },

        /**
         * Clear user session (logout)
         */
        async logout() {
            await sessionUtils.clearUserSession(req);
        },

        /**
         * Check if user owns a resource
         */
        ownsResource(resourceUserId) {
            const currentUserId = sessionUtils.getUserId(req);
            return currentUserId === resourceUserId;
        }
    };

    next();
}

/**
 * Middleware to ensure user owns a resource
 * Use after requireAuth for endpoints that modify user-specific data
 * @param {string} userIdParam - Request parameter name containing user ID
 * @returns {Function} Express middleware function
 */
function requireOwnership(userIdParam = 'userId') {
    return (req, res, next) => {
        const currentUserId = sessionUtils.getUserId(req);
        const resourceUserId = parseInt(req.params[userIdParam]);

        if (!currentUserId) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required',
                code: 'AUTH_REQUIRED'
            });
        }

        if (currentUserId !== resourceUserId) {
            return res.status(403).json({
                success: false,
                error: 'Access denied',
                code: 'FORBIDDEN'
            });
        }

        next();
    };
}

/**
 * Error handler for authentication errors
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
function handleAuthError(err, req, res, next) {
    console.error('❌ Authentication error:', err.message);

    // Session store errors
    if (err.code === 'SQLITE_CANTOPEN' || err.code === 'SQLITE_BUSY') {
        return res.status(503).json({
            success: false,
            error: 'Service temporarily unavailable',
            code: 'SERVICE_UNAVAILABLE'
        });
    }

    // Session-related errors
    if (err.name === 'SessionError' || err.message.includes('session')) {
        return res.status(401).json({
            success: false,
            error: 'Session expired or invalid',
            code: 'SESSION_INVALID'
        });
    }

    // Generic authentication error
    return res.status(500).json({
        success: false,
        error: 'Authentication system error',
        code: 'AUTH_ERROR'
    });
}

/**
 * Utility to check authentication status for API responses
 * @param {Object} req - Express request object
 * @returns {Object} - Authentication status object
 */
function getAuthStatus(req) {
    return {
        isAuthenticated: sessionUtils.isAuthenticated(req),
        userId: sessionUtils.getUserId(req),
        userEmail: req.session?.userEmail || null
    };
}

module.exports = {
    requireAuth,
    optionalAuth,
    requireGuest,
    attachAuthUtils,
    requireOwnership,
    handleAuthError,
    getAuthStatus
};