# AI Curator Extension

A Chrome extension that uses AI to automatically curate your Twitter/X feed by hiding irrelevant content and keeping posts that match your interests. Runs 100% locally using transformers.js - no data sent to external servers.

## ✨ Features

- 🧠 **Local AI Processing** - Uses Xenova/all-MiniLM-L6-v2 model (runs offline after first download)
- 🎯 **Smart Classification** - Semantic similarity matching against your interests using 384-dimensional embeddings
- 🚫 **Spam Detection** - Automatically filters promotional content and engagement bait
- 💾 **Persistent Caching** - Model cached in IndexedDB, downloads only once (~22MB)
- 📊 **Real-time Feedback** - Progress indicators and activity logging in popup
- 🔄 **Graceful Fallback** - Enhanced text-based classification when AI unavailable
- 🔁 **Auto Retry** - Network error handling with exponential backoff
- 🛡️ **Privacy First** - All processing happens locally, no external API calls

## 🚀 Quick Start

### Installation

1. **Download the Extension**
   ```bash
   git clone https://github.com/your-username/ai-curator-extension.git
   cd ai-curator-extension
   ```

2. **Install Dependencies** (for development/testing)
   ```bash
   npm install
   ```

3. **Load in Chrome**
   - Open Chrome and navigate to `chrome://extensions`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked" and select the `ai-curator-extension/` directory
   - The extension icon will appear in your toolbar

4. **First Setup**
   - Click the extension icon to open the popup
   - Configure your interests (comma-separated): `artificial intelligence, startups, technology`
   - Click "Save Interests"
   - Toggle "Activate Auto-Curation" to ON
   - First launch will download the AI model (~22MB, one-time only)

5. **Use on Twitter/X**
   - Navigate to [x.com](https://x.com) or [twitter.com](https://twitter.com)
   - The extension will automatically start filtering your feed
   - Irrelevant posts will be hidden, relevant ones remain visible

## 🏗️ Architecture

```
ai-curator-extension/
├── manifest.json              # Extension configuration
├── scripts/
│   ├── background.js          # Main extension logic & message routing
│   ├── content.js             # Twitter/X page content manipulation
│   ├── offscreen.js           # AI processing in offscreen document
│   └── modelManager.js        # Model download, caching & progress tracking
├── popup/
│   ├── popup.html             # Extension popup interface
│   ├── popup.js               # Popup logic & user interactions
│   └── popup.css              # Popup styling
├── vendor/
│   └── transformers.min.js    # Transformers.js library
├── icons/                     # Extension icons
├── tests/                     # Test files and utilities
└── docs/                      # Documentation
```

### Component Overview

- **`background.js`** - Service worker that coordinates between popup, content script, and offscreen document
- **`offscreen.js`** - Runs the AI model in an offscreen document for better performance
- **`modelManager.js`** - Handles model downloading with progress tracking and error recovery
- **`content.js`** - Interacts with Twitter/X DOM to hide/show posts
- **`popup.js`** - User interface for configuration and monitoring

## 🧪 How It Works

1. **Model Loading**: Downloads MiniLM model from HuggingFace (~22MB, cached in IndexedDB)
2. **Embedding Generation**: Creates 384-dimensional vector embeddings for your interests and each tweet
3. **Similarity Matching**: Uses cosine similarity to match tweets against your interests
4. **Smart Filtering**: Hides tweets below similarity threshold (default: 0.35), keeps relevant content
5. **Fallback Mode**: If AI fails, uses enhanced text-based classification with keyword matching

### Classification Logic

```javascript
// Simplified classification flow
const tweetEmbedding = await model(tweetText, { pooling: 'mean', normalize: true });
const similarities = interests.map(interest => 
  cosineSimilarity(tweetEmbedding, interestEmbedding)
);
const maxSimilarity = Math.max(...similarities);
const decision = maxSimilarity > 0.35 ? 'KEEP' : 'HIDE';
```

## 🔧 Development

### Running Tests

```bash
# Run unit tests
npm test

# Test model functionality locally
node tests/test-model-node.js

# Test network connectivity
node tests/test-simple-download.js
```

### Building for Production

1. Remove test files: `rm -rf tests/`
2. Minify if desired (optional for Chrome extensions)
3. Zip the extension directory for distribution

## 🐛 Troubleshooting

### Common Issues

#### "AI Load Failed: Failed to fetch"
**Cause**: Network connectivity issues during model download  
**Solutions**:
- Check internet connection
- Click "Retry Download" in popup
- Disable VPN/proxy temporarily
- Check if HuggingFace is accessible: https://huggingface.co

#### "No available backend found. ERR: [wasm] RuntimeError"
**Cause**: WASM compilation blocked by Content Security Policy  
**Solutions**:
- This should be fixed in the current version
- If you see this, the manifest.json CSP needs `'wasm-unsafe-eval'`
- Ensure you're using the latest version of the extension

#### Extension shows "Stopped" and won't start
**Cause**: Extension not properly initialized or crashed  
**Solutions**:
- Reload the extension in `chrome://extensions`
- Check browser console for errors (right-click extension → Inspect views)
- Try disabling and re-enabling the extension

#### Model download stuck at "AI Loading..."
**Cause**: Slow network or large model download  
**Solutions**:
- Wait up to 5 minutes for initial download (22MB model)
- Check network connectivity
- Use "Retry Download" button
- Check browser console for specific errors

#### Content not being filtered on Twitter/X
**Cause**: Content script not loaded or interests not configured  
**Solutions**:
- Refresh the Twitter/X page
- Check that interests are saved in popup
- Ensure extension is toggled ON
- Try toggling OFF and ON again

### Debug Mode

1. **Background Script Console**:
   - Go to `chrome://extensions`
   - Find "AI Curator Extension"
   - Click "Inspect views: background page"

2. **Content Script Console**:
   - On Twitter/X page, press F12
   - Check console for extension messages

3. **Enable Verbose Logging**:
   - Uncomment console.log statements in scripts
   - Reload extension

### Error Messages Reference

| Error | Meaning | Solution |
|-------|---------|----------|
| "Network error: Check internet connection" | Can't reach HuggingFace servers | Check connectivity, retry |
| "Download timeout: Model download took too long" | Download exceeded 2-minute limit | Check network speed, retry |
| "WASM compilation blocked" | Browser CSP blocking WASM | Update manifest CSP |
| "Pipeline creation failed" | Model loading error | Clear IndexedDB cache, retry |

## 🔒 Privacy & Security

- ✅ **100% Local Processing** - No data sent to external servers after initial model download
- ✅ **Offline Operation** - Works without internet after model is cached
- ✅ **No Tracking** - Your interests and activity stay on your device
- ✅ **Open Source** - All code is transparent and auditable
- ✅ **Secure CSP** - Content Security Policy prevents code injection

## 📊 Performance

- **Model Size**: 21.9MB (quantized ONNX)
- **Download Time**: 30-120 seconds (depending on connection)
- **Inference Speed**: 1-5ms per tweet
- **Memory Usage**: ~50MB additional RAM
- **Storage**: ~25MB in IndexedDB cache

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Run tests: `npm test`
5. Commit: `git commit -am 'Add feature'`
6. Push: `git push origin feature-name`
7. Create a Pull Request

### Development Setup

```bash
git clone https://github.com/your-username/ai-curator-extension.git
cd ai-curator-extension
npm install
# Load extension in Chrome as described in Installation
```

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Transformers.js](https://huggingface.co/docs/transformers.js) by Hugging Face
- [all-MiniLM-L6-v2](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2) sentence transformer model
- Chrome Extensions API documentation

---

**Star ⭐ this repo if you find it useful!**