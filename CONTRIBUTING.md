# Contributing to AI Curator Extension

Thank you for your interest in contributing! This document provides guidelines and information for contributors.

## 🤝 How to Contribute

### Reporting Issues

1. **Check existing issues** first to avoid duplicates
2. **Use the issue templates** when available
3. **Provide detailed information**:
   - Chrome version
   - Extension version
   - Steps to reproduce
   - Expected vs actual behavior
   - Console errors (if any)

### Suggesting Features

1. **Check if it already exists** in issues or discussions
2. **Describe the use case** and why it would be valuable
3. **Consider the scope** - should it be core functionality or a separate extension?

### Code Contributions

#### Development Setup

```bash
git clone https://github.com/your-username/ai-curator-extension.git
cd ai-curator-extension
npm install
```

#### Making Changes

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/your-feature-name`
3. **Make your changes**
4. **Test your changes**:
   ```bash
   npm test                           # Run unit tests
   node tests/test-model-node.js      # Test AI functionality
   node tests/test-simple-download.js # Test network connectivity
   ```
5. **Load extension in Chrome** and test manually
6. **Commit with clear messages**: `git commit -am "Add feature: description"`
7. **Push to your fork**: `git push origin feature/your-feature-name`
8. **Create a Pull Request**

#### Code Style

- **Use ES6+ features** where appropriate
- **Follow existing patterns** in the codebase
- **Add comments** for complex logic
- **Keep functions small** and focused
- **Use meaningful variable names**
- **Handle errors gracefully**

#### Testing

- **Write tests** for new functionality
- **Update existing tests** if you change behavior
- **Test in multiple scenarios**:
  - First-time installation
  - Model already cached
  - Network errors
  - Different Twitter/X page layouts

#### Architecture Guidelines

- **Background script** handles coordination and storage
- **Offscreen document** handles AI processing
- **Content script** handles DOM manipulation
- **Popup** handles user interface
- **Model manager** handles model lifecycle

Keep these concerns separated!

## 🔧 Technical Details

### Project Structure

```
├── manifest.json          # Extension configuration
├── scripts/               # Core functionality
│   ├── background.js      # Service worker
│   ├── content.js         # Content script
│   ├── offscreen.js       # AI processing
│   └── modelManager.js    # Model management
├── popup/                 # User interface
├── vendor/                # Third-party libraries
├── tests/                 # Test files
└── icons/                 # Extension icons
```

### Key Technologies

- **Chrome Extensions API** - Manifest V3
- **Transformers.js** - Local AI inference
- **ONNX Runtime** - WASM backend for models
- **IndexedDB** - Model caching
- **Jest** - Testing framework

### Common Patterns

#### Message Passing
```javascript
// Send message
chrome.runtime.sendMessage({ type: 'ACTION_TYPE', payload: data });

// Listen for messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ACTION_TYPE') {
    // Handle message
    sendResponse({ success: true });
  }
});
```

#### Error Handling
```javascript
try {
  const result = await riskyOperation();
  return { success: true, data: result };
} catch (error) {
  console.error('Operation failed:', error);
  return { success: false, error: error.message };
}
```

#### Storage Operations
```javascript
// Save data
await chrome.storage.local.set({ key: value });

// Load data
const { key } = await chrome.storage.local.get('key');
```

## 🐛 Debugging

### Common Issues

1. **"Failed to fetch" errors** - Usually network/CSP issues
2. **WASM compilation errors** - CSP needs `'wasm-unsafe-eval'`
3. **Message passing failures** - Check receiver is loaded
4. **DOM manipulation issues** - Twitter/X page structure changes

### Debugging Tools

1. **Extension Console**: `chrome://extensions` → Inspect views
2. **Content Script Console**: F12 on Twitter/X page
3. **Network Tab**: Check model download progress
4. **Application Tab**: Check IndexedDB for cached models

### Logging

Use structured logging:
```javascript
console.log('🔄 Starting operation:', { param1, param2 });
console.warn('⚠️ Warning:', warningMessage);
console.error('❌ Error:', error);
```

## 📋 Pull Request Checklist

Before submitting:

- [ ] Code follows existing style
- [ ] All tests pass (`npm test`)
- [ ] Extension loads without errors
- [ ] Manual testing completed
- [ ] Documentation updated (if needed)
- [ ] Commit messages are clear
- [ ] No sensitive data in commits

## 🎯 Areas for Contribution

### High Priority
- **Performance optimizations** - Reduce memory usage, faster inference
- **Better error handling** - More graceful failure modes
- **UI improvements** - Better user experience
- **Test coverage** - More comprehensive testing

### Medium Priority
- **Additional models** - Support for other transformer models
- **Platform support** - Firefox/Safari versions
- **Advanced features** - Custom similarity thresholds, user feedback
- **Documentation** - More examples, tutorials

### Low Priority
- **Analytics** - Usage metrics (privacy-preserving)
- **Themes** - Dark mode, custom colors
- **Export features** - Backup/restore settings
- **Internationalization** - Multi-language support

## 🚫 What We Don't Want

- **External API calls** - Keep everything local
- **Tracking/analytics** - Respect user privacy
- **Bloated dependencies** - Keep it lightweight
- **Breaking changes** - Maintain backward compatibility
- **Platform-specific code** - Keep it cross-platform where possible

## ❓ Questions?

- **Open an issue** for technical questions
- **Start a discussion** for feature ideas
- **Check existing docs** before asking

Thank you for contributing! 🎉