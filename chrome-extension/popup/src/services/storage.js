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
 * Normalize resume data to ensure all required fields exist
 * @param {Object} resumeData - Resume data from storage
 * @returns {Object} Normalized resume data
 */
function normalizeResume(resumeData) {
  if (!resumeData) {
    return {
      experiences: [],
      education: [],
      projects: [],
      customSections: [],
      totalBullets: 0
    };
  }

  // Ensure all arrays exist and are arrays
  return {
    experiences: Array.isArray(resumeData.experiences) ? resumeData.experiences : [],
    education: Array.isArray(resumeData.education) ? resumeData.education : [],
    projects: Array.isArray(resumeData.projects) ? resumeData.projects : [],
    customSections: Array.isArray(resumeData.customSections) ? resumeData.customSections : [],
    totalBullets: typeof resumeData.totalBullets === 'number' ? resumeData.totalBullets : 0
  };
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
        resolve(normalizeResume(result.resume));
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


