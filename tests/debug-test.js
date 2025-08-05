// Simple test script to debug the extension
// Run this in Chrome DevTools console (popup or background)

console.log('=== AI Curator Debug Test ===');

// Test storage
chrome.storage.local.get(['isRunning', 'aiStatus', 'interests'], (result) => {
  console.log('Storage state:', result);
});

// Test message sending
chrome.runtime.sendMessage({ type: 'STATUS_UPDATE' }, (response) => {
  console.log('Status message response:', response);
});

console.log('Debug test complete - check console output above');