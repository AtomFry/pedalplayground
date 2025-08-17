/**
 * Authentication Routes
 * Handles user registration, login, logout, and profile management
 */

const express = require('express');
const router = express.Router();

// Import utilities and middleware
const db = require('../database/connection');
const security = require('../utils/security');
const emailService = require('../utils/email');
const { validateRegistration, validateLogin, validatePasswordResetRequest, validatePasswordResetConfirm } = require('../middleware/validation');
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
 * POST /api/auth/reset-password
 * Request a password reset token
 */
router.post('/reset-password',
    getRateLimiter('general'),
    requireGuest,
    validatePasswordResetRequest,
    async (req, res) => {
        try {
            const { email } = req.body;

            // Always return success to prevent email enumeration
            // But only send email if user exists
            const user = await db.get(
                'SELECT id, email FROM users WHERE email = ? AND is_active = 1',
                [email]
            );

            if (user) {
                // Generate secure reset token
                const resetToken = security.generateSecureToken();
                const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

                // Store reset token in database
                await db.run(
                    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, created_at)
                     VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
                    [user.id, await security.hashToken(resetToken), tokenExpiry.toISOString()]
                );

                // Send reset email
                const baseUrl = req.headers.origin || 'http://localhost:3000';
                const emailSent = await emailService.sendPasswordResetEmail(
                    user.email,
                    resetToken,
                    baseUrl
                );

                if (emailSent) {
                    console.log(`✅ Password reset email sent to: ${email}`);
                } else {
                    console.log(`⚠️ Failed to send password reset email to: ${email}`);
                }
            } else {
                console.log(`🔍 Password reset requested for non-existent email: ${email}`);
            }

            // Always return the same response regardless of whether user exists
            res.json({
                success: true,
                message: 'If an account with that email exists, a password reset link has been sent.'
            });

        } catch (error) {
            console.error('❌ Password reset request error:', error.message);
            res.status(500).json({
                success: false,
                error: 'Failed to process password reset request. Please try again.',
                code: 'PASSWORD_RESET_ERROR'
            });
        }
    }
);

/**
 * POST /api/auth/reset-password/confirm
 * Confirm password reset with token and set new password
 */
router.post('/reset-password/confirm',
    getRateLimiter('general'),
    requireGuest,
    validatePasswordResetConfirm,
    async (req, res) => {
        try {
            const { token, password } = req.body;

            // Find and validate reset token
            const resetRecord = await db.get(
                `SELECT prt.user_id, prt.expires_at, u.email, u.is_active
                 FROM password_reset_tokens prt
                 JOIN users u ON prt.user_id = u.id
                 WHERE prt.token_hash = ? AND prt.used_at IS NULL
                 ORDER BY prt.created_at DESC
                 LIMIT 1`,
                [await security.hashToken(token)]
            );

            if (!resetRecord) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid or expired reset token',
                    code: 'INVALID_TOKEN'
                });
            }

            // Check if user account is still active
            if (!resetRecord.is_active) {
                return res.status(400).json({
                    success: false,
                    error: 'Account is deactivated',
                    code: 'ACCOUNT_DEACTIVATED'
                });
            }

            // Check if token has expired
            const tokenExpiry = new Date(resetRecord.expires_at);
            const now = new Date();
            if (now > tokenExpiry) {
                return res.status(400).json({
                    success: false,
                    error: 'Reset token has expired. Please request a new one.',
                    code: 'TOKEN_EXPIRED'
                });
            }

            // Hash the new password
            const passwordHash = await security.hashPassword(password);

            // Begin transaction to update password and mark token as used
            await db.run('BEGIN TRANSACTION');

            try {
                // Update user password
                await db.run(
                    'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                    [passwordHash, resetRecord.user_id]
                );

                // Mark token as used
                await db.run(
                    'UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE user_id = ? AND token_hash = ?',
                    [resetRecord.user_id, await security.hashToken(token)]
                );

                // Clean up expired tokens for this user
                await db.run(
                    'DELETE FROM password_reset_tokens WHERE user_id = ? AND expires_at < CURRENT_TIMESTAMP',
                    [resetRecord.user_id]
                );

                await db.run('COMMIT');

                console.log(`✅ Password reset completed for user: ${resetRecord.email} (ID: ${resetRecord.user_id})`);

                res.json({
                    success: true,
                    message: 'Password reset successful. You can now log in with your new password.'
                });

            } catch (error) {
                await db.run('ROLLBACK');
                throw error;
            }

        } catch (error) {
            console.error('❌ Password reset confirmation error:', error.message);
            res.status(500).json({
                success: false,
                error: 'Failed to reset password. Please try again.',
                code: 'PASSWORD_RESET_CONFIRM_ERROR'
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