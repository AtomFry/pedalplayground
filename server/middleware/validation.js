/**
 * Input Validation Middleware
 * Validates and sanitizes user input to prevent security vulnerabilities
 */

const security = require('../utils/security');

/**
 * Validate user registration data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
function validateRegistration(req, res, next) {
    const { email, password } = req.body;

    // Basic existence check
    if (!req.body || typeof req.body !== 'object') {
        return res.status(400).json({
            success: false,
            error: 'Request body is required',
            code: 'INVALID_REQUEST'
        });
    }

    // Validate using security utilities
    const validation = security.validateUserRegistration({ email, password });

    if (!validation.isValid) {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            errors: validation.errors,
            code: 'VALIDATION_ERROR'
        });
    }

    // Sanitize and normalize input
    req.body.email = validation.normalizedEmail;
    req.body.password = security.sanitizeInput(password);

    next();
}

/**
 * Validate user login data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
function validateLogin(req, res, next) {
    const { email, password } = req.body;

    // Basic existence check
    if (!req.body || typeof req.body !== 'object') {
        return res.status(400).json({
            success: false,
            error: 'Request body is required',
            code: 'INVALID_REQUEST'
        });
    }

    // Validate using security utilities
    const validation = security.validateUserLogin({ email, password });

    if (!validation.isValid) {
        return res.status(400).json({
            success: false,
            error: 'Invalid login credentials format',
            errors: validation.errors,
            code: 'VALIDATION_ERROR'
        });
    }

    // Sanitize and normalize input
    req.body.email = validation.normalizedEmail;
    req.body.password = security.sanitizeInput(password);

    next();
}

/**
 * Validate password reset request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
function validatePasswordResetRequest(req, res, next) {
    const { email } = req.body;

    if (!req.body || typeof req.body !== 'object') {
        return res.status(400).json({
            success: false,
            error: 'Request body is required',
            code: 'INVALID_REQUEST'
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

    req.body.email = security.normalizeEmail(email);
    next();
}

/**
 * Validate password reset confirmation
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
function validatePasswordResetConfirm(req, res, next) {
    const { token, password } = req.body;

    if (!req.body || typeof req.body !== 'object') {
        return res.status(400).json({
            success: false,
            error: 'Request body is required',
            code: 'INVALID_REQUEST'
        });
    }

    const errors = [];

    // Validate token
    if (!token || typeof token !== 'string' || token.trim().length === 0) {
        errors.push('Reset token is required');
    }

    // Validate password
    const passwordValidation = security.validatePassword(password);
    if (!passwordValidation.isValid) {
        errors.push(...passwordValidation.errors);
    }

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            errors,
            code: 'VALIDATION_ERROR'
        });
    }

    req.body.token = security.sanitizeInput(token.trim());
    req.body.password = security.sanitizeInput(password);

    next();
}

/**
 * Validate saved layout data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
function validateSavedLayout(req, res, next) {
    const { name, description, layout_data } = req.body;

    if (!req.body || typeof req.body !== 'object') {
        return res.status(400).json({
            success: false,
            error: 'Request body is required',
            code: 'INVALID_REQUEST'
        });
    }

    const errors = [];

    // Validate name (required)
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        errors.push('Layout name is required');
    } else if (name.trim().length > 100) {
        errors.push('Layout name must be 100 characters or less');
    }

    // Validate description (optional)
    if (description !== undefined && description !== null) {
        if (typeof description !== 'string') {
            errors.push('Description must be a string');
        } else if (description.length > 500) {
            errors.push('Description must be 500 characters or less');
        }
    }

    // Validate layout_data (required JSON)
    if (!layout_data) {
        errors.push('Layout data is required');
    } else {
        try {
            // Ensure it's valid JSON if it's a string
            if (typeof layout_data === 'string') {
                JSON.parse(layout_data);
            } else if (typeof layout_data === 'object') {
                JSON.stringify(layout_data);
            } else {
                errors.push('Layout data must be valid JSON');
            }
        } catch (err) {
            errors.push('Layout data must be valid JSON');
        }
    }

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            errors,
            code: 'VALIDATION_ERROR'
        });
    }

    // Sanitize inputs
    req.body.name = security.sanitizeInput(name.trim());
    req.body.description = description ? security.sanitizeInput(description.trim()) : null;
    
    // Ensure layout_data is stored as string
    if (typeof layout_data === 'object') {
        req.body.layout_data = JSON.stringify(layout_data);
    } else {
        req.body.layout_data = layout_data;
    }

    next();
}

/**
 * Validate favorites data (pedal or pedalboard ID)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
function validateFavoriteRequest(req, res, next) {
    const { pedal_id, pedalboard_id } = req.body;

    if (!req.body || typeof req.body !== 'object') {
        return res.status(400).json({
            success: false,
            error: 'Request body is required',
            code: 'INVALID_REQUEST'
        });
    }

    const errors = [];

    // Either pedal_id or pedalboard_id should be provided, but not both
    if (pedal_id && pedalboard_id) {
        errors.push('Provide either pedal_id or pedalboard_id, not both');
    } else if (!pedal_id && !pedalboard_id) {
        errors.push('Either pedal_id or pedalboard_id is required');
    }

    // Validate pedal_id if provided
    if (pedal_id !== undefined) {
        const pedalId = parseInt(pedal_id);
        if (isNaN(pedalId) || pedalId <= 0) {
            errors.push('pedal_id must be a positive integer');
        } else {
            req.body.pedal_id = pedalId;
        }
    }

    // Validate pedalboard_id if provided
    if (pedalboard_id !== undefined) {
        const boardId = parseInt(pedalboard_id);
        if (isNaN(boardId) || boardId <= 0) {
            errors.push('pedalboard_id must be a positive integer');
        } else {
            req.body.pedalboard_id = boardId;
        }
    }

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            errors,
            code: 'VALIDATION_ERROR'
        });
    }

    next();
}

/**
 * Generic sanitization middleware for all requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
function sanitizeRequest(req, res, next) {
    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
        for (const key in req.query) {
            if (typeof req.query[key] === 'string') {
                req.query[key] = security.sanitizeInput(req.query[key]);
            }
        }
    }

    // Sanitize URL parameters
    if (req.params && typeof req.params === 'object') {
        for (const key in req.params) {
            if (typeof req.params[key] === 'string') {
                req.params[key] = security.sanitizeInput(req.params[key]);
            }
        }
    }

    next();
}

/**
 * Validate integer ID parameter
 * @param {string} paramName - Name of the parameter to validate
 * @returns {Function} Express middleware function
 */
function validateIdParam(paramName = 'id') {
    return (req, res, next) => {
        const idValue = req.params[paramName];
        
        if (!idValue) {
            return res.status(400).json({
                success: false,
                error: `${paramName} parameter is required`,
                code: 'MISSING_PARAMETER'
            });
        }

        const id = parseInt(idValue);
        if (isNaN(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                error: `${paramName} must be a positive integer`,
                code: 'INVALID_PARAMETER'
            });
        }

        req.params[paramName] = id;
        next();
    };
}

module.exports = {
    validateRegistration,
    validateLogin,
    validatePasswordResetRequest,
    validatePasswordResetConfirm,
    validateSavedLayout,
    validateFavoriteRequest,
    sanitizeRequest,
    validateIdParam
};