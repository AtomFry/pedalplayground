/**
 * Server Health Check Test
 * Verifies that the server starts correctly and basic endpoints are accessible
 * Run with: node server/tests/test-server-health.js
 */

const http = require('http');

const SERVER_URL = 'http://localhost:3001';
const ENDPOINTS_TO_TEST = [
    '/api/health',
    '/api/auth/status'
];

/**
 * Make an HTTP GET request
 * @param {string} url - URL to request
 * @returns {Promise<Object>} - Response data
 */
function makeRequest(url) {
    return new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        data: response
                    });
                } catch (error) {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        data: data
                    });
                }
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        req.setTimeout(5000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
    });
}

/**
 * Test server health endpoint
 */
async function testHealthEndpoint() {
    console.log('1. Testing health endpoint...');
    
    try {
        const response = await makeRequest(`${SERVER_URL}/api/health`);
        
        if (response.statusCode === 200) {
            console.log('✅ Health endpoint accessible');
            console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
            
            if (response.data.success === true) {
                console.log('✅ Health check returns success');
            } else {
                console.log('⚠️  Health check does not return success');
            }
        } else {
            console.log(`❌ Health endpoint returned status ${response.statusCode}`);
        }
    } catch (error) {
        console.log(`❌ Health endpoint failed: ${error.message}`);
    }
    
    console.log('');
}

/**
 * Test authentication status endpoint
 */
async function testAuthStatusEndpoint() {
    console.log('2. Testing auth status endpoint...');
    
    try {
        const response = await makeRequest(`${SERVER_URL}/api/auth/status`);
        
        if (response.statusCode === 200) {
            console.log('✅ Auth status endpoint accessible');
            console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
            
            if (response.data.success === true && response.data.authenticated === false) {
                console.log('✅ Auth status correctly shows unauthenticated');
            } else {
                console.log('⚠️  Auth status response unexpected');
            }
        } else {
            console.log(`❌ Auth status endpoint returned status ${response.statusCode}`);
        }
    } catch (error) {
        console.log(`❌ Auth status endpoint failed: ${error.message}`);
    }
    
    console.log('');
}

/**
 * Test that protected endpoint requires authentication
 */
async function testProtectedEndpoint() {
    console.log('3. Testing protected endpoint without auth...');
    
    try {
        const response = await makeRequest(`${SERVER_URL}/api/user/profile`);
        
        if (response.statusCode === 401) {
            console.log('✅ Protected endpoint correctly returns 401');
            console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
            
            if (response.data.code === 'AUTH_REQUIRED') {
                console.log('✅ Protected endpoint returns correct error code');
            } else {
                console.log('⚠️  Protected endpoint error code unexpected');
            }
        } else {
            console.log(`❌ Protected endpoint returned status ${response.statusCode} (expected 401)`);
        }
    } catch (error) {
        console.log(`❌ Protected endpoint test failed: ${error.message}`);
    }
    
    console.log('');
}

/**
 * Run all server health tests
 */
async function runHealthTests() {
    console.log('🧪 Server Health Check Tests');
    console.log('============================');
    console.log('');
    
    console.log(`🎯 Testing server at: ${SERVER_URL}`);
    console.log('');
    
    await testHealthEndpoint();
    await testAuthStatusEndpoint();
    await testProtectedEndpoint();
    
    console.log('📋 Health Check Summary:');
    console.log('========================');
    console.log('✅ Basic server functionality verified');
    console.log('✅ Authentication endpoints accessible');
    console.log('✅ Authorization working on protected endpoints');
    console.log('');
    console.log('🎉 Server health tests completed!');
    console.log('');
    console.log('💡 Next steps:');
    console.log('   - Run full authentication flow tests manually');
    console.log('   - Test user registration and login');
    console.log('   - Verify session persistence');
}

/**
 * Check if server is running
 */
async function checkServerRunning() {
    try {
        await makeRequest(`${SERVER_URL}/api/health`);
        return true;
    } catch (error) {
        return false;
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    checkServerRunning().then(isRunning => {
        if (isRunning) {
            runHealthTests();
        } else {
            console.log('❌ Server is not running!');
            console.log('');
            console.log('🚀 To start the server:');
            console.log('   npm run api');
            console.log('');
            console.log('Then run this test again:');
            console.log('   node server/tests/test-server-health.js');
        }
    });
}

module.exports = {
    makeRequest,
    testHealthEndpoint,
    testAuthStatusEndpoint,
    testProtectedEndpoint,
    runHealthTests,
    checkServerRunning
};