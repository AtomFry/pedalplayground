/**
 * Session Configuration Middleware
 * Configures express-session with SQLite storage for user authentication
 */

const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const path = require('path');

// Environment configuration
const isDevelopment = process.env.NODE_ENV !== 'production';
const sessionSecret = process.env.SESSION_SECRET || (isDevelopment ? 'dev-secret-key-change-in-production' : null);

if (!sessionSecret) {
    throw new Error('SESSION_SECRET environment variable is required in production');
}

// Session store configuration
const dbPath = path.join(__dirname, '..', '..', 'database');
const sessionStore = new SQLiteStore({
    db: 'sessions.db',
    dir: dbPath,
    table: 'sessions',
    // Cleanup expired sessions every hour
    cleanupInterval: 60 * 60 * 1000 // 1 hour in milliseconds
});

// Session configuration
const sessionConfig = {
    store: sessionStore,
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    name: 'pedalplayground.sid', // Custom session name
    cookie: {
        secure: !isDevelopment, // HTTPS only in production
        httpOnly: true, // Prevent XSS attacks
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'strict' // CSRF protection
    },
    rolling: true // Reset expiration on activity
};

/**
 * Create configured session middleware
 * @returns {Function} Express session middleware
 */
function createSessionMiddleware() {
    return session(sessionConfig);
}

/**
 * Session helper utilities
 */
const sessionUtils = {
    /**
     * Check if user is authenticated
     * @param {Object} req - Express request object
     * @returns {boolean} - True if user is authenticated
     */
    isAuthenticated(req) {
        return !!(req.session && req.session.userId);
    },

    /**
     * Get current user ID from session
     * @param {Object} req - Express request object
     * @returns {number|null} - User ID or null if not authenticated
     */
    getUserId(req) {
        return req.session?.userId || null;
    },

    /**
     * Set user session after successful login
     * @param {Object} req - Express request object
     * @param {Object} user - User object
     */
    setUserSession(req, user) {
        req.session.userId = user.id;
        req.session.userEmail = user.email;
        req.session.loginTime = new Date().toISOString();
    },

    /**
     * Clear user session (logout)
     * @param {Object} req - Express request object
     * @returns {Promise} - Promise that resolves when session is destroyed
     */
    clearUserSession(req) {
        return new Promise((resolve, reject) => {
            if (req.session) {
                req.session.destroy((err) => {
                    if (err) {
                        console.error('❌ Error destroying session:', err.message);
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    },

    /**
     * Regenerate session ID for security (prevent session fixation)
     * @param {Object} req - Express request object
     * @returns {Promise} - Promise that resolves when session is regenerated
     */
    regenerateSession(req) {
        return new Promise((resolve, reject) => {
            req.session.regenerate((err) => {
                if (err) {
                    console.error('❌ Error regenerating session:', err.message);
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    },

    /**
     * Update session activity timestamp
     * @param {Object} req - Express request object
     */
    touchSession(req) {
        if (req.session) {
            req.session.touch();
        }
    }
};

/**
 * Middleware to add session utilities to request object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
function attachSessionUtils(req, res, next) {
    req.sessionUtils = sessionUtils;
    next();
}

/**
 * Cleanup expired sessions (can be called periodically)
 */
function cleanupExpiredSessions() {
    try {
        sessionStore.clear((err) => {
            if (err) {
                console.error('❌ Error cleaning up expired sessions:', err.message);
            } else {
                console.log('✅ Expired sessions cleaned up');
            }
        });
    } catch (error) {
        console.error('❌ Error during session cleanup:', error.message);
    }
}

// Export configuration and utilities
module.exports = {
    createSessionMiddleware,
    attachSessionUtils,
    sessionUtils,
    cleanupExpiredSessions,
    sessionConfig,
    
    // For testing purposes
    _sessionStore: sessionStore
};