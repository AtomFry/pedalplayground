/**
 * Authentication Routes
 * Handles user registration, login, logout, and profile management
 */

const express = require('express');
const router = express.Router();

// Import utilities and middleware
const db = require('../database/connection');
const security = require('../utils/security');
const { validateRegistration, validateLogin } = require('../middleware/validation');
const { requireAuth, requireGuest, attachAuthUtils } = require('../middleware/auth');
const { getRateLimiter } = require('../middleware/rateLimiter');

// Attach auth utilities to all auth routes
router.use(attachAuthUtils);

/**
 * POST /api/auth/register
 * Register a new user account
 */
router.post('/register', 
    getRateLimiter('registration'),
    requireGuest,
    validateRegistration,
    async (req, res) => {
        try {
            const { email, password } = req.body;

            // Check if user already exists
            const existingUser = await db.get(
                'SELECT id FROM users WHERE email = ?',
                [email]
            );

            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    error: 'Email address is already registered',
                    code: 'EMAIL_EXISTS'
                });
            }

            // Hash password
            const passwordHash = await security.hashPassword(password);

            // Create new user
            const result = await db.run(
                `INSERT INTO users (email, password_hash, created_at, updated_at)
                 VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                [email, passwordHash]
            );

            const userId = result.lastID;

            // Get the created user (without password hash)
            const newUser = await db.get(
                'SELECT id, email, created_at FROM users WHERE id = ?',
                [userId]
            );

            // Set up user session
            await req.auth.login(newUser);

            console.log(`✅ New user registered: ${email} (ID: ${userId})`);

            res.status(201).json({
                success: true,
                message: 'Account created successfully',
                user: {
                    id: newUser.id,
                    email: newUser.email,
                    created_at: newUser.created_at
                }
            });

        } catch (error) {
            console.error('❌ Registration error:', error.message);
            res.status(500).json({
                success: false,
                error: 'Registration failed. Please try again.',
                code: 'REGISTRATION_ERROR'
            });
        }
    }
);

/**
 * POST /api/auth/login
 * Authenticate user and create session
 */
router.post('/login',
    getRateLimiter('login'),
    requireGuest,
    validateLogin,
    async (req, res) => {
        try {
            const { email, password } = req.body;

            // Find user by email
            const user = await db.get(
                'SELECT id, email, password_hash, is_active FROM users WHERE email = ?',
                [email]
            );

            if (!user) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid email or password',
                    code: 'INVALID_CREDENTIALS'
                });
            }

            // Check if account is active
            if (!user.is_active) {
                return res.status(401).json({
                    success: false,
                    error: 'Account is deactivated',
                    code: 'ACCOUNT_DEACTIVATED'
                });
            }

            // Verify password
            const isValidPassword = await security.verifyPassword(password, user.password_hash);
            if (!isValidPassword) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid email or password',
                    code: 'INVALID_CREDENTIALS'
                });
            }

            // Update last login timestamp
            await db.run(
                'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
                [user.id]
            );

            // Set up user session
            await req.auth.login({
                id: user.id,
                email: user.email
            });

            console.log(`✅ User logged in: ${email} (ID: ${user.id})`);

            res.json({
                success: true,
                message: 'Login successful',
                user: {
                    id: user.id,
                    email: user.email
                }
            });

        } catch (error) {
            console.error('❌ Login error:', error.message);
            res.status(500).json({
                success: false,
                error: 'Login failed. Please try again.',
                code: 'LOGIN_ERROR'
            });
        }
    }
);

/**
 * POST /api/auth/logout
 * Destroy user session
 */
router.post('/logout',
    requireAuth,
    async (req, res) => {
        try {
            const userEmail = req.user.email;

            // Clear session
            await req.auth.logout();

            console.log(`✅ User logged out: ${userEmail}`);

            res.json({
                success: true,
                message: 'Logout successful'
            });

        } catch (error) {
            console.error('❌ Logout error:', error.message);
            res.status(500).json({
                success: false,
                error: 'Logout failed. Please try again.',
                code: 'LOGOUT_ERROR'
            });
        }
    }
);

/**
 * GET /api/user/profile
 * Get current user profile information
 */
router.get('/profile',
    requireAuth,
    async (req, res) => {
        try {
            const userId = req.user.id;

            // Get user profile
            const user = await db.get(
                `SELECT id, email, created_at, last_login 
                 FROM users 
                 WHERE id = ? AND is_active = 1`,
                [userId]
            );

            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found',
                    code: 'USER_NOT_FOUND'
                });
            }

            res.json({
                success: true,
                user: {
                    id: user.id,
                    email: user.email,
                    created_at: user.created_at,
                    last_login: user.last_login
                }
            });

        } catch (error) {
            console.error('❌ Profile error:', error.message);
            res.status(500).json({
                success: false,
                error: 'Failed to get profile. Please try again.',
                code: 'PROFILE_ERROR'
            });
        }
    }
);

/**
 * PUT /api/user/profile
 * Update user profile information
 */
router.put('/profile',
    requireAuth,
    async (req, res) => {
        try {
            const userId = req.user.id;
            const { email } = req.body;

            // Basic validation
            if (!email) {
                return res.status(400).json({
                    success: false,
                    error: 'Email is required',
                    code: 'VALIDATION_ERROR'
                });
            }

            const emailValidation = security.validateEmail(email);
            if (!emailValidation.isValid) {
                return res.status(400).json({
                    success: false,
                    error: 'Valid email address is required',
                    errors: emailValidation.errors,
                    code: 'VALIDATION_ERROR'
                });
            }

            const normalizedEmail = security.normalizeEmail(email);

            // Check if email is already taken by another user
            const existingUser = await db.get(
                'SELECT id FROM users WHERE email = ? AND id != ?',
                [normalizedEmail, userId]
            );

            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    error: 'Email address is already taken',
                    code: 'EMAIL_EXISTS'
                });
            }

            // Update user profile
            await db.run(
                'UPDATE users SET email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [normalizedEmail, userId]
            );

            // Get updated user data
            const updatedUser = await db.get(
                'SELECT id, email, created_at, last_login FROM users WHERE id = ?',
                [userId]
            );

            console.log(`✅ User profile updated: ${normalizedEmail} (ID: ${userId})`);

            res.json({
                success: true,
                message: 'Profile updated successfully',
                user: {
                    id: updatedUser.id,
                    email: updatedUser.email,
                    created_at: updatedUser.created_at,
                    last_login: updatedUser.last_login
                }
            });

        } catch (error) {
            console.error('❌ Profile update error:', error.message);
            res.status(500).json({
                success: false,
                error: 'Failed to update profile. Please try again.',
                code: 'PROFILE_UPDATE_ERROR'
            });
        }
    }
);

/**
 * DELETE /api/user/account
 * Deactivate user account (soft delete)
 */
router.delete('/account',
    requireAuth,
    async (req, res) => {
        try {
            const userId = req.user.id;
            const userEmail = req.user.email;

            // Deactivate account (soft delete)
            await db.run(
                'UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [userId]
            );

            // Clear session
            await req.auth.logout();

            console.log(`✅ User account deactivated: ${userEmail} (ID: ${userId})`);

            res.json({
                success: true,
                message: 'Account deactivated successfully'
            });

        } catch (error) {
            console.error('❌ Account deactivation error:', error.message);
            res.status(500).json({
                success: false,
                error: 'Failed to deactivate account. Please try again.',
                code: 'ACCOUNT_DEACTIVATION_ERROR'
            });
        }
    }
);

/**
 * GET /api/auth/status
 * Check current authentication status
 */
router.get('/status', (req, res) => {
    const isAuthenticated = req.auth.isAuthenticated();
    
    res.json({
        success: true,
        authenticated: isAuthenticated,
        user: isAuthenticated ? {
            id: req.auth.getUserId(),
            email: req.session?.userEmail || null
        } : null
    });
});

module.exports = router;