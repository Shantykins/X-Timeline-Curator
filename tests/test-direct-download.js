#!/usr/bin/env node

/**
 * Test actual model download using the browser transformers.js
 * This simulates what happens in the browser more accurately
 */

import { JSDOM } from 'jsdom';

console.log('🌐 Direct Model Download Test');
console.log('============================\n');

// Set up a browser-like environment using JSDOM
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost:8081',
    pretendToBeVisual: true,
    resources: 'usable'
});

// Set up global browser environment
global.window = dom.window;
global.document = dom.window.document;
global.self = dom.window;
global.fetch = dom.window.fetch;
global.Response = dom.window.Response;
global.Request = dom.window.Request;
global.Headers = dom.window.Headers;

// Mock some additional browser APIs that might be needed
global.navigator = dom.window.navigator;
global.location = dom.window.location;

console.log('✅ Browser environment set up with JSDOM');

async function testActualDownload() {
    try {
        console.log('📦 Testing network connectivity to HuggingFace...');
        
        // Test basic connectivity
        const testUrls = [
            'https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/main/config.json',
            'https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/main/tokenizer.json'
        ];
        
        for (const url of testUrls) {
            try {
                console.log(`🔍 Testing: ${url.split('/').pop()}`);
                const response = await fetch(url, { method: 'HEAD' });
                console.log(`   Status: ${response.status} ${response.statusText}`);
                if (response.ok) {
                    const size = response.headers.get('content-length');
                    if (size) {
                        console.log(`   Size: ${(parseInt(size) / 1024).toFixed(1)}KB`);
                    }
                }
            } catch (error) {
                console.log(`   ❌ Failed: ${error.message}`);
            }
        }
        
        console.log('\n📦 Importing browser transformers.js...');
        
        // Import the actual browser transformers.js
        const transformersUrl = 'file://' + process.cwd() + '/vendor/transformers.min.js';
        console.log(`Importing from: ${transformersUrl}`);
        
        const module = await import(transformersUrl);
        console.log('✅ Transformers.js imported successfully');
        console.log(`   Pipeline type: ${typeof module.pipeline}`);
        console.log(`   Env type: ${typeof module.env}`);
        
        if (!module.pipeline) {
            throw new Error('Pipeline function not available');
        }
        
        console.log('\n🔄 Attempting model download...');
        console.log('   Model: Xenova/all-MiniLM-L6-v2');
        console.log('   Task: feature-extraction');
        console.log('   Options: { quantized: true }');
        
        // Set up progress tracking
        if (module.env) {
            const originalFetch = module.env.fetch || fetch;
            let downloadCount = 0;
            
            module.env.fetch = async (url, options) => {
                downloadCount++;
                console.log(`   📥 Download ${downloadCount}: ${url.split('/').pop()}`);
                
                try {
                    const response = await originalFetch(url, options);
                    if (response.ok) {
                        const size = response.headers.get('content-length');
                        if (size) {
                            console.log(`      Size: ${(parseInt(size) / 1024 / 1024).toFixed(1)}MB`);
                        }
                    }
                    return response;
                } catch (error) {
                    console.log(`      ❌ Failed: ${error.message}`);
                    throw error;
                }
            };
        }
        
        // Add timeout to the download
        const downloadPromise = module.pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { 
            quantized: true 
        });
        
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error('Download timeout after 3 minutes'));
            }, 180000);
        });
        
        console.log('   ⏳ Starting download (max 3 minutes)...');
        const startTime = Date.now();
        
        const pipeline = await Promise.race([downloadPromise, timeoutPromise]);
        const downloadTime = (Date.now() - startTime) / 1000;
        
        console.log(`\n✅ Download completed in ${downloadTime.toFixed(2)} seconds!`);
        console.log(`   Pipeline type: ${typeof pipeline}`);
        
        // Test the pipeline
        console.log('\n🧪 Testing pipeline inference...');
        const testText = "artificial intelligence and machine learning";
        const result = await pipeline(testText, { pooling: 'mean', normalize: true });
        
        // Handle both tensor and array formats
        const embedding = result.data ? Array.from(result.data) : result;
        
        console.log(`✅ Inference successful!`);
        console.log(`   Input: "${testText}"`);
        console.log(`   Output: ${embedding.length}D vector`);
        console.log(`   Sample: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}]`);
        
        return {
            downloadTime,
            embeddingLength: embedding.length,
            success: true
        };
        
    } catch (error) {
        console.error('\n❌ Download test failed:', error.message);
        console.error('Full error:', error);
        return {
            error: error.message,
            success: false
        };
    }
}

// Install required dependencies if missing
async function checkDependencies() {
    try {
        await import('jsdom');
        console.log('✅ JSDOM available');
        return true;
    } catch {
        console.log('❌ JSDOM not found. Installing...');
        console.log('Please run: npm install jsdom');
        return false;
    }
}

// Run the test
async function runTest() {
    const hasJsdom = await checkDependencies();
    if (!hasJsdom) {
        console.log('❌ Cannot run test without JSDOM');
        return;
    }
    
    console.log('🚀 Starting direct download test...\n');
    
    const result = await testActualDownload();
    
    console.log('\n📊 Test Results:');
    console.log('================');
    if (result.success) {
        console.log('✅ Model download: SUCCESS');
        console.log(`✅ Download time: ${result.downloadTime.toFixed(2)} seconds`);
        console.log(`✅ Embedding dimensions: ${result.embeddingLength}`);
        console.log('\n🎉 The browser transformers.js works perfectly for downloads!');
        console.log('   The Chrome extension issue must be environment-specific.');
    } else {
        console.log('❌ Model download: FAILED');
        console.log(`❌ Error: ${result.error}`);
        console.log('\n⚠️  The download fails even in a simulated browser environment.');
        console.log('   This confirms there are network or compatibility issues.');
    }
}

runTest();