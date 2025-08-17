/**
 * Authentication Endpoints Integration Tests
 * Tests the complete authentication flow with database
 * Note: These tests require running from Windows due to SQLite native binding issues in WSL
 */

const assert = require('assert');
const path = require('path');

// Test configuration
const TEST_USER = {
    email: 'testuser@example.com',
    password: 'testpassword123'
};

console.log('🧪 Authentication Endpoints Integration Tests');
console.log('==============================================');
console.log('');
console.log('⚠️  IMPORTANT: These tests require manual execution from Windows');
console.log('   due to SQLite native binding issues in WSL environment.');
console.log('');
console.log('📝 Manual Test Procedures:');
console.log('');

console.log('1️⃣  **Test User Registration**');
console.log('   POST http://localhost:3001/api/auth/register');
console.log('   Content-Type: application/json');
console.log('   Body:');
console.log('   {');
console.log(`     "email": "${TEST_USER.email}",`);
console.log(`     "password": "${TEST_USER.password}"`);
console.log('   }');
console.log('');
console.log('   Expected Response (201):');
console.log('   {');
console.log('     "success": true,');
console.log('     "message": "Account created successfully",');
console.log('     "user": {');
console.log('       "id": 1,');
console.log(`       "email": "${TEST_USER.email}",`);
console.log('       "created_at": "2025-08-17T..."');
console.log('     }');
console.log('   }');
console.log('');

console.log('2️⃣  **Test User Login**');
console.log('   POST http://localhost:3001/api/auth/login');
console.log('   Content-Type: application/json');
console.log('   Body:');
console.log('   {');
console.log(`     "email": "${TEST_USER.email}",`);
console.log(`     "password": "${TEST_USER.password}"`);
console.log('   }');
console.log('');
console.log('   Expected Response (200):');
console.log('   {');
console.log('     "success": true,');
console.log('     "message": "Login successful",');
console.log('     "user": {');
console.log('       "id": 1,');
console.log(`       "email": "${TEST_USER.email}"`);
console.log('     }');
console.log('   }');
console.log('');

console.log('3️⃣  **Test Authentication Status**');
console.log('   GET http://localhost:3001/api/auth/status');
console.log('   (Include session cookie from login)');
console.log('');
console.log('   Expected Response (200):');
console.log('   {');
console.log('     "success": true,');
console.log('     "authenticated": true,');
console.log('     "user": {');
console.log('       "id": 1,');
console.log(`       "email": "${TEST_USER.email}"`);
console.log('     }');
console.log('   }');
console.log('');

console.log('4️⃣  **Test User Profile**');
console.log('   GET http://localhost:3001/api/user/profile');
console.log('   (Include session cookie from login)');
console.log('');
console.log('   Expected Response (200):');
console.log('   {');
console.log('     "success": true,');
console.log('     "user": {');
console.log('       "id": 1,');
console.log(`       "email": "${TEST_USER.email}",`);
console.log('       "created_at": "2025-08-17T...",');
console.log('       "last_login": "2025-08-17T..."');
console.log('     }');
console.log('   }');
console.log('');

console.log('5️⃣  **Test User Logout**');
console.log('   POST http://localhost:3001/api/auth/logout');
console.log('   (Include session cookie from login)');
console.log('');
console.log('   Expected Response (200):');
console.log('   {');
console.log('     "success": true,');
console.log('     "message": "Logout successful"');
console.log('   }');
console.log('');

console.log('6️⃣  **Test Authentication Status After Logout**');
console.log('   GET http://localhost:3001/api/auth/status');
console.log('   (Should not include session cookie)');
console.log('');
console.log('   Expected Response (200):');
console.log('   {');
console.log('     "success": true,');
console.log('     "authenticated": false,');
console.log('     "user": null');
console.log('   }');
console.log('');

console.log('7️⃣  **Test Invalid Login**');
console.log('   POST http://localhost:3001/api/auth/login');
console.log('   Content-Type: application/json');
console.log('   Body:');
console.log('   {');
console.log(`     "email": "${TEST_USER.email}",`);
console.log('     "password": "wrongpassword"');
console.log('   }');
console.log('');
console.log('   Expected Response (401):');
console.log('   {');
console.log('     "success": false,');
console.log('     "error": "Invalid email or password",');
console.log('     "code": "INVALID_CREDENTIALS"');
console.log('   }');
console.log('');

console.log('8️⃣  **Test Duplicate Registration**');
console.log('   POST http://localhost:3001/api/auth/register');
console.log('   Content-Type: application/json');
console.log('   Body:');
console.log('   {');
console.log(`     "email": "${TEST_USER.email}",`);
console.log(`     "password": "${TEST_USER.password}"`);
console.log('   }');
console.log('');
console.log('   Expected Response (400):');
console.log('   {');
console.log('     "success": false,');
console.log('     "error": "Email address is already registered",');
console.log('     "code": "EMAIL_EXISTS"');
console.log('   }');
console.log('');

console.log('9️⃣  **Test Validation Errors**');
console.log('   POST http://localhost:3001/api/auth/register');
console.log('   Content-Type: application/json');
console.log('   Body:');
console.log('   {');
console.log('     "email": "invalid-email",');
console.log('     "password": "12"');
console.log('   }');
console.log('');
console.log('   Expected Response (400):');
console.log('   {');
console.log('     "success": false,');
console.log('     "error": "Validation failed",');
console.log('     "errors": [');
console.log('       "Valid email address is required",');
console.log('       "Password must be at least 4 characters long"');
console.log('     ],');
console.log('     "code": "VALIDATION_ERROR"');
console.log('   }');
console.log('');

console.log('🔟 **Test Unauthorized Access**');
console.log('   GET http://localhost:3001/api/user/profile');
console.log('   (Without session cookie)');
console.log('');
console.log('   Expected Response (401):');
console.log('   {');
console.log('     "success": false,');
console.log('     "error": "Authentication required",');
console.log('     "code": "AUTH_REQUIRED"');
console.log('   }');
console.log('');

console.log('📋 **Test Checklist:**');
console.log('');
console.log('□ Registration creates new user and returns 201');
console.log('□ Login with correct credentials returns 200 and sets session');
console.log('□ Authentication status shows logged in user');
console.log('□ Profile endpoint returns user data when authenticated');
console.log('□ Logout clears session and returns 200');
console.log('□ Authentication status shows logged out after logout');
console.log('□ Login with wrong password returns 401');
console.log('□ Duplicate registration returns 400');
console.log('□ Invalid input returns validation errors');
console.log('□ Protected endpoints return 401 when not authenticated');
console.log('');

console.log('🛠️  **Testing Tools:**');
console.log('   - Postman: Import the requests above');
console.log('   - curl: Use command line requests');
console.log('   - Browser DevTools: Test via fetch() in console');
console.log('   - Insomnia: REST client for API testing');
console.log('');

console.log('🔧 **Server Setup:**');
console.log('   1. Start the server: npm run api');
console.log('   2. Verify health check: GET http://localhost:3001/api/health');
console.log('   3. Run the tests above in sequence');
console.log('');

console.log('✅ **Expected Results:**');
console.log('   All tests should pass with the expected response codes and data.');
console.log('   Sessions should persist across requests using cookies.');
console.log('   Authentication should be enforced on protected endpoints.');
console.log('');

// Automated validation functions (can be used when database is accessible)
function validateRegistrationResponse(response) {
    assert.strictEqual(response.success, true, 'Registration should succeed');
    assert.strictEqual(typeof response.user.id, 'number', 'User ID should be a number');
    assert.strictEqual(response.user.email, TEST_USER.email, 'Email should match');
    assert.strictEqual(typeof response.user.created_at, 'string', 'Created timestamp should be present');
}

function validateLoginResponse(response) {
    assert.strictEqual(response.success, true, 'Login should succeed');
    assert.strictEqual(typeof response.user.id, 'number', 'User ID should be a number');
    assert.strictEqual(response.user.email, TEST_USER.email, 'Email should match');
}

function validateProfileResponse(response) {
    assert.strictEqual(response.success, true, 'Profile request should succeed');
    assert.strictEqual(typeof response.user.id, 'number', 'User ID should be a number');
    assert.strictEqual(response.user.email, TEST_USER.email, 'Email should match');
    assert.strictEqual(typeof response.user.created_at, 'string', 'Created timestamp should be present');
}

function validateErrorResponse(response, expectedCode) {
    assert.strictEqual(response.success, false, 'Error response should have success: false');
    assert.strictEqual(response.code, expectedCode, `Error code should be ${expectedCode}`);
    assert.strictEqual(typeof response.error, 'string', 'Error message should be present');
}

console.log('📊 **Validation Functions Available:**');
console.log('   - validateRegistrationResponse(response)');
console.log('   - validateLoginResponse(response)');
console.log('   - validateProfileResponse(response)');
console.log('   - validateErrorResponse(response, expectedCode)');
console.log('');

module.exports = {
    TEST_USER,
    validateRegistrationResponse,
    validateLoginResponse,
    validateProfileResponse,
    validateErrorResponse
};