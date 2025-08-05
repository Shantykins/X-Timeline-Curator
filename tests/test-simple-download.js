#!/usr/bin/env node

/**
 * Simple test to check if the model can actually be downloaded
 * Tests the network connectivity directly
 */

console.log('🌐 Simple Download Test');
console.log('======================\n');

async function testNetworkDownload() {
    try {
        console.log('📡 Testing network connectivity to HuggingFace...');
        
        const files = [
            'config.json',
            'tokenizer.json', 
            'tokenizer_config.json',
            'onnx/model_quantized.onnx'
        ];
        
        const baseUrl = 'https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/main';
        
        for (const file of files) {
            const url = `${baseUrl}/${file}`;
            try {
                console.log(`🔍 Testing: ${file}`);
                const startTime = Date.now();
                const response = await fetch(url, { 
                    method: 'HEAD',
                    headers: {
                        'User-Agent': 'transformers.js/test'
                    }
                });
                const time = Date.now() - startTime;
                
                if (response.ok) {
                    const size = response.headers.get('content-length');
                    const sizeStr = size ? `${(parseInt(size) / 1024 / 1024).toFixed(1)}MB` : 'unknown size';
                    console.log(`   ✅ ${response.status} ${response.statusText} - ${sizeStr} (${time}ms)`);
                } else {
                    console.log(`   ❌ ${response.status} ${response.statusText} (${time}ms)`);
                }
            } catch (error) {
                console.log(`   ❌ Network error: ${error.message}`);
            }
        }
        
        console.log('\n📥 Testing actual file download...');
        
        // Try to download the config file
        const configUrl = `${baseUrl}/config.json`;
        console.log(`🔄 Downloading: ${configUrl}`);
        
        const configResponse = await fetch(configUrl);
        if (configResponse.ok) {
            const configData = await configResponse.json();
            console.log('✅ Config downloaded successfully');
            console.log(`   Model type: ${configData.model_type || 'unknown'}`);
            console.log(`   Architecture: ${configData.architectures ? configData.architectures[0] : 'unknown'}`);
        } else {
            throw new Error(`Failed to download config: ${configResponse.status}`);
        }
        
        // Test a larger file download with progress
        console.log('\n📥 Testing larger file download...');
        const modelUrl = `${baseUrl}/onnx/model_quantized.onnx`;
        console.log(`🔄 Downloading: model_quantized.onnx`);
        
        const modelResponse = await fetch(modelUrl, {
            headers: {
                'User-Agent': 'transformers.js/test'
            }
        });
        
        if (modelResponse.ok) {
            const contentLength = modelResponse.headers.get('content-length');
            const totalSize = contentLength ? parseInt(contentLength) : 0;
            
            console.log(`   File size: ${(totalSize / 1024 / 1024).toFixed(1)}MB`);
            
            let downloadedSize = 0;
            const reader = modelResponse.body.getReader();
            const startTime = Date.now();
            
            // Download with progress tracking
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                downloadedSize += value.length;
                
                if (totalSize > 0) {
                    const progress = (downloadedSize / totalSize) * 100;
                    const elapsed = (Date.now() - startTime) / 1000;
                    const speed = (downloadedSize / 1024 / 1024) / elapsed;
                    
                    process.stdout.write(`\r   📊 ${progress.toFixed(1)}% (${speed.toFixed(1)} MB/s)`);
                }
                
                // Stop after downloading 5MB to save time/bandwidth
                if (downloadedSize > 5 * 1024 * 1024) {
                    console.log('\n   ✅ Download working - stopped after 5MB to save bandwidth');
                    break;
                }
            }
            
            if (downloadedSize === totalSize) {
                console.log('\n   ✅ Full file downloaded successfully');
            }
            
        } else {
            console.log(`   ❌ Model download failed: ${modelResponse.status}`);
        }
        
        return true;
        
    } catch (error) {
        console.error('\n❌ Network test failed:', error.message);
        return false;
    }
}

async function testTransformersCompatibility() {
    console.log('\n🔧 Testing @xenova/transformers compatibility...');
    
    try {
        const { pipeline } = await import('@xenova/transformers');
        console.log('✅ @xenova/transformers available');
        
        console.log('🔄 Testing pipeline creation...');
        const pipe = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { quantized: true });
        console.log('✅ Pipeline created successfully');
        
        console.log('🔄 Testing inference...');
        const result = await pipe('test input', { pooling: 'mean', normalize: true });
        const embedding = result.data ? Array.from(result.data) : result;
        
        console.log(`✅ Inference successful - ${embedding.length}D vector`);
        
        return true;
    } catch (error) {
        console.log(`❌ Transformers test failed: ${error.message}`);
        return false;
    }
}

// Run all tests
async function runAllTests() {
    console.log('Starting comprehensive download tests...\n');
    
    const networkTest = await testNetworkDownload();
    const transformersTest = await testTransformersCompatibility();
    
    console.log('\n📊 Final Results:');
    console.log('=================');
    console.log(`Network Connectivity: ${networkTest ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Transformers Pipeline: ${transformersTest ? '✅ PASS' : '❌ FAIL'}`);
    
    if (networkTest && transformersTest) {
        console.log('\n🎉 All tests passed!');
        console.log('The model download works fine outside of Chrome extension.');
        console.log('The issue is definitely Chrome extension environment specific.');
    } else if (networkTest && !transformersTest) {
        console.log('\n⚠️  Network works but transformers.js has issues');
        console.log('This suggests a compatibility problem with the transformers library.');
    } else if (!networkTest) {
        console.log('\n❌ Network connectivity failed');
        console.log('This suggests internet connection or HuggingFace server issues.');
    }
}

runAllTests();