# Test Suite

This directory contains tests and utilities for the AI Curator Extension.

## Test Files

### Core Tests
- `offscreen.test.js` - Jest unit tests for core logic
- `test-model-node.js` - Complete model functionality test using Node.js
- `test-simple-download.js` - Network connectivity and download tests

### Debug Utilities
- `debug-loading.js` - Debug model loading issues
- `debug-test.js` - General debugging utilities
- `test-browser-env.js` - Browser environment simulation tests

### Integration Tests
- `integration-tests.html` - Browser-based integration tests
- `local-model-test.html` - Browser model testing interface
- `unit-tests.html` - Browser unit test runner

## 🧪 Test Coverage

### 1. Sanity Tests (`sanity-tests.js`)
- ✅ File structure validation
- ✅ Manifest.json validation
- ✅ Script syntax checking
- ✅ Dependency validation
- ✅ Configuration verification
- ✅ Icons and assets validation

### 2. Error Handling Tests (`error-handling-tests.js`)  
- ✅ Background script error handling
- ✅ Offscreen script error handling
- ✅ Fallback classification logic
- ✅ Edge case input handling
- ✅ Memory and performance considerations
- ✅ Network error handling
- ✅ Concurrency and race conditions
- ✅ Invalid API response handling

### 3. Unit Tests (`unit-tests.html`)
- ✅ Transformers.js library loading
- ✅ Pipeline creation and initialization
- ✅ Text embedding functionality
- ✅ Cosine similarity calculations
- ✅ Interest caching logic
- ✅ Spam keyword detection
- ✅ Classification threshold testing
- ✅ Edge case handling

### 4. Integration Tests (`integration-tests.html`)
- ✅ Chrome extension API mocking
- ✅ Message passing between scripts
- ✅ Storage operations testing
- ✅ Background script logic simulation
- ✅ Offscreen message handling
- ✅ Classification workflow testing
- ✅ Error propagation testing

## 🏃‍♂️ Running Tests

### Command Line Tests
```bash
# Run all Node.js tests
node tests/run-all-tests.js

# Run individual test suites
node tests/sanity-tests.js
node tests/error-handling-tests.js
```

### Browser Tests
Open the following files in a web browser:
- `tests/unit-tests.html`
- `tests/integration-tests.html`  
- `test.html`

The browser tests will automatically start when the page loads and show results in the browser console and on the page.

## 📊 Test Results

### Success Criteria
- ✅ All Node.js tests pass (exit code 0)
- ✅ All browser tests show "All tests passed!"
- ✅ No console errors in browser tests
- ✅ Transformers.js loads successfully
- ✅ Model download and embedding generation work

### Common Issues
- **Transformers.js fails to load**: Check network connectivity for initial model download
- **CORS errors**: Serve files through a local server for proper testing
- **Missing files**: Ensure all dependencies are present in vendor/ directory

## 🔧 Test Development

### Adding New Tests

1. **Node.js tests**: Add functions to existing test classes or create new test files
2. **Browser tests**: Add test functions to the HTML files and call them in the test runner

### Test Patterns
```javascript
// Node.js test pattern
testSomething() {
    this.log('🔍 Test Name: Description...', 'info');
    
    try {
        // Test logic here
        if (condition) {
            this.log('✅ PASS: Test passed', 'pass');
        } else {
            this.log('❌ FAIL: Test failed', 'fail');
            return;
        }
    } catch (error) {
        this.log(`❌ FAIL: ${error.message}`, 'fail');
    }
}

// Browser test pattern
async function testSomething() {
    try {
        log('🔍 Testing something...');
        
        // Test logic
        const result = await someFunction();
        
        if (result.isValid) {
            log('✅ PASS: Test successful', 'pass');
        } else {
            log('❌ FAIL: Invalid result', 'fail');
        }
    } catch (error) {
        log(`❌ FAIL: ${error.message}`, 'fail');
    }
}
```

## 🐛 Debugging

### Enable Verbose Logging
Add debug statements throughout the extension:
```javascript
console.log('Debug: Classification result:', result);
```

### Check Chrome DevTools
- Open Extension popup → F12 → Console tab
- Background script errors: chrome://extensions → Extension details → Inspect views → background page
- Content script errors: F12 on any Twitter/X page → Console tab

### Manual Testing
1. Load extension in Chrome Developer Mode
2. Navigate to Twitter/X.com
3. Open popup and click "Start"
4. Watch console for progress messages
5. Verify tweets are being filtered

## 📋 Test Checklist

Before releasing:
- [ ] All Node.js tests pass
- [ ] All browser tests pass  
- [ ] Manual testing on Twitter/X works
- [ ] Model downloads successfully (~52MB)
- [ ] Offline functionality works after download
- [ ] No console errors in normal operation
- [ ] Extension popup shows correct status
- [ ] Interest management works properly

## 🚨 Known Test Limitations

- Browser tests require manual execution (no automated browser testing)
- Network-dependent tests may fail in offline environments
- Model download tests require substantial bandwidth (~52MB)
- Some edge cases may only manifest in production Chrome extension environment

## 📝 Contributing

When adding new features:
1. Write tests first (TDD approach)
2. Ensure both positive and negative test cases
3. Add error handling tests
4. Update this README with new test descriptions
5. Run full test suite before submitting changes