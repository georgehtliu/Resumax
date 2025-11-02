/**
 * Chrome Messaging Service
 * 
 * Handles communication between popup, background service worker,
 * and content scripts using Chrome Extensions Messaging API
 */

/**
 * Send message to background service worker
 * @param {Object} message - Message object with type and data
 * @returns {Promise<any>} Response from background
 */
export async function sendMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}

/**
 * Extract job description from current tab
 */
export async function extractJobDescription() {
  return sendMessage({ type: 'EXTRACT_JOB_DESCRIPTION' });
}

/**
 * Start Chrome Debugger API for advanced page inspection
 */
export async function startDebugger(tabId) {
  return sendMessage({ type: 'START_DEBUGGER', tabId });
}

/**
 * Stop Chrome Debugger API
 */
export async function stopDebugger() {
  return sendMessage({ type: 'STOP_DEBUGGER' });
}

/**
 * Send message to content script in active tab
 * @param {Object} message - Message to send
 * @returns {Promise<any>} Response from content script
 */
export async function sendMessageToTab(tabId, message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}

/**
 * Get active tab
 */
export async function getActiveTab() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(tabs[0]);
      }
    });
  });
}

/**
 * Messaging service object
 */
export const messagingService = {
  sendMessage,
  extractJobDescription,
  startDebugger,
  stopDebugger,
  sendMessageToTab,
  getActiveTab
};


