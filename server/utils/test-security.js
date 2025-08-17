/**
 * Quick test script for security utilities
 * Run with: node server/utils/test-security.js
 */

const security = require('./security');

async function testSecurityUtils() {
    console.log('🧪 Testing Security Utilities...\n');
    
    try {
        // Test password hashing and verification
        console.log('1. Testing password hashing...');
        const password = 'testpassword123';
        const hash = await security.hashPassword(password);
        console.log('✅ Password hashed successfully');
        
        const isValid = await security.verifyPassword(password, hash);
        console.log(`✅ Password verification: ${isValid ? 'PASSED' : 'FAILED'}`);
        
        const isInvalid = await security.verifyPassword('wrongpassword', hash);
        console.log(`✅ Wrong password rejection: ${!isInvalid ? 'PASSED' : 'FAILED'}\n`);
        
        // Test email validation
        console.log('2. Testing email validation...');
        const validEmail = security.validateEmail('user@example.com');
        console.log(`✅ Valid email: ${validEmail.isValid ? 'PASSED' : 'FAILED'}`);
        
        const invalidEmail = security.validateEmail('invalid-email');
        console.log(`✅ Invalid email rejection: ${!invalidEmail.isValid ? 'PASSED' : 'FAILED'}\n`);
        
        // Test password validation
        console.log('3. Testing password validation...');
        const validPassword = security.validatePassword('validpass');
        console.log(`✅ Valid password: ${validPassword.isValid ? 'PASSED' : 'FAILED'}`);
        
        const shortPassword = security.validatePassword('123');
        console.log(`✅ Short password rejection: ${!shortPassword.isValid ? 'PASSED' : 'FAILED'}\n`);
        
        // Test token generation
        console.log('4. Testing token generation...');
        const token = security.generateSecureToken();
        console.log(`✅ Token generated: ${token.length === 32 ? 'PASSED' : 'FAILED'} (length: ${token.length})`);
        
        const resetToken = security.generatePasswordResetToken();
        console.log(`✅ Reset token generated: ${resetToken.token && resetToken.expiresAt ? 'PASSED' : 'FAILED'}\n`);
        
        // Test user registration validation
        console.log('5. Testing user registration validation...');
        const validUser = security.validateUserRegistration({
            email: 'test@example.com',
            password: 'validpassword'
        });
        console.log(`✅ Valid registration: ${validUser.isValid ? 'PASSED' : 'FAILED'}`);
        
        const invalidUser = security.validateUserRegistration({
            email: 'invalid-email',
            password: '12'
        });
        console.log(`✅ Invalid registration rejection: ${!invalidUser.isValid ? 'PASSED' : 'FAILED'}`);
        console.log(`   Errors: ${invalidUser.errors.join(', ')}\n`);
        
        console.log('🎉 All security utility tests completed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    testSecurityUtils();
}

module.exports = testSecurityUtils;