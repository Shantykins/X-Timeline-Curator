document.addEventListener('DOMContentLoaded', () => {
    const runToggle = document.getElementById('runToggle');
    const statusText = document.getElementById('status-text');
    const statusIndicator = document.getElementById('status-indicator');
    const interestsTextarea = document.getElementById('interests');
    const saveButton = document.getElementById('save');
    const saveStatus = document.getElementById('save-status');
    const loadingProgressContainer = document.getElementById('loading-progress-container');
    const loadingProgressBar = document.getElementById('loading-progress-bar');
    const loadingProgressLabel = document.getElementById('loading-progress-label');
    const activityToggle = document.getElementById('activity-toggle');
    const activityLog = document.getElementById('activity-log');
    const activityList = document.getElementById('activity-list');
    const tweetsProcessed = document.getElementById('tweets-processed');
    const tweetsHidden = document.getElementById('tweets-hidden');
    const tweetsKept = document.getElementById('tweets-kept');
    const downloadLogButton = document.getElementById('download-log');
    const statusEl = document.getElementById('aiStatus');
    const retryButton = document.getElementById('retryButton');
    
    // Activity tracking state
    let activityVisible = false;
    let stats = { processed: 0, hidden: 0, kept: 0 };

    // Initialize UI state from storage
    const init = async () => {
        const { isRunning, interests, aiStatus } = await chrome.storage.local.get(['isRunning', 'interests', 'aiStatus']);
        
        runToggle.checked = !!isRunning;
        interestsTextarea.value = interests ? interests.join(', ') : '';
        updateStatus(aiStatus || 'stopped', isRunning);
        if (aiStatus === 'loading' && isRunning) {
            showProgress();
        } else {
            hideProgress();
        }
    };

    const updateStatus = (aiStatus, isRunning) => {
        statusIndicator.className = ''; // Clear classes
        if (!isRunning) {
            statusText.textContent = 'Stopped';
            statusIndicator.classList.add('stopped');
            hideProgress();
        } else {
            switch (aiStatus) {
                case 'loading':
                    statusText.textContent = 'AI Loading...';
                    statusIndicator.classList.add('loading');
                    showProgress();
                    break;
                case 'ready':
                    statusText.textContent = 'Running';
                    statusIndicator.classList.add('running');
                    hideProgress();
                    break;
                default:
                    statusText.textContent = 'Stopped';
                    statusIndicator.classList.add('stopped');
                    hideProgress();
                    break;
            }
        }
    };

    function showProgress() {
        loadingProgressContainer.style.display = '';
        loadingProgressBar.style.width = '0%';
        loadingProgressLabel.textContent = 'Loading AI Model...';
    }
    function hideProgress() {
        loadingProgressContainer.style.display = 'none';
        loadingProgressBar.style.width = '0%';
    }
    function setProgress({ file, status, progress }) {
        loadingProgressContainer.style.display = '';
        loadingProgressLabel.textContent = `${status}${file ? ' (' + file + ')' : ''}`;
        if (typeof progress === 'number') {
            loadingProgressBar.style.width = `${Math.round(progress)}%`;
        } else {
            loadingProgressBar.style.width = '0%';
        }
    }
    
    runToggle.addEventListener('change', () => {
        const messageType = runToggle.checked ? 'START_CURATION' : 'STOP_CURATION';
        chrome.runtime.sendMessage({ type: messageType }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('Error sending message:', chrome.runtime.lastError);
                // Revert toggle state on error
                runToggle.checked = !runToggle.checked;
            } else if (response && !response.success) {
                console.error('Message failed:', response.error);
                // Revert toggle state on error
                runToggle.checked = !runToggle.checked;
            }
        });
    });

    saveButton.addEventListener('click', () => {
        try {
            const interests = interestsTextarea.value.split(',')
                .map(s => s.trim().toLowerCase())
                .filter(s => s && s.length > 0); // Filter out empty strings
            
            if (interests.length === 0) {
                saveStatus.textContent = 'Please enter at least one interest.';
                saveStatus.style.color = '#e0245e';
                setTimeout(() => { 
                    saveStatus.textContent = '';
                    saveStatus.style.color = '#17bf63';
                }, 3000);
                return;
            }
            
            chrome.storage.local.set({ interests }, () => {
                if (chrome.runtime.lastError) {
                    console.error('Error saving interests:', chrome.runtime.lastError);
                    saveStatus.textContent = 'Error saving interests!';
                    saveStatus.style.color = '#e0245e';
                } else {
                    saveStatus.textContent = 'Interests saved!';
                    saveStatus.style.color = '#17bf63';
                }
                setTimeout(() => { 
                    saveStatus.textContent = '';
                    saveStatus.style.color = '#17bf63';
                }, 3000);
            });
        } catch (error) {
            console.error('Error processing interests:', error);
            saveStatus.textContent = 'Error processing interests!';
            saveStatus.style.color = '#e0245e';
            setTimeout(() => { 
                saveStatus.textContent = '';
                saveStatus.style.color = '#17bf63';
            }, 3000);
        }
    });

    // Listen for status updates and progress from the background script
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
        try {
            if (!message || !message.type) {
                return;
            }

            // Handle AI status messages
            if (message.type === 'AI_LOAD_PROGRESS') {
                statusEl.textContent = message.payload.status;
                retryButton.style.display = 'none';
            }
            if (message.type === 'AI_READY') {
                statusEl.textContent = '✅ Local model ready';
                retryButton.style.display = 'none';
            }
            if (message.type === 'AI_LOAD_FAILED') {
                statusEl.textContent = `❌ ${message.payload}`;
                retryButton.style.display = 'inline-block';
            }
            
            if (message.type === 'STATUS_UPDATE' && message.payload) {
                updateStatus(message.payload.aiStatus, message.payload.isRunning);
            }
            
            if (message.type === 'AI_LOAD_PROGRESS' && message.payload) {
                setProgress({
                    file: message.payload.file || '',
                    status: message.payload.status || 'Loading...',
                    progress: typeof message.payload.progress === 'number'
                        ? Math.min(100, Math.max(0, message.payload.progress))
                        : 0
                });
            }
            
            if (message.type === 'ACTIVITY_LOG' && message.payload) {
                const { tweetText, decision } = message.payload;
                addActivityEntry(tweetText, decision);
            }
            
            sendResponse({ success: true });
        } catch (error) {
            console.error('Error handling message in popup:', error);
            sendResponse({ success: false, error: error.message });
        }
        return true;
    });

    // Activity log toggle
    activityToggle.addEventListener('click', () => {
        activityVisible = !activityVisible;
        if (activityVisible) {
            activityLog.style.display = 'block';
            activityToggle.textContent = 'Hide';
        } else {
            activityLog.style.display = 'none';
            activityToggle.textContent = 'Show';
        }
    });
    
    // Function to add activity log entry
    const addActivityEntry = (tweetText, decision) => {
        // Remove placeholder if present
        const placeholder = activityList.querySelector('.placeholder');
        if (placeholder) {
            placeholder.remove();
        }
        
        // Create new activity item
        const item = document.createElement('div');
        item.className = `activity-item ${decision === 'hidden' ? 'hidden' : 'kept'}`;
        
        const truncatedText = tweetText.length > 40 ? tweetText.substring(0, 40) + '...' : tweetText;
        
        item.innerHTML = `
            <span class="activity-text" title="${tweetText.replace(/"/g, '&quot;')}">${truncatedText}</span>
            <span class="activity-decision ${decision === 'hidden' ? 'hidden' : 'kept'}">
                ${decision === 'hidden' ? 'HIDDEN' : 'KEPT'}
            </span>
        `;
        
        // Add to top of list
        activityList.insertBefore(item, activityList.firstChild);
        
        // Keep only last 50 entries
        const items = activityList.querySelectorAll('.activity-item:not(.placeholder)');
        if (items.length > 50) {
            items[items.length - 1].remove();
        }
        
        // Update stats
        stats.processed++;
        if (decision === 'hidden') {
            stats.hidden++;
        } else {
            stats.kept++;
        }
        
        updateStats();
    };
    
    // Update statistics display
    const updateStats = () => {
        tweetsProcessed.textContent = `Tweets processed: ${stats.processed}`;
        tweetsHidden.textContent = `Hidden: ${stats.hidden}`;
        tweetsKept.textContent = `Kept: ${stats.kept}`;
    };

    // Download log functionality
    downloadLogButton.addEventListener('click', async () => {
        const originalText = downloadLogButton.textContent;
        
        try {
            // Show loading state
            downloadLogButton.textContent = 'Downloading...';
            downloadLogButton.disabled = true;
            
            const {curationLog = []} = await chrome.storage.local.get('curationLog');
            
            if (!curationLog || curationLog.length === 0) {
                downloadLogButton.textContent = 'No Data';
                downloadLogButton.style.color = '#657786';
                setTimeout(() => {
                    downloadLogButton.textContent = originalText;
                    downloadLogButton.style.color = '';
                    downloadLogButton.disabled = false;
                }, 1500);
                return;
            }
            
            const jsonData = JSON.stringify(curationLog, null, 2);
            const blob = new Blob([jsonData], {type: 'application/json'});
            const filename = `ai-curator-log-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
            
            // Always use the fallback method as it's more reliable in popup context
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            // Clean up the blob URL after a short delay
            setTimeout(() => {
                URL.revokeObjectURL(url);
            }, 1000);
            
            // Show success state
            downloadLogButton.textContent = 'Downloaded!';
            downloadLogButton.style.color = '#17bf63';
            setTimeout(() => {
                downloadLogButton.textContent = originalText;
                downloadLogButton.style.color = '';
                downloadLogButton.disabled = false;
            }, 1500);
            
        } catch (error) {
            console.error('Error downloading log:', error);
            // Show error state
            downloadLogButton.textContent = 'Failed';
            downloadLogButton.style.color = '#e0245e';
            setTimeout(() => {
                downloadLogButton.textContent = originalText;
                downloadLogButton.style.color = '';
                downloadLogButton.disabled = false;
            }, 2000);
        }
    });

    // Retry button functionality
    retryButton.addEventListener('click', () => {
        retryButton.disabled = true;
        retryButton.textContent = 'Retrying...';
        
        chrome.runtime.sendMessage({ type: 'RETRY_AI_LOAD' }, () => {
            setTimeout(() => {
                retryButton.disabled = false;
                retryButton.textContent = 'Retry Download';
            }, 2000);
        });
    });

    init();
}); 