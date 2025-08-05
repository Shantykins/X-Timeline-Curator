import { isModelReady } from './modelManager.js';

// Global state
let isRunning = false;
let aiReady = false;
const OFFSCREEN_DOCUMENT_PATH = 'offscreen.html';
let connectedTabs = new Set(); // Track tabs with active content scripts
let cachedInterests = []; // Cache interests to avoid repeated storage reads
const spamKeywords = ['promoted', 'sponsored', 'free crypto', 'giveaway'];
const SIM_THRESHOLD = 0.35;

// Initialize cached interests
const initializeCachedInterests = async () => {
    try {
        const result = await chrome.storage.local.get('interests');
        cachedInterests = Array.isArray(result.interests) ? result.interests : [];
        console.log('Cached interests initialized:', cachedInterests);
    } catch (error) {
        console.error('Failed to initialize cached interests:', error);
        cachedInterests = [];
    }
};

// Propagate future interest changes
chrome.storage.onChanged.addListener((changes, area) => {
    try {
        if (area === 'local' && changes.interests) {
            cachedInterests = changes.interests.newValue || [];
            console.log('Cached interests updated:', cachedInterests);
            if (aiReady) {
                chrome.runtime.sendMessage({ type: 'SET_INTERESTS', interests: cachedInterests });
            }
        }
    } catch (error) {
        console.error('Error updating cached interests:', error);
    }
});

// On-device model handled in offscreen document

// Debug logging functionality
const logLine = async ({id, text, decision, reason}) => {
    try {
        // Ensure all parameters are defined
        if (!id || !decision || !reason) {
            console.warn('logLine called with missing parameters:', {id, decision, reason});
            return;
        }
        
        // Get existing log with proper error handling
        let result;
        try {
            result = await chrome.storage.local.get({curationLog: []});
        } catch (storageError) {
            console.error('Storage get error in logLine:', storageError);
            return;
        }
        
        const curationLog = Array.isArray(result.curationLog) ? result.curationLog : [];
        
        // Add new entry
        curationLog.push({
            ts: Date.now(), 
            id: String(id), 
            decision: String(decision), 
            reason: String(reason), 
            text: String(text || '')
        });
        
        // Maintain ring buffer
        if (curationLog.length > 2000) {
            curationLog.shift();
        }
        
        // Save back to storage
        try {
            await chrome.storage.local.set({curationLog});
        } catch (storageError) {
            console.error('Storage set error in logLine:', storageError);
        }
    } catch (error) {
        console.error('Error logging curation decision:', error);
    }
};

// Enhanced fallback classification with semantic analysis
const fallbackClassification = (text, interests = []) => {
    // Handle null/undefined text (but not empty string)
    if (text === null || text === undefined || typeof text !== 'string') {
        return {
            isUninteresting: true,
            reason: 'Invalid text input'
        };
    }
    
    const lowerText = text.toLowerCase();
    
    // Spam keywords (more comprehensive)
    const spamKeywords = [
        'sponsored', 'promoted', 'advertisement', 'buy now', 'click here',
        'limited time', 'act now', 'dm me', 'link in bio', 'follow back',
        'get rich', 'make money', 'work from home', 'crypto opportunity',
        'investment opportunity', 'f4f', 'l4l', 'check my bio', 'promo code'
    ];
    
    // Check for obvious spam
    for (const keyword of spamKeywords) {
        if (lowerText.includes(keyword)) {
            return {
                isUninteresting: true,
                reason: `Spam keyword: ${keyword}`
            };
        }
    }
    
    // Enhanced interest matching with semantic similarity
    let bestMatch = null;
    let bestScore = 0;
    
    for (const interest of interests) {
        const interestLower = interest.toLowerCase();
        
        // Exact match
        if (lowerText.includes(interestLower)) {
            return {
                isUninteresting: false,
                reason: `Direct match: ${interest}`
            };
        }
        
        // Check for related terms and partial matches
        const words = lowerText.split(/\s+/);
        const interestWords = interestLower.split(/\s+/);
        
        let matchCount = 0;
        for (const word of words) {
            for (const iWord of interestWords) {
                // Only count significant matches (at least 3 characters)
                if ((word.length >= 3 && iWord.length >= 3) && (word.includes(iWord) || iWord.includes(word))) {
                    matchCount++;
                }
                // Check for common abbreviations/variations
                if (word === 'ai' && (iWord === 'artificial' || iWord === 'intelligence')) matchCount++;
                if (word === 'ml' && (iWord === 'machine' || iWord === 'learning')) matchCount++;
                if (word === 'gpu' && iWord === 'graphics') matchCount++;
                if (word === 'cpu' && iWord === 'processor') matchCount++;
            }
        }
        
        // More conservative scoring - require higher threshold
        const score = matchCount / interestWords.length; // Score based on interest words matched
        if (score > bestScore) {
            bestScore = score;
            bestMatch = interest;
        }
    }
    
    // Engagement bait patterns (check before semantic matching)
    if (/^(rt if|retweet if|like if|agree or disagree)/i.test(text)) {
        return {
            isUninteresting: true,
            reason: 'Engagement bait pattern'
        };
    }
    
    // Quality indicators (check before semantic matching to prioritize)
    const qualityIndicators = [
        'research', 'study', 'analysis', 'breakthrough', 'discovered', 'published',
        'scientists', 'university', 'paper', 'findings', 'data shows'
    ];
    
    for (const indicator of qualityIndicators) {
        if (lowerText.includes(indicator)) {
            return {
                isUninteresting: false,
                reason: `Quality content: ${indicator}`
            };
        }
    }
    
    // If we found a good semantic match (>50% of interest words matched)
    if (bestScore > 0.5) {
        return {
            isUninteresting: false,
            reason: `Semantic match: ${bestMatch} (${Math.round(bestScore * 100)}%)`
        };
    }
    
    // If it doesn't match any interest and isn't spam → hide it
    return {
        isUninteresting: true,
        reason: 'No matching interests (using fallback classification)'
    };
};

// Alarms for keep-alive
const ALARM_NAME = 'curation-keep-alive';

// Helper function to setup the offscreen document
async function setupOffscreenDocument() {
  try {
    const existingContexts = await chrome.runtime.getContexts({ 
      contextTypes: ['OFFSCREEN_DOCUMENT'] 
    });
    
    if (existingContexts.length > 0) {
      // Document already exists, just notify it's ready
      await chrome.runtime.sendMessage({ type: 'OFFSCREEN_READY' });
      return;
    }

    // Use 'BLOBS' as a compatible reason for creating the offscreen document.
    await chrome.offscreen.createDocument({
      url: OFFSCREEN_DOCUMENT_PATH,
      reasons: ['BLOBS'],
      justification: 'To host the AI model in a dedicated worker thread for local processing.',
    });
    
    console.log('Offscreen document created successfully');
  } catch (error) {
    console.error('Failed to setup offscreen document:', error);
    throw error;
  }
}

const broadcastStatus = async () => {
  const aiStatus = aiReady ? 'ready' : (isRunning ? 'loading' : 'stopped');
  const message = { type: 'STATUS_UPDATE', payload: { isRunning, aiReady, aiStatus } };
  try { 
    await chrome.runtime.sendMessage(message); 
    // Also update storage for popup initialization
    await chrome.storage.local.set({ aiStatus });
  } catch (e) { 
    // Popup might not be open, ignore
    console.debug('No receivers for status update, popup likely closed');
  }
};

const initializeAI = async () => {
  try {
    console.log('Starting AI initialization...');
    await broadcastStatus();
    
    // Setup offscreen document for on-device model
    await setupOffscreenDocument();
    console.log('Offscreen document setup complete');
    
    // Give the offscreen document time to load
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Try to trigger model loading by sending a message to offscreen
    try {
      console.log('Triggering model preload...');
      chrome.runtime.sendMessage({ type: 'PRELOAD_MODEL' });
    } catch (e) {
      console.log('Preload message not received (expected if offscreen not ready)');
    }
    
    await broadcastStatus();
    
  } catch (error) {
    console.error('Failed to initialize AI:', error);
    await broadcastStatus();
  }
};

const startCuration = async () => {
  try {
    if (isRunning) return;
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url || !(tab.url.includes('x.com') || tab.url.includes('twitter.com'))) {
      console.log("Curation can only be started on an x.com or twitter.com tab.");
      return;
    }
    
    // Ensure content script is loaded on the active tab
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'PING' });
    } catch (e) {
      // Content script not loaded, inject it
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['scripts/content.js']
        });
        console.log('Content script injected into active tab');
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait for initialization
      } catch (injectionError) {
        console.error('Failed to inject content script:', injectionError);
        return;
      }
    }
    
    isRunning = true;
    await chrome.storage.local.set({ isRunning });
    chrome.alarms.create(ALARM_NAME, { periodInMinutes: 0.5 });
    
    if (aiReady) {
      await startContentScript();
    } else {
      await initializeAI();
    }
    await broadcastStatus();
  } catch (error) {
    console.error('Failed to start curation:', error);
    isRunning = false;
    await chrome.storage.local.set({ isRunning });
    await broadcastStatus();
  }
};

const stopCuration = async () => {
  try {
    if (!isRunning) return;
    isRunning = false;
    await chrome.storage.local.set({ isRunning });
    chrome.alarms.clear(ALARM_NAME);
    await stopContentScript();
    await broadcastStatus();
  } catch (error) {
    console.error('Error stopping curation:', error);
  }
};

const forwardToContentScript = async (message) => {
  try {
    const tabs = await chrome.tabs.query({ url: ["*://x.com/*", "*://twitter.com/*"] });
    
    if (tabs.length === 0) {
      console.debug('No Twitter/X tabs found to send message to');
      return;
    }
    
    const promises = tabs.map(async (tab) => {
      try {
        // Check if tab is valid and loaded
        if (!tab.id || tab.discarded || tab.status !== 'complete') {
          console.debug(`Skipping tab ${tab.id}: not ready (status: ${tab.status})`);
          return;
        }
        
        // Try to ping the content script first
        await chrome.tabs.sendMessage(tab.id, { type: 'PING' });
        
        // If ping succeeds, send the actual message
        await chrome.tabs.sendMessage(tab.id, message);
        connectedTabs.add(tab.id);
        console.debug(`Message sent successfully to tab ${tab.id}`);
        
      } catch (e) {
        // If it's a connection error, try to inject the content script
        if (e.message.includes('Could not establish connection') || 
            e.message.includes('Receiving end does not exist')) {
          try {
            console.debug(`Attempting to inject content script into tab ${tab.id}`);
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ['scripts/content.js']
            });
            
            // Wait a bit for the script to initialize
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Try sending the message again
            await chrome.tabs.sendMessage(tab.id, message);
            connectedTabs.add(tab.id);
            console.debug(`Message sent successfully to tab ${tab.id} after injection`);
            
          } catch (injectionError) {
            console.debug(`Failed to inject and send to tab ${tab.id}:`, injectionError.message);
          }
        } else {
          connectedTabs.delete(tab.id);
          console.debug(`Failed to send message to tab ${tab.id}:`, e.message);
        }
      }
    });
    
    await Promise.all(promises);
  } catch (e) {
    console.error("Failed to query tabs or send messages:", e);
  }
};

const startContentScript = async () => await forwardToContentScript({ type: 'START' });
const stopContentScript = async () => await forwardToContentScript({ type: 'STOP' });

// Main message listener for all parts of the extension
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const handleMessage = async () => {
    try {
      switch (message.type) {
        case 'START_CURATION': 
          await startCuration().catch(error => {
            console.error('Failed to start curation:', error);
            sendResponse({ success: false, error: error.message });
          }); 
          sendResponse({ success: true });
          break;
        case 'STOP_CURATION': 
          await stopCuration().catch(error => {
            console.error('Failed to stop curation:', error);
            sendResponse({ success: false, error: error.message });
          });
          sendResponse({ success: true });
          break;
        
        case 'OFFSCREEN_READY':
          sendResponse({ success: true });
          break;

        case 'EVALUATE_TWEET':
          if (isRunning) {
            const { id, text } = message.payload;
            
            let classificationResult;
            if (isModelReady()) {
              try {
                classificationResult = await chrome.runtime.sendMessage({
                  type: 'CLASSIFY',
                  id,
                  text,
                });
              } catch (e) {
                console.warn('Local AI classify failed, falling back', e);
              }
            }
            if (!classificationResult) {
              classificationResult = fallbackClassification(text, cachedInterests);
            }
            
            // Log the decision
            try {
              await logLine({
                id: id || 'unknown',
                text: text || '',
                decision: classificationResult.isUninteresting ? 'hide' : 'keep',
                reason: classificationResult.reason || 'unknown'
              });
            } catch (logError) {
              console.error('Failed to log decision:', logError);
            }
            
            // Send result for logging to popup (if open)
            try {
              await chrome.runtime.sendMessage({ 
                type: 'ACTIVITY_LOG', 
                payload: {
                  tweetText: text || 'No text available',
                  decision: classificationResult.isUninteresting ? 'hidden' : 'kept',
                  reason: classificationResult.reason
                }
              });
            } catch (e) {
              // Popup might not be open
            }
            
            // Forward to content script if tweet should be hidden
            if (classificationResult.isUninteresting) {
              await forwardToContentScript({ 
                type: 'MARK_TWEET', 
                payload: { id, isUninteresting: true }
              });
            }
          }
          sendResponse({ success: true });
          break;
          
        case 'AI_READY':
          aiReady = true;
          // Send current interests + spam list to offscreen
          chrome.runtime.sendMessage({
            type: 'SET_INTERESTS',
            interests: cachedInterests,
            spamKeywords,
            threshold: SIM_THRESHOLD
          });
          await broadcastStatus();
          if (isRunning) startContentScript();
          sendResponse({ success: true });
          break;
          
        case 'CLASSIFICATION_RESULT':
          // Handle results from offscreen classification
          if (isRunning && message.payload) {
            const { id, isUninteresting, reason, text } = message.payload;
            
            // Log the decision
            try {
              await logLine({
                id: id || 'unknown',
                text: text || '',
                decision: isUninteresting ? 'hide' : 'keep',
                reason: reason || 'unknown'
              });
            } catch (logError) {
              console.error('Failed to log decision:', logError);
            }
            
            // Send result for logging to popup (if open)
            try {
              await chrome.runtime.sendMessage({ 
                type: 'ACTIVITY_LOG', 
                payload: {
                  tweetText: text || 'No text available',
                  decision: isUninteresting ? 'hidden' : 'kept',
                  reason: reason
                }
              });
            } catch (e) {
              // Popup might not be open
            }
            
            // Forward to content script if tweet should be hidden
            if (isUninteresting) {
              await forwardToContentScript({ 
                type: 'MARK_TWEET', 
                payload: { id, isUninteresting: true }
              });
            }
          }
          sendResponse({ success: true });
          break;
          
        case 'AI_LOAD_PROGRESS':
          // Forward to popup if it's open
          try {
            await chrome.runtime.sendMessage({ type: 'AI_LOAD_PROGRESS', payload: message.payload });
          } catch (e) {
            // Popup might not be open, ignore
          }
          sendResponse({ success: true });
          break;
          
        case 'AI_LOAD_FAILED':
          const errorPayload = message.payload || 'Unknown error';
          console.error("AI Load Failed:", errorPayload);
          console.error("Full message:", JSON.stringify(message, null, 2));
          aiReady = false;
          
          // Forward to popup if it's open
          try {
            await chrome.runtime.sendMessage({ type: 'AI_LOAD_FAILED', payload: errorPayload });
          } catch (e) {
            // Popup might not be open, ignore
          }
          
          // Check if we should retry the AI initialization
          const errorMessage = message.payload || '';
          const isNetworkError = errorMessage.includes('Network') || errorMessage.includes('fetch') || errorMessage.includes('timeout') || errorMessage.includes('connectivity');
          
          if (isNetworkError && isRunning) {
            console.log('Network error detected, will retry AI initialization in 15 seconds...');
            setTimeout(async () => {
              if (isRunning && !aiReady) {
                console.log('Retrying AI initialization after network error...');
                try {
                  chrome.runtime.sendMessage({ type: 'AI_LOAD_PROGRESS', payload: { progress: 5, status: 'Retrying download...' } });
                  await initializeAI();
                } catch (retryError) {
                  console.error('AI retry failed:', retryError);
                }
              }
            }, 15000);
          }
          
          // Don't completely stop curation, continue with fallback classification
          if (isRunning) {
            console.log('AI failed, continuing with fallback classification');
          }
          
          await broadcastStatus();
          sendResponse({ success: true });
          break;
          
        case 'RETRY_AI_LOAD':
          console.log('Manual AI retry requested from popup');
          if (isRunning) {
            try {
              aiReady = false;
              await broadcastStatus();
              chrome.runtime.sendMessage({ type: 'AI_LOAD_PROGRESS', payload: { progress: 5, status: 'Manual retry...' } });
              await initializeAI();
              sendResponse({ success: true });
            } catch (error) {
              console.error('Manual retry failed:', error);
              sendResponse({ success: false, error: error.message });
            }
          } else {
            sendResponse({ success: false, error: 'Extension not running' });
          }
          break;
        
        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
  };
  
  handleMessage();
  return true; // Keep the message channel open for asynchronous responses.
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) { /* Keep alive */ }
});

// Clean up connection tracking when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  connectedTabs.delete(tabId);
});

// Clean up connection tracking when tabs are updated (page navigation)
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    connectedTabs.delete(tabId);
  }
});

chrome.runtime.onStartup.addListener(async () => {
  try {
    isRunning = false;
    aiReady = false;
    await chrome.storage.local.set({ isRunning: false, aiStatus: 'stopped' });
    await initializeCachedInterests();
    await broadcastStatus();
    console.log('Extension startup: Reset state');
  } catch (error) {
    console.error('Error during startup:', error);
  }
});

chrome.runtime.onInstalled.addListener(async () => {
    try {
        isRunning = false;
        aiReady = false;
        await chrome.storage.local.set({ 
            isRunning: false,
            aiStatus: 'stopped',
            interests: ['technology', 'science', 'finance', 'ai', 'music', 'startups', 'venture capital', 'semiconductors', 'gpus', 'computer hardware', 'computer software'] 
        });
        await initializeCachedInterests();
        await broadcastStatus();
        console.log('Extension installed: Initial setup complete');
    } catch (error) {
        console.error('Error during installation:', error);
    }
});