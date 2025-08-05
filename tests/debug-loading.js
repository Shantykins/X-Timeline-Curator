// Debug script to check loading issues
// Run this in the Chrome extension console (background or offscreen)

console.log('=== Model Loading Debug ===');

// Check if transformers.js exists
try {
  const transformersUrl = chrome.runtime.getURL('vendor/transformers.min.js');
  console.log('Transformers URL:', transformersUrl);
  
  fetch(transformersUrl)
    .then(res => {
      console.log('Transformers file status:', res.status, res.statusText);
      console.log('Transformers file size:', res.headers.get('content-length'), 'bytes');
    })
    .catch(err => console.error('Failed to fetch transformers.js:', err));
} catch (err) {
  console.error('Error checking transformers.js:', err);
}

// Check network access
fetch('https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/main/config.json')
  .then(res => {
    console.log('HuggingFace access status:', res.status, res.statusText);
  })
  .catch(err => console.error('HuggingFace access failed:', err));

// Check storage
chrome.storage.local.get(['isRunning', 'aiStatus'], (result) => {
  console.log('Current storage state:', result);
});

console.log('Debug complete - check console output above');