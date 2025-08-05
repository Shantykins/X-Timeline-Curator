const SELECTORS = {
    TWEET: 'article[data-testid="tweet"], article[role="article"]',
    MORE_BUTTON: 'article [aria-haspopup="menu"], div[data-testid="caret"], button[aria-label*="More"]',
    MENU_ITEM: 'div[role="menuitem"], [role="menu"] div[role="menuitem"]',
    TWEET_PHOTO: 'div[data-testid="tweetPhoto"] img, [data-testid="tweetPhoto"] img',
    VIDEO_PLAYER: 'div[data-testid="videoPlayer"] video, video'
};

const TWEET_ID_ATTR = 'data-curator-id';
const PROCESSED_ATTR = 'data-curator-processed';

let mainLoopInterval = null;
let isTwitterPage = false;

// Check if we're on a Twitter/X feed page
const checkIfTwitterFeed = () => {
    const url = window.location.href;
    isTwitterPage = (url.includes('x.com') || url.includes('twitter.com')) && 
                   (url.includes('/home') || url === 'https://x.com/' || url === 'https://twitter.com/' || 
                    url.includes('/timeline') || !url.includes('/status/'));
    return isTwitterPage;
};

const getTweetId = (tweet, text, imageUrls) => {
    // Try to get stable identifiers from the tweet structure
    let stableContent = '';
    
    // Look for timestamp link which contains stable tweet ID
    const timeElement = tweet.querySelector('time');
    const linkElement = timeElement ? timeElement.closest('a[href*="/status/"]') : null;
    if (linkElement) {
        const match = linkElement.href.match(/\/status\/(\d+)/);
        if (match) {
            return `tweet-${match[1]}`;
        }
    }
    
    // Fallback: use username + timestamp + first part of text
    const usernameElement = tweet.querySelector('[role="link"] span, [data-testid="User-Name"] span');
    const username = usernameElement ? usernameElement.textContent : '';
    stableContent = username + text.substring(0, 50) + imageUrls.join('');
    
    let hash = 0;
    for (let i = 0; i < stableContent.length; i++) {
        const char = stableContent.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32bit integer
    }
    return `tweet-${hash}`;
};

const extractVideoFrames = async (videoUrl) => {
    return new Promise((resolve) => {
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        video.src = videoUrl;
        video.crossOrigin = "anonymous";
        video.muted = true;

        const cleanup = () => {
            video.remove();
            canvas.remove();
        };

        video.onloadeddata = () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            video.currentTime = video.duration * 0.1;
        };
        
        video.onseeked = () => {
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            const frame = canvas.toDataURL('image/jpeg', 0.5);
            cleanup();
            resolve([frame]);
        };

        video.onerror = () => {
            cleanup();
            resolve([]);
        };

        setTimeout(() => {
            cleanup();
            resolve([]);
        }, 5000);
    });
};

const processFeed = async () => {
    try {
        // Only process if we're on a feed page
        if (!checkIfTwitterFeed()) {
            return;
        }
        
        const tweets = document.querySelectorAll(`${SELECTORS.TWEET}:not([${PROCESSED_ATTR}])`);
        
        if (tweets.length === 0) {
            return;
        }
        
        for (const tweet of tweets) {
            try {
                tweet.setAttribute(PROCESSED_ATTR, 'true');

                const text = tweet.innerText || tweet.textContent || '';
                if (text.trim().length < 10) {
                    continue; // Skip very short tweets
                }
                
                const imageUrls = Array.from(tweet.querySelectorAll(SELECTORS.TWEET_PHOTO))
                    .map(img => img.src)
                    .filter(src => src && src.startsWith('http'));
                
                let videoFrames = [];
                const videoEl = tweet.querySelector(SELECTORS.VIDEO_PLAYER);
                if (videoEl && videoEl.src) {
                    try {
                        videoFrames = await extractVideoFrames(videoEl.src);
                    } catch (e) {
                        console.debug('Failed to extract video frames:', e);
                    }
                }

                const id = getTweetId(tweet, text, imageUrls);
                tweet.setAttribute(TWEET_ID_ATTR, id);

                await chrome.runtime.sendMessage({
                    type: 'EVALUATE_TWEET',
                    payload: { id, text, imageUrls, videoFrames }
                });
            } catch (e) {
                console.error('Error processing tweet:', e);
            }
        }
        
        // Only scroll if we processed tweets and we're near the bottom
        const isNearBottom = (window.innerHeight + window.scrollY) >= document.body.offsetHeight - 1000;
        if (tweets.length > 0 && isNearBottom) {
            window.scrollBy(0, Math.min(200, window.innerHeight * 0.2));
        }
    } catch (e) {
        console.error('Error in processFeed:', e);
    }
};

const waitForElement = (selector, parent = document, timeout = 500) => {
    return new Promise((resolve) => {
        const interval = 50;
        let elapsed = 0;
        const timer = setInterval(() => {
            const element = parent.querySelector(selector);
            if (element) {
                clearInterval(timer);
                resolve(element);
            }
            elapsed += interval;
            if (elapsed >= timeout) {
                clearInterval(timer);
                resolve(null);
            }
        }, interval);
    });
};


const markTweetAsNotInterested = async ({ id }) => {
    try {
        const tweet = document.querySelector(`[${TWEET_ID_ATTR}="${id}"]`);
        if (!tweet) {
            console.debug(`Tweet with id ${id} not found`);
            return;
        }

        const moreButton = tweet.querySelector(SELECTORS.MORE_BUTTON);
        if (!moreButton) {
            console.debug('More button not found on tweet');
            return;
        }
        
        moreButton.click();

        const menu = await waitForElement('div[role="menu"], [role="menu"]', document, 2000);
        if (!menu) {
            console.debug('Menu not found after clicking more button');
            return;
        }

        const menuItems = menu.querySelectorAll(SELECTORS.MENU_ITEM);
        for (const item of menuItems) {
            const itemText = (item.innerText || item.textContent || '').toLowerCase();
            if (itemText.includes('not interested') || 
                itemText.includes('hide this') ||
                itemText.includes('see fewer tweets like this')) {
                item.click();
                tweet.style.transition = 'opacity 0.5s ease';
                tweet.style.opacity = '0.3';
                tweet.style.pointerEvents = 'none';
                console.debug(`Marked tweet ${id} as not interested`);
                break;
            }
        }
    } catch (e) {
        console.error('Error marking tweet as not interested:', e);
    }
};

const start = () => {
    if (mainLoopInterval) return;
    
    // Check if we're on the right page
    if (!checkIfTwitterFeed()) {
        console.log('Not on Twitter/X feed page, curator not starting');
        return;
    }
    
    // Wait for page to be fully loaded before starting
    if (document.readyState !== 'complete') {
        window.addEventListener('load', () => {
            if (checkIfTwitterFeed()) {
                mainLoopInterval = setInterval(processFeed, 5000);
            }
        });
    } else {
        mainLoopInterval = setInterval(processFeed, 5000);
    }
    
    // Listen for navigation changes (SPA)
    let lastUrl = location.href;
    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            if (!checkIfTwitterFeed() && mainLoopInterval) {
                stop();
            } else if (checkIfTwitterFeed() && !mainLoopInterval) {
                start();
            }
        }
    }).observe(document, { subtree: true, childList: true });
    
    console.log('AI Curator started on', window.location.href);
};

const stop = () => {
    if (mainLoopInterval) {
        clearInterval(mainLoopInterval);
        mainLoopInterval = null;
    }
    console.log('AI Curator stopped');
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    try {
        switch (message.type) {
            case 'PING':
                sendResponse({ success: true, ready: true });
                break;
            case 'START':
                start();
                sendResponse({ success: true });
                break;
            case 'STOP':
                stop();
                sendResponse({ success: true });
                break;
            case 'MARK_TWEET':
                if (message.payload?.isUninteresting) {
                    markTweetAsNotInterested(message.payload);
                }
                sendResponse({ success: true });
                break;
            default:
                sendResponse({ success: false, error: 'Unknown message type' });
        }
    } catch (e) {
        console.error('Error handling message in content script:', e);
        sendResponse({ success: false, error: e.message });
    }
    return true;
});

// Add global error handler
window.addEventListener('error', (event) => {
    console.error('AI Curator content script error:', event.error);
});

// Initialize when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('AI Curator content script loaded on', window.location.href);
    });
} else {
    console.log('AI Curator content script loaded on', window.location.href);
}