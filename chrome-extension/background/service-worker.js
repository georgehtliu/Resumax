/**
 * Background Service Worker
 * 
 * Handles:
 * - Message passing between popup, content scripts, and backend
 * - Chrome Debugger API for advanced page inspection
 * - Resume data synchronization
 * - Job description extraction coordination
 */

// ============================================================================
// CHROME EXTENSIONS API USAGE
// ============================================================================

/**
 * Initialize extension on install
 */
chrome.runtime.onInstalled.addListener((details) => {
  console.log('AI Resume Optimizer installed', details);
  
  // Initialize default storage
  chrome.storage.local.set({
    resume: {
      experiences: [],
      totalBullets: 0
    },
    settings: {
      version: '1.0.0'
    }
  });
});

/**
 * Handle messages from popup and content scripts
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);
  
  switch (message.type) {
    case 'EXTRACT_JOB_DESCRIPTION':
      handleExtractJobDescription(message.url, sendResponse);
      return true; // Keep channel open for async response
      
    case 'SAVE_RESUME_DATA':
      handleSaveResumeData(message.data, sendResponse);
      return true;
      
    case 'GET_RESUME_DATA':
      handleGetResumeData(sendResponse);
      return true;
      
    case 'START_DEBUGGER':
      handleStartDebugger(sender.tab.id, sendResponse);
      return true;
      
    case 'STOP_DEBUGGER':
      handleStopDebugger(sendResponse);
      return true;
      
    default:
      sendResponse({ error: 'Unknown message type' });
  }
});

// ============================================================================
// JOB DESCRIPTION EXTRACTION
// ============================================================================

/**
 * Extract job description from current tab
 * Uses content script injection + Chrome Debugger API as fallback
 */
async function handleExtractJobDescription(url, sendResponse) {
  try {
    // Get active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) {
      sendResponse({ error: 'No active tab found' });
      return;
    }
    
    // Try content script extraction first (lightweight)
    chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_JD' }, (response) => {
      if (response && response.success) {
        sendResponse({ 
          success: true, 
          jobDescription: response.jobDescription,
          source: 'content-script'
        });
      } else {
        // Fallback to Debugger API for complex pages
        extractWithDebugger(tab.id, sendResponse);
      }
    });
    
  } catch (error) {
    console.error('Error extracting job description:', error);
    sendResponse({ error: error.message });
  }
}

/**
 * Use Chrome Debugger API to extract job description
 * More powerful but requires user permission
 */
async function extractWithDebugger(tabId, sendResponse) {
  try {
    // Attach debugger to tab
    await chrome.debugger.attach({ tabId }, '1.0');
    
    // Execute JavaScript to extract job description
    // Debugger API allows us to evaluate JS in page context
    chrome.debugger.sendCommand(
      { tabId },
      'Runtime.evaluate',
      {
        expression: `
          (function() {
            // Try common job description selectors
            const selectors = [
              '[data-job-description]',
              '.job-description',
              '#job-description',
              '[class*="description"]',
              'section[aria-label*="description"]'
            ];
            
            for (const selector of selectors) {
              const element = document.querySelector(selector);
              if (element && element.textContent.trim().length > 100) {
                return element.textContent.trim();
              }
            }
            
            // Fallback: look for large text blocks
            const allText = document.body.innerText;
            const paragraphs = allText.split('\\n\\n').filter(p => p.length > 200);
            return paragraphs.join('\\n\\n').substring(0, 5000);
          })()
        `
      },
      (result) => {
        chrome.debugger.detach({ tabId });
        
        if (result.result && result.result.value) {
          sendResponse({
            success: true,
            jobDescription: result.result.value,
            source: 'debugger-api'
          });
        } else {
          sendResponse({ error: 'Could not extract job description' });
        }
      }
    );
    
  } catch (error) {
    console.error('Debugger API error:', error);
    sendResponse({ error: error.message });
  }
}

// ============================================================================
// RESUME DATA MANAGEMENT (Chrome Storage API)
// ============================================================================

/**
 * Save resume data to Chrome local storage
 */
async function handleSaveResumeData(data, sendResponse) {
  try {
    await chrome.storage.local.set({ resume: data });
    sendResponse({ success: true });
  } catch (error) {
    console.error('Error saving resume data:', error);
    sendResponse({ error: error.message });
  }
}

/**
 * Get resume data from Chrome local storage
 */
async function handleGetResumeData(sendResponse) {
  try {
    const result = await chrome.storage.local.get(['resume']);
    sendResponse({ 
      success: true, 
      data: result.resume || { experiences: [], totalBullets: 0 }
    });
  } catch (error) {
    console.error('Error getting resume data:', error);
    sendResponse({ error: error.message });
  }
}

// ============================================================================
// CHROME DEBUGGER API (Advanced Usage)
// ============================================================================

let debuggerAttached = false;
let debuggerTabId = null;

/**
 * Start Chrome Debugger API for advanced page inspection
 * Useful for complex SPAs that dynamically load content
 */
async function handleStartDebugger(tabId, sendResponse) {
  try {
    if (debuggerAttached) {
      sendResponse({ error: 'Debugger already attached' });
      return;
    }
    
    await chrome.debugger.attach({ tabId }, '1.0');
    debuggerAttached = true;
    debuggerTabId = tabId;
    
    // Listen for debugger events (network, DOM, etc.)
    chrome.debugger.onEvent.addListener((source, method, params) => {
      console.log('Debugger event:', method, params);
      
      // You can intercept network requests, DOM changes, etc.
      if (method === 'Network.responseReceived') {
        // Could extract job description from network responses
      }
    });
    
    sendResponse({ success: true });
    
  } catch (error) {
    console.error('Error starting debugger:', error);
    sendResponse({ error: error.message });
  }
}

/**
 * Stop Chrome Debugger API
 */
async function handleStopDebugger(sendResponse) {
  try {
    if (!debuggerAttached || !debuggerTabId) {
      sendResponse({ error: 'Debugger not attached' });
      return;
    }
    
    await chrome.debugger.detach({ tabId: debuggerTabId });
    debuggerAttached = false;
    debuggerTabId = null;
    
    sendResponse({ success: true });
    
  } catch (error) {
    console.error('Error stopping debugger:', error);
    sendResponse({ error: error.message });
  }
}

// Cleanup on extension unload
chrome.runtime.onSuspend.addListener(() => {
  if (debuggerAttached && debuggerTabId) {
    chrome.debugger.detach({ tabId: debuggerTabId });
  }
});


