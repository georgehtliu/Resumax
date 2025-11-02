/**
 * Chrome Storage Service
 * 
 * Wraps Chrome Storage API for resume data persistence
 * Uses Chrome Extensions API: chrome.storage.local
 */

/**
 * Save resume data to Chrome local storage
 * @param {Object} resumeData - Resume object with experiences and bullets
 */
export async function saveResume(resumeData) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ resume: resumeData }, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve();
      }
    });
  });
}

/**
 * Get resume data from Chrome local storage
 * @returns {Promise<Object>} Resume data
 */
export async function getResume() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['resume'], (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(result.resume || { experiences: [], totalBullets: 0 });
      }
    });
  });
}

/**
 * Clear all resume data
 */
export async function clearResume() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.remove(['resume'], () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve();
      }
    });
  });
}

/**
 * Storage service object (for convenience)
 */
export const storageService = {
  saveResume,
  getResume,
  clearResume
};


