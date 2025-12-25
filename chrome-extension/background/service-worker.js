/**
 * Background Service Worker
 * 
 * Handles:
 * - Message passing between popup, content scripts, and backend
 * - Chrome Debugger API for advanced page inspection
 * - Resume data synchronization
 * - Job description extraction coordination
 * - OAuth flow handling
 */

// ============================================================================
// CHROME EXTENSIONS API USAGE
// ============================================================================

/**
 * Initialize extension on install
 */
chrome.runtime.onInstalled.addListener((details) => {
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
  if (!message) {
    sendResponse({ error: 'Message is null or undefined' });
    return false;
  }
  
  if (!message.type) {
    sendResponse({ error: 'Message missing type field' });
    return false;
  }
  
  // Normalize message type (remove any whitespace)
  const messageType = String(message.type).trim();
  
  switch (messageType) {
    case 'LAUNCH_OAUTH':
      if (!message.oauthUrl) {
        sendResponse({ success: false, error: 'Missing oauthUrl' });
        return false;
      }
      
      // Handle OAuth flow in background script (persists longer than popup)
      launchOAuthFlow(message.oauthUrl, message.redirectUrl)
        .then(({ accessToken, refreshToken }) => {
          const response = { success: true, accessToken, refreshToken };
          sendResponse(response);
          // Also broadcast to any listening popups
          chrome.runtime.sendMessage({
            type: 'OAUTH_CALLBACK',
            accessToken,
            refreshToken
          }).catch(() => {}); // Ignore if no listeners
        })
        .catch((error) => {
          const response = { success: false, error: error.message };
          sendResponse(response);
          // Also broadcast error
          chrome.runtime.sendMessage({
            type: 'OAUTH_CALLBACK_ERROR',
            error: error.message
          }).catch(() => {}); // Ignore if no listeners
        });
      return true; // Keep channel open for async response
      
    case 'OAUTH_SUCCESS':
      // Forward OAuth success to popup
      chrome.runtime.sendMessage({
        type: 'OAUTH_CALLBACK',
        accessToken: message.accessToken,
        refreshToken: message.refreshToken
      }).catch(() => {}); // Ignore if no listeners
      sendResponse({ success: true });
      return false;
      
    case 'OAUTH_ERROR':
      // Forward OAuth error to popup
      chrome.runtime.sendMessage({
        type: 'OAUTH_CALLBACK_ERROR',
        error: message.error
      }).catch(() => {}); // Ignore if no listeners
      sendResponse({ success: true });
      return false;
      
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
      sendResponse({ error: `Unknown message type: "${messageType}"` });
  }
});

// ============================================================================
// OAUTH HANDLING
// ============================================================================

/**
 * Launch OAuth flow and handle callback
 * Background script handles OAuth to persist even if popup closes
 */
async function launchOAuthFlow(oauthUrl, redirectUrl) {
  return new Promise((resolve, reject) => {
    if (!chrome.identity) {
      reject(new Error('chrome.identity is not available. Check manifest permissions.'));
      return;
    }
    
    chrome.identity.launchWebAuthFlow({
      url: oauthUrl,
      interactive: true
    }, async (callbackUrl) => {
      if (chrome.runtime.lastError) {
        const errorMsg = chrome.runtime.lastError.message;
        
        if (errorMsg.includes('canceled') || errorMsg.includes('The user did not approve')) {
          reject(new Error('User cancelled'));
          return;
        }
        
        reject(new Error(errorMsg));
        return;
      }
      
      if (callbackUrl) {
        try {
          const url = new URL(callbackUrl);
          let accessToken = null;
          let refreshToken = null;
          
          // Try hash first
          if (url.hash) {
            const hash = url.hash.substring(1);
            const hashParams = new URLSearchParams(hash);
            accessToken = hashParams.get('access_token');
            refreshToken = hashParams.get('refresh_token');
          }
          
          // Try query params
          if (!accessToken && url.searchParams) {
            accessToken = url.searchParams.get('access_token');
            refreshToken = url.searchParams.get('refresh_token');
          }
          
          if (accessToken) {
            resolve({ accessToken, refreshToken });
          } else {
            reject(new Error('No access token in callback URL'));
          }
        } catch (parseError) {
          reject(parseError);
        }
      } else {
        reject(new Error('No callback URL'));
      }
    });
  });
}

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
      // You can intercept network requests, DOM changes, etc.
      if (method === 'Network.responseReceived') {
        // Could extract job description from network responses
      }
    });
    
    sendResponse({ success: true });
    
  } catch (error) {
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
    sendResponse({ error: error.message });
  }
}

// Cleanup on extension unload
chrome.runtime.onSuspend.addListener(() => {
  if (debuggerAttached && debuggerTabId) {
    chrome.debugger.detach({ tabId: debuggerTabId });
  }
});
