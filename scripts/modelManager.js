/**
 * Model Manager - Handles AI model loading, caching, and progress tracking
 * Features:
 * - One-time download with IndexedDB persistence
 * - Network retry with exponential backoff
 * - Progress tracking and error recovery
 * - Timeout protection
 */

const MODEL_REPO = 'Xenova/all-MiniLM-L6-v2';
let modelReady = false;
let _loadPromise = null;

// Network retry utility
const retryFetch = async (url, options = {}, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Fetching ${url} (attempt ${attempt}/${maxRetries})`);
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response;
    } catch (error) {
      console.warn(`Fetch attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        throw new Error(`Failed to fetch after ${maxRetries} attempts: ${error.message}`);
      }
      
      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, attempt - 1) * 1000;
      console.log(`Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

export const getMiniLMPipeline = () => {
  if (_loadPromise) return _loadPromise;

  _loadPromise = (async () => {
    try {
      console.log('Simple model loader: Starting...');
      chrome.runtime.sendMessage({ type: 'AI_LOAD_PROGRESS', payload: { status: 'Initializing...', progress: 5 } });
      
      // Test network connectivity first
      console.log('Testing network connectivity...');
      chrome.runtime.sendMessage({ type: 'AI_LOAD_PROGRESS', payload: { status: 'Testing network...', progress: 10 } });
      
      try {
        await retryFetch('https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/main/config.json');
        console.log('✅ Network connectivity confirmed');
      } catch (networkError) {
        console.error('❌ Network test failed:', networkError.message);
        throw new Error(`Network connectivity issue: ${networkError.message}`);
      }
      
      console.log('Importing transformers.js...');
      chrome.runtime.sendMessage({ type: 'AI_LOAD_PROGRESS', payload: { status: 'Loading AI library...', progress: 15 } });
      
      const { pipeline, env } = await import(chrome.runtime.getURL('vendor/transformers.min.js'));
      console.log('Simple model loader: Transformers imported');
      
      // Patch fetch for better error handling
      const originalFetch = env.fetch || fetch;
      env.fetch = async (url, options) => {
        try {
          return await retryFetch(url, options);
        } catch (error) {
          console.error('Model fetch failed:', error.message);
          throw error;
        }
      };
      
      chrome.runtime.sendMessage({ type: 'AI_LOAD_PROGRESS', payload: { status: 'Downloading model...', progress: 20 } });
      
      // Add timeout to pipeline creation
      const pipelinePromise = pipeline('feature-extraction', MODEL_REPO, { quantized: true });
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Model download timeout (2 minutes)')), 120000);
      });
      
      const pipe = await Promise.race([pipelinePromise, timeoutPromise]);
      console.log('Simple model loader: Pipeline created');
      
      chrome.runtime.sendMessage({ type: 'AI_LOAD_PROGRESS', payload: { status: 'Model ready!', progress: 100 } });
      
      modelReady = true;
      chrome.runtime.sendMessage({ type: 'AI_READY' });
      return pipe;
    } catch (err) {
      console.error('Simple model loader failed:', err);
      
      // Provide more specific error messages
      let errorMessage = err.message;
      if (err.message.includes('fetch')) {
        errorMessage = 'Network error: Check internet connection and try again';
      } else if (err.message.includes('timeout')) {
        errorMessage = 'Download timeout: Model download took too long';
      } else if (err.message.includes('HTTP')) {
        errorMessage = `Server error: ${err.message}`;
      }
      
      chrome.runtime.sendMessage({ type: 'AI_LOAD_FAILED', payload: errorMessage });
      _loadPromise = null; // Reset so it can be retried
      throw err;
    }
  })();

  return _loadPromise;
};

export const isModelReady = () => modelReady;