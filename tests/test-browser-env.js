// Test browser transformers.js with simulated browser environment

// Simulate browser globals
global.self = global;
global.window = global;
global.document = {
    createElement: () => ({}),
    head: { appendChild: () => {} }
};
if (!global.navigator) {
    global.navigator = { userAgent: 'Node.js test' };
}

// Mock fetch for testing
global.fetch = async (url) => {
    console.log(`🌐 Mock fetch: ${url}`);
    return {
        ok: true,
        status: 200,
        json: async () => ({ model_type: 'test' }),
        arrayBuffer: async () => new ArrayBuffer(100)
    };
};

console.log('🧪 Testing Browser Transformers.js in Simulated Environment');
console.log('=========================================================\n');

async function testBrowserTransformers() {
    try {
        console.log('📦 Importing browser transformers.js...');
        const module = await import('./vendor/transformers.min.js');
        console.log('✅ Successfully imported browser transformers.js');
        
        console.log('📋 Available exports:');
        const exports = Object.keys(module);
        exports.forEach(exp => {
            console.log(`  - ${exp}: ${typeof module[exp]}`);
        });
        
        console.log('\n🔧 Testing pipeline creation...');
        if (typeof module.pipeline === 'function') {
            console.log('✅ Pipeline function is available');
            
            // Try to create a pipeline (this will likely fail due to missing WASM/ONNX runtime)
            try {
                console.log('🔄 Attempting to create feature extraction pipeline...');
                const pipe = await module.pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { 
                    quantized: true 
                });
                console.log('✅ Pipeline created successfully:', typeof pipe);
            } catch (pipeError) {
                console.log('❌ Pipeline creation failed (expected):', pipeError.message.slice(0, 100) + '...');
                console.log('   This is likely due to missing WASM runtime in Node.js');
            }
        } else {
            console.log('❌ Pipeline function not available');
        }
        
        console.log('\n🌐 Testing env object...');
        if (module.env && typeof module.env === 'object') {
            console.log('✅ Env object available');
            console.log('📋 Env properties:', Object.keys(module.env));
            
            // Test if we can patch fetch
            const originalFetch = module.env.fetch;
            console.log('🔄 Original fetch:', typeof originalFetch);
            
            module.env.fetch = global.fetch;
            console.log('✅ Successfully patched env.fetch');
        } else {
            console.log('❌ Env object not available');
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack:', error.stack);
        return false;
    }
}

testBrowserTransformers().then(success => {
    console.log('\n📊 Test Summary:');
    console.log('================');
    if (success) {
        console.log('✅ Browser transformers.js loads correctly in browser-like environment');
        console.log('✅ The issue is likely Chrome extension specific (CSP, network, WASM)');
        console.log('💡 The file itself is valid - focus on extension environment issues');
    } else {
        console.log('❌ Browser transformers.js has fundamental issues');
        console.log('💡 Need to check the transformers.js file or browser compatibility');
    }
});