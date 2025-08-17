/**
 * Middleware Test Suite
 * Tests authentication, validation, and rate limiting middleware
 * Run with: node server/tests/test-middleware.js
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

// Import middleware
const auth = require('../middleware/auth');
const validation = require('../middleware/validation');
const security = require('../utils/security');

async function testAuthenticationMiddleware() {
    console.log('🧪 Testing Authentication Middleware...\n');

    // Test requireAuth - not authenticated
    console.log('1. Testing requireAuth - not authenticated');
    const req1 = createMockReq();
    const res1 = createMockRes();
    const next1 = createMockNext();
    
    auth.requireAuth(req1, res1, next1);
    
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
    
    auth.requireAuth(req2, res2, next2);
    
    assert.strictEqual(next2.wasCalled(), true, 'Should call next() for authenticated user');
    assert.strictEqual(req2.user.id, 123, 'Should attach user ID to request');
    assert.strictEqual(req2.user.email, 'test@example.com', 'Should attach user email to request');
    console.log('✅ requireAuth correctly allows authenticated users');

    // Test optionalAuth - not authenticated
    console.log('3. Testing optionalAuth - not authenticated');
    const req3 = createMockReq();
    const res3 = createMockRes();
    const next3 = createMockNext();
    
    auth.optionalAuth(req3, res3, next3);
    
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
    
    auth.optionalAuth(req4, res4, next4);
    
    assert.strictEqual(next4.wasCalled(), true, 'Should call next() for authenticated user');
    assert.strictEqual(req4.user.id, 456, 'Should attach user ID to request');
    console.log('✅ optionalAuth correctly handles authenticated users');

    // Test requireGuest - authenticated
    console.log('5. Testing requireGuest - authenticated');
    const req5 = createMockReq({
        session: { userId: 123 }
    });
    const res5 = createMockRes();
    const next5 = createMockNext();
    
    auth.requireGuest(req5, res5, next5);
    
    assert.strictEqual(res5.statusCode, 400, 'Should return 400 for authenticated user');
    assert.strictEqual(res5.jsonData.code, 'ALREADY_AUTHENTICATED', 'Should return ALREADY_AUTHENTICATED code');
    assert.strictEqual(next5.wasCalled(), false, 'Should not call next() for authenticated user');
    console.log('✅ requireGuest correctly blocks authenticated users');

    console.log('✅ All authentication middleware tests passed!\n');
}

async function testValidationMiddleware() {
    console.log('🧪 Testing Validation Middleware...\n');

    // Test validateRegistration - valid data
    console.log('1. Testing validateRegistration - valid data');
    const req1 = createMockReq({
        body: { email: 'test@example.com', password: 'validpassword' }
    });
    const res1 = createMockRes();
    const next1 = createMockNext();
    
    validation.validateRegistration(req1, res1, next1);
    
    assert.strictEqual(next1.wasCalled(), true, 'Should call next() for valid registration data');
    assert.strictEqual(req1.body.email, 'test@example.com', 'Should normalize email');
    console.log('✅ validateRegistration correctly handles valid data');

    // Test validateRegistration - invalid data
    console.log('2. Testing validateRegistration - invalid data');
    const req2 = createMockReq({
        body: { email: 'invalid-email', password: '12' }
    });
    const res2 = createMockRes();
    const next2 = createMockNext();
    
    validation.validateRegistration(req2, res2, next2);
    
    assert.strictEqual(res2.statusCode, 400, 'Should return 400 for invalid data');
    assert.strictEqual(res2.jsonData.success, false, 'Should return success: false');
    assert.strictEqual(res2.jsonData.code, 'VALIDATION_ERROR', 'Should return VALIDATION_ERROR code');
    assert.strictEqual(next2.wasCalled(), false, 'Should not call next() for invalid data');
    console.log('✅ validateRegistration correctly rejects invalid data');

    // Test validateLogin - valid data
    console.log('3. Testing validateLogin - valid data');
    const req3 = createMockReq({
        body: { email: 'user@example.com', password: 'password123' }
    });
    const res3 = createMockRes();
    const next3 = createMockNext();
    
    validation.validateLogin(req3, res3, next3);
    
    assert.strictEqual(next3.wasCalled(), true, 'Should call next() for valid login data');
    console.log('✅ validateLogin correctly handles valid data');

    // Test validateSavedLayout - valid data
    console.log('4. Testing validateSavedLayout - valid data');
    const req4 = createMockReq({
        body: {
            name: 'Test Layout',
            description: 'A test pedalboard layout',
            layout_data: { pedals: [], board: 'test' }
        }
    });
    const res4 = createMockRes();
    const next4 = createMockNext();
    
    validation.validateSavedLayout(req4, res4, next4);
    
    assert.strictEqual(next4.wasCalled(), true, 'Should call next() for valid layout data');
    assert.strictEqual(typeof req4.body.layout_data, 'string', 'Should convert layout_data to string');
    console.log('✅ validateSavedLayout correctly handles valid data');

    // Test validateFavoriteRequest - valid pedal favorite
    console.log('5. Testing validateFavoriteRequest - valid pedal favorite');
    const req5 = createMockReq({
        body: { pedal_id: 123 }
    });
    const res5 = createMockRes();
    const next5 = createMockNext();
    
    validation.validateFavoriteRequest(req5, res5, next5);
    
    assert.strictEqual(next5.wasCalled(), true, 'Should call next() for valid favorite data');
    assert.strictEqual(req5.body.pedal_id, 123, 'Should parse pedal_id as integer');
    console.log('✅ validateFavoriteRequest correctly handles valid data');

    console.log('✅ All validation middleware tests passed!\n');
}

async function testSecurityIntegration() {
    console.log('🧪 Testing Security Integration...\n');

    // Test password hashing and validation integration
    console.log('1. Testing password validation integration');
    const testPassword = 'testpassword123';
    const hash = await security.hashPassword(testPassword);
    const isValid = await security.verifyPassword(testPassword, hash);
    
    assert.strictEqual(isValid, true, 'Password verification should work');
    console.log('✅ Password hashing and verification integration working');

    // Test email validation
    console.log('2. Testing email validation');
    const validEmail = security.validateEmail('test@example.com');
    const invalidEmail = security.validateEmail('invalid-email');
    
    assert.strictEqual(validEmail.isValid, true, 'Valid email should pass validation');
    assert.strictEqual(invalidEmail.isValid, false, 'Invalid email should fail validation');
    console.log('✅ Email validation working correctly');

    // Test token generation
    console.log('3. Testing token generation');
    const token = security.generateSecureToken(32);
    const resetToken = security.generatePasswordResetToken();
    
    assert.strictEqual(token.length, 32, 'Token should have correct length');
    assert.strictEqual(typeof resetToken.token, 'string', 'Reset token should be string');
    assert.strictEqual(resetToken.expiresAt instanceof Date, true, 'Reset token should have expiration date');
    console.log('✅ Token generation working correctly');

    console.log('✅ All security integration tests passed!\n');
}

async function runAllTests() {
    console.log('🚀 Starting Middleware Test Suite...\n');
    
    try {
        await testAuthenticationMiddleware();
        await testValidationMiddleware();
        await testSecurityIntegration();
        
        console.log('🎉 All middleware tests completed successfully!');
        console.log('✅ Authentication middleware: PASSED');
        console.log('✅ Validation middleware: PASSED');
        console.log('✅ Security integration: PASSED');
        
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
    testAuthenticationMiddleware,
    testValidationMiddleware,
    testSecurityIntegration,
    runAllTests
};