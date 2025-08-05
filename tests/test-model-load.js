// Test script to diagnose model loading issues
// Run this in the offscreen document console

console.log('=== Model Loading Test ===');

async function testModelLoad() {
  try {
    console.log('Step 1: Testing transformers.js import...');
    const transformersUrl = chrome.runtime.getURL('vendor/transformers.min.js');
    console.log('Transformers URL:', transformersUrl);
    
    const { pipeline, env } = await import(transformersUrl);
    console.log('✅ Transformers.js imported successfully');
    console.log('Pipeline function:', typeof pipeline);
    console.log('Env object:', typeof env);
    
    console.log('Step 2: Testing network access...');
    const configUrl = 'https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/main/config.json';
    const configResponse = await fetch(configUrl);
    console.log('✅ Network access OK:', configResponse.status);
    
    console.log('Step 3: Testing pipeline creation...');
    console.log('Creating pipeline for feature-extraction...');
    
    // Set a timeout for the pipeline creation
    const pipelinePromise = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { quantized: true });
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Pipeline creation timeout')), 60000);
    });
    
    const pipe = await Promise.race([pipelinePromise, timeoutPromise]);
    console.log('✅ Pipeline created successfully:', typeof pipe);
    
    console.log('Step 4: Testing inference...');
    const result = await pipe('hello world', { pooling: 'mean', normalize: true });
    console.log('✅ Inference test successful, embedding length:', result.length);
    
    console.log('🎉 All tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed at step:', error.message);
    console.error('Full error:', error);
    console.error('Stack trace:', error.stack);
  }
}

testModelLoad();