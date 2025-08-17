/**
 * Security Utilities
 * Password hashing, validation, and security helper functions
 */

const bcrypt = require('bcrypt');
const validator = require('validator');
const { v4: uuidv4 } = require('uuid');

// Security configuration
const SALT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 4;

/**
 * Hash a password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} - Hashed password
 */
async function hashPassword(password) {
    try {
        const hash = await bcrypt.hash(password, SALT_ROUNDS);
        return hash;
    } catch (error) {
        console.error('❌ Error hashing password:', error.message);
        throw new Error('Password hashing failed');
    }
}

/**
 * Verify a password against its hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password to compare against
 * @returns {Promise<boolean>} - True if password matches
 */
async function verifyPassword(password, hash) {
    try {
        const isValid = await bcrypt.compare(password, hash);
        return isValid;
    } catch (error) {
        console.error('❌ Error verifying password:', error.message);
        return false;
    }
}

/**
 * Validate password strength and requirements
 * @param {string} password - Password to validate
 * @returns {Object} - Validation result with isValid and errors
 */
function validatePassword(password) {
    const errors = [];
    
    if (!password || typeof password !== 'string') {
        errors.push('Password is required');
        return { isValid: false, errors };
    }
    
    if (password.length < MIN_PASSWORD_LENGTH) {
        errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`);
    }
    
    // Additional password strength checks can be added here
    // For now, keeping it simple as per requirements
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Validate email address format
 * @param {string} email - Email to validate
 * @returns {Object} - Validation result with isValid and errors
 */
function validateEmail(email) {
    const errors = [];
    
    if (!email || typeof email !== 'string') {
        errors.push('Email is required');
        return { isValid: false, errors };
    }
    
    if (!validator.isEmail(email)) {
        errors.push('Valid email address is required');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Normalize email address
 * @param {string} email - Email to normalize
 * @returns {string} - Normalized email
 */
function normalizeEmail(email) {
    if (!email || typeof email !== 'string') {
        return '';
    }
    
    return validator.normalizeEmail(email.trim().toLowerCase()) || email.trim().toLowerCase();
}

/**
 * Sanitize user input to prevent XSS
 * @param {string} input - Input to sanitize
 * @returns {string} - Sanitized input
 */
function sanitizeInput(input) {
    if (typeof input !== 'string') {
        return input;
    }
    
    return validator.escape(input.trim());
}

/**
 * Generate a secure random token
 * @param {number} length - Token length (default: 32)
 * @returns {string} - Random token
 */
function generateSecureToken(length = 32) {
    const uuid = uuidv4().replace(/-/g, '');
    if (length <= uuid.length) {
        return uuid.substring(0, length);
    }
    
    // For longer tokens, combine multiple UUIDs
    let token = uuid;
    while (token.length < length) {
        token += uuidv4().replace(/-/g, '');
    }
    
    return token.substring(0, length);
}

/**
 * Generate a password reset token with expiration
 * @returns {Object} - Token and expiration date
 */
function generatePasswordResetToken() {
    const token = generateSecureToken(64);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    
    return {
        token,
        expiresAt
    };
}

/**
 * Hash a token for secure storage in database
 * @param {string} token - Plain text token
 * @returns {Promise<string>} - Hashed token
 */
async function hashToken(token) {
    try {
        const hash = await bcrypt.hash(token, SALT_ROUNDS);
        return hash;
    } catch (error) {
        console.error('❌ Error hashing token:', error.message);
        throw new Error('Token hashing failed');
    }
}

/**
 * Validate user registration data
 * @param {Object} userData - User registration data
 * @returns {Object} - Validation result
 */
function validateUserRegistration(userData) {
    const { email, password } = userData;
    const errors = [];
    
    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
        errors.push(...emailValidation.errors);
    }
    
    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
        errors.push(...passwordValidation.errors);
    }
    
    return {
        isValid: errors.length === 0,
        errors,
        normalizedEmail: emailValidation.isValid ? normalizeEmail(email) : null
    };
}

/**
 * Validate user login data
 * @param {Object} loginData - User login data
 * @returns {Object} - Validation result
 */
function validateUserLogin(loginData) {
    const { email, password } = loginData;
    const errors = [];
    
    if (!email || typeof email !== 'string') {
        errors.push('Email is required');
    }
    
    if (!password || typeof password !== 'string') {
        errors.push('Password is required');
    }
    
    return {
        isValid: errors.length === 0,
        errors,
        normalizedEmail: email ? normalizeEmail(email) : null
    };
}

/**
 * Check if a token has expired
 * @param {Date|string} expiresAt - Expiration date
 * @returns {boolean} - True if token has expired
 */
function isTokenExpired(expiresAt) {
    const expiration = new Date(expiresAt);
    return expiration < new Date();
}

module.exports = {
    hashPassword,
    verifyPassword,
    validatePassword,
    validateEmail,
    normalizeEmail,
    sanitizeInput,
    generateSecureToken,
    generatePasswordResetToken,
    hashToken,
    validateUserRegistration,
    validateUserLogin,
    isTokenExpired,
    
    // Constants
    MIN_PASSWORD_LENGTH,
    SALT_ROUNDS
};