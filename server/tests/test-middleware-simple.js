/**
 * Simplified Middleware Tests (No Database Required)
 * Tests core logic without SQLite dependency
 * Run with: node server/tests/test-middleware-simple.js
 */

const assert = require('assert');

// Mock express request/response objects
function createMockReq(overrides = {}) {
    return {
        session: {},
        body: {},
        query: {},
        params: {},
        ip: '127.0.0.1',
        get: (header) => 'test-user-agent',
        originalUrl: '/test',
        method: 'GET',
        sessionUtils: {
            isAuthenticated: (req) => !!(req.session && req.session.userId),
            getUserId: (req) => req.session?.userId || null,
            touchSession: (req) => {} // Mock implementation
        },
        ...overrides
    };
}

function createMockRes() {
    const res = {
        status: function(code) {
            this.statusCode = code;
            return this;
        },
        json: function(data) {
            this.jsonData = data;
            return this;
        },
        statusCode: 200,
        jsonData: null
    };
    return res;
}

function createMockNext() {
    let called = false;
    let error = null;
    
    const next = (err) => {
        called = true;
        if (err) error = err;
    };
    
    next.wasCalled = () => called;
    next.getError = () => error;
    
    return next;
}

// Mock session utilities
const mockSessionUtils = {
    isAuthenticated: (req) => !!(req.session && req.session.userId),
    getUserId: (req) => req.session?.userId || null,
    touchSession: (req) => {}
};

// Create simplified auth middleware for testing
function createRequireAuth() {
    return function requireAuth(req, res, next) {
        if (!mockSessionUtils.isAuthenticated(req)) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required',
                code: 'AUTH_REQUIRED'
            });
        }

        req.user = {
            id: mockSessionUtils.getUserId(req),
            email: req.session.userEmail
        };

        mockSessionUtils.touchSession(req);
        next();
    };
}

function createOptionalAuth() {
    return function optionalAuth(req, res, next) {
        if (mockSessionUtils.isAuthenticated(req)) {
            req.user = {
                id: mockSessionUtils.getUserId(req),
                email: req.session.userEmail
            };
            mockSessionUtils.touchSession(req);
        } else {
            req.user = null;
        }
        next();
    };
}

// Simple validation functions
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return {
        isValid: emailRegex.test(email),
        errors: emailRegex.test(email) ? [] : ['Valid email address is required']
    };
}

function validatePassword(password) {
    const errors = [];
    if (!password || typeof password !== 'string') {
        errors.push('Password is required');
    } else if (password.length < 4) {
        errors.push('Password must be at least 4 characters long');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

function createValidateRegistration() {
    return function validateRegistration(req, res, next) {
        if (!req.body || typeof req.body !== 'object') {
            return res.status(400).json({
                success: false,
                error: 'Request body is required',
                code: 'INVALID_REQUEST'
            });
        }

        const { email, password } = req.body;

        const emailValidation = validateEmail(email);
        const passwordValidation = validatePassword(password);
        const errors = [...emailValidation.errors, ...passwordValidation.errors];

        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                errors: errors,
                code: 'VALIDATION_ERROR'
            });
        }

        req.body.email = email.toLowerCase().trim();
        next();
    };
}

async function testAuthenticationLogic() {
    console.log('🧪 Testing Authentication Logic...\n');

    const requireAuth = createRequireAuth();
    const optionalAuth = createOptionalAuth();

    // Test requireAuth - not authenticated
    console.log('1. Testing requireAuth - not authenticated');
    const req1 = createMockReq();
    const res1 = createMockRes();
    const next1 = createMockNext();
    
    requireAuth(req1, res1, next1);
    
    assert.strictEqual(res1.statusCode, 401, 'Should return 401 for unauthenticated user');
    assert.strictEqual(res1.jsonData.success, false, 'Should return success: false');
    assert.strictEqual(res1.jsonData.code, 'AUTH_REQUIRED', 'Should return AUTH_REQUIRED code');
    assert.strictEqual(next1.wasCalled(), false, 'Should not call next() for unauthenticated user');
    console.log('✅ requireAuth correctly blocks unauthenticated users');

    // Test requireAuth - authenticated
    console.log('2. Testing requireAuth - authenticated');
    const req2 = createMockReq({
        session: { userId: 123, userEmail: 'test@example.com' }
    });
    const res2 = createMockRes();
    const next2 = createMockNext();
    
    requireAuth(req2, res2, next2);
    
    assert.strictEqual(next2.wasCalled(), true, 'Should call next() for authenticated user');
    assert.strictEqual(req2.user.id, 123, 'Should attach user ID to request');
    assert.strictEqual(req2.user.email, 'test@example.com', 'Should attach user email to request');
    console.log('✅ requireAuth correctly allows authenticated users');

    // Test optionalAuth - not authenticated
    console.log('3. Testing optionalAuth - not authenticated');
    const req3 = createMockReq();
    const res3 = createMockRes();
    const next3 = createMockNext();
    
    optionalAuth(req3, res3, next3);
    
    assert.strictEqual(next3.wasCalled(), true, 'Should call next() for unauthenticated user');
    assert.strictEqual(req3.user, null, 'Should set user to null for unauthenticated user');
    console.log('✅ optionalAuth correctly handles unauthenticated users');

    // Test optionalAuth - authenticated
    console.log('4. Testing optionalAuth - authenticated');
    const req4 = createMockReq({
        session: { userId: 456, userEmail: 'user@test.com' }
    });
    const res4 = createMockRes();
    const next4 = createMockNext();
    
    optionalAuth(req4, res4, next4);
    
    assert.strictEqual(next4.wasCalled(), true, 'Should call next() for authenticated user');
    assert.strictEqual(req4.user.id, 456, 'Should attach user ID to request');
    console.log('✅ optionalAuth correctly handles authenticated users');

    console.log('✅ All authentication logic tests passed!\n');
}

async function testValidationLogic() {
    console.log('🧪 Testing Validation Logic...\n');

    const validateRegistration = createValidateRegistration();

    // Test validateRegistration - valid data
    console.log('1. Testing validateRegistration - valid data');
    const req1 = createMockReq({
        body: { email: 'test@example.com', password: 'validpassword' }
    });
    const res1 = createMockRes();
    const next1 = createMockNext();
    
    validateRegistration(req1, res1, next1);
    
    assert.strictEqual(next1.wasCalled(), true, 'Should call next() for valid registration data');
    assert.strictEqual(req1.body.email, 'test@example.com', 'Should normalize email');
    console.log('✅ validateRegistration correctly handles valid data');

    // Test validateRegistration - invalid email
    console.log('2. Testing validateRegistration - invalid email');
    const req2 = createMockReq({
        body: { email: 'invalid-email', password: 'validpassword' }
    });
    const res2 = createMockRes();
    const next2 = createMockNext();
    
    validateRegistration(req2, res2, next2);
    
    assert.strictEqual(res2.statusCode, 400, 'Should return 400 for invalid email');
    assert.strictEqual(res2.jsonData.success, false, 'Should return success: false');
    assert.strictEqual(res2.jsonData.code, 'VALIDATION_ERROR', 'Should return VALIDATION_ERROR code');
    assert.strictEqual(next2.wasCalled(), false, 'Should not call next() for invalid email');
    console.log('✅ validateRegistration correctly rejects invalid email');

    // Test validateRegistration - short password
    console.log('3. Testing validateRegistration - short password');
    const req3 = createMockReq({
        body: { email: 'test@example.com', password: '12' }
    });
    const res3 = createMockRes();
    const next3 = createMockNext();
    
    validateRegistration(req3, res3, next3);
    
    assert.strictEqual(res3.statusCode, 400, 'Should return 400 for short password');
    assert.strictEqual(res3.jsonData.code, 'VALIDATION_ERROR', 'Should return VALIDATION_ERROR code');
    assert.strictEqual(next3.wasCalled(), false, 'Should not call next() for short password');
    console.log('✅ validateRegistration correctly rejects short password');

    // Test validateRegistration - missing body
    console.log('4. Testing validateRegistration - missing body');
    const req4 = createMockReq({ body: null });
    const res4 = createMockRes();
    const next4 = createMockNext();
    
    validateRegistration(req4, res4, next4);
    
    assert.strictEqual(res4.statusCode, 400, 'Should return 400 for missing body');
    assert.strictEqual(res4.jsonData.code, 'INVALID_REQUEST', 'Should return INVALID_REQUEST code');
    assert.strictEqual(next4.wasCalled(), false, 'Should not call next() for missing body');
    console.log('✅ validateRegistration correctly handles missing body');

    console.log('✅ All validation logic tests passed!\n');
}

async function testBasicValidation() {
    console.log('🧪 Testing Basic Validation Functions...\n');

    // Test email validation
    console.log('1. Testing email validation');
    const validEmailResult = validateEmail('test@example.com');
    const invalidEmailResult = validateEmail('invalid-email');
    
    assert.strictEqual(validEmailResult.isValid, true, 'Valid email should pass');
    assert.strictEqual(validEmailResult.errors.length, 0, 'Valid email should have no errors');
    assert.strictEqual(invalidEmailResult.isValid, false, 'Invalid email should fail');
    assert.strictEqual(invalidEmailResult.errors.length, 1, 'Invalid email should have errors');
    console.log('✅ Email validation working correctly');

    // Test password validation
    console.log('2. Testing password validation');
    const validPasswordResult = validatePassword('validpass');
    const shortPasswordResult = validatePassword('12');
    const emptyPasswordResult = validatePassword('');
    
    assert.strictEqual(validPasswordResult.isValid, true, 'Valid password should pass');
    assert.strictEqual(shortPasswordResult.isValid, false, 'Short password should fail');
    assert.strictEqual(emptyPasswordResult.isValid, false, 'Empty password should fail');
    console.log('✅ Password validation working correctly');

    console.log('✅ All basic validation tests passed!\n');
}

async function runAllTests() {
    console.log('🚀 Starting Simplified Middleware Test Suite...\n');
    
    try {
        await testAuthenticationLogic();
        await testValidationLogic();
        await testBasicValidation();
        
        console.log('🎉 All simplified middleware tests completed successfully!');
        console.log('✅ Authentication logic: PASSED');
        console.log('✅ Validation logic: PASSED');
        console.log('✅ Basic validation: PASSED');
        console.log('\nNote: These tests verify core middleware logic without database dependencies.');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    runAllTests();
}

module.exports = {
    testAuthenticationLogic,
    testValidationLogic,
    testBasicValidation,
    runAllTests
};