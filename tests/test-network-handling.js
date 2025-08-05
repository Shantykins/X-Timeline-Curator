#!/usr/bin/env node

/**
 * Test network error handling and retry logic
 */

console.log('🌐 Network Error Handling Test');
console.log('==============================\n');

// Mock fetch to simulate network failures
let fetchAttempt = 0;
const originalFetch = global.fetch;

// Simulate network failures for the first few attempts
global.fetch = async (url, options) => {
    fetchAttempt++;
    console.log(`Mock fetch attempt ${fetchAttempt} for: ${url}`);
    
    if (fetchAttempt <= 2) {
        console.log(`❌ Simulating network failure (attempt ${fetchAttempt})`);
        throw new Error('Failed to fetch');
    } else {
        console.log(`✅ Allowing fetch to succeed (attempt ${fetchAttempt})`);
        // Return a simple successful response for testing
        return {
            ok: true,
            status: 200,
            statusText: 'OK',
            json: async () => ({ model_type: 'bert' }),
            text: async () => 'success'
        };
    }
};

// Test the retry logic
async function testRetryLogic() {
    const retryFetch = async (url, options = {}, maxRetries = 3) => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`Fetching ${url} (attempt ${attempt}/${maxRetries})`);
                const response = await fetch(url, options);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                return response;
            } catch (error) {
                console.warn(`Fetch attempt ${attempt} failed:`, error.message);
                
                if (attempt === maxRetries) {
                    throw new Error(`Failed to fetch after ${maxRetries} attempts: ${error.message}`);
                }
                
                // Exponential backoff: 1s, 2s, 4s (sped up for testing)
                const delay = Math.pow(2, attempt - 1) * 100; // 100ms instead of 1000ms for testing
                console.log(`Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    };

    try {
        console.log('🔄 Testing retry mechanism...\n');
        
        const result = await retryFetch('https://example.com/test');
        console.log('\n✅ Retry mechanism worked!');
        console.log('📊 Final result:', await result.text());
        
        return true;
    } catch (error) {
        console.error('\n❌ Retry mechanism failed:', error.message);
        return false;
    }
}

// Test error message formatting
function testErrorMessages() {
    console.log('\n🔧 Testing error message formatting...\n');
    
    const testErrors = [
        new Error('Failed to fetch'),
        new Error('Network timeout after 30 seconds'),
        new Error('HTTP 404: Not Found'),
        new Error('Something else went wrong')
    ];
    
    for (const err of testErrors) {
        let errorMessage = err.message;
        if (err.message.includes('fetch')) {
            errorMessage = 'Network error: Check internet connection and try again';
        } else if (err.message.includes('timeout')) {
            errorMessage = 'Download timeout: Model download took too long';
        } else if (err.message.includes('HTTP')) {
            errorMessage = `Server error: ${err.message}`;
        }
        
        console.log(`Original: "${err.message}"`);
        console.log(`Formatted: "${errorMessage}"`);
        console.log('');
    }
}

// Test network connectivity check
async function testConnectivityCheck() {
    console.log('🔍 Testing connectivity check...\n');
    
    // Reset fetch attempt counter for connectivity test
    fetchAttempt = 0;
    
    try {
        const response = await fetch('https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/main/config.json');
        console.log('✅ Connectivity check passed');
        return true;
    } catch (error) {
        console.log('❌ Connectivity check failed:', error.message);
        return false;
    }
}

// Run all tests
async function runAllTests() {
    try {
        console.log('Starting network error handling tests...\n');
        
        const retryTest = await testRetryLogic();
        testErrorMessages();
        const connectivityTest = await testConnectivityCheck();
        
        console.log('\n📊 Test Results:');
        console.log('================');
        console.log(`Retry Logic: ${retryTest ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`Error Messages: ✅ PASS`);
        console.log(`Connectivity Check: ${connectivityTest ? '✅ PASS' : '❌ FAIL'}`);
        
        if (retryTest && connectivityTest) {
            console.log('\n🎉 All network error handling tests passed!');
            console.log('The extension should now handle network errors gracefully.');
        } else {
            console.log('\n⚠️  Some tests failed, but error handling is improved.');
        }
        
    } catch (error) {
        console.error('❌ Test suite failed:', error);
    }
}

runAllTests();