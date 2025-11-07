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
function normalizePersonalInfo(info) {
  const normalized = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    linkedin: '',
    github: ''
  };

  if (!info || typeof info !== 'object') {
    return normalized;
  }

  return {
    firstName: typeof info.firstName === 'string' ? info.firstName : '',
    lastName: typeof info.lastName === 'string' ? info.lastName : '',
    email: typeof info.email === 'string' ? info.email : '',
    phone: typeof info.phone === 'string' ? info.phone : '',
    linkedin: typeof info.linkedin === 'string' ? info.linkedin : '',
    github: typeof info.github === 'string' ? info.github : ''
  };
}

function normalizeSkills(skills = []) {
  if (!Array.isArray(skills)) {
    return [];
  }

  return skills
    .filter(group => group && (group.title || (group.skills && group.skills.length)))
    .map((group, index) => {
      const normalizedSkills = Array.isArray(group.skills)
        ? group.skills
            .map((skill) => (typeof skill === 'string' ? skill.trim() : ''))
            .filter(Boolean)
        : [];

      return {
        id: typeof group.id === 'string' && group.id.length > 0 ? group.id : `skill-${Date.now()}-${index}`,
        title: typeof group.title === 'string' ? group.title : '',
        skills: normalizedSkills
      };
    });
}

function normalizeResume(resumeData) {
  if (!resumeData) {
    return {
      personalInfo: normalizePersonalInfo(),
      skills: [],
      experiences: [],
      education: [],
      projects: [],
      customSections: [],
      totalBullets: 0
    };
  }

  // Ensure all arrays exist and are arrays
  return {
    personalInfo: normalizePersonalInfo(resumeData.personalInfo),
    skills: normalizeSkills(resumeData.skills),
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
 * Save a generated resume with a name
 * @param {string} name - Name for the resume
 * @param {Object} resumeData - Resume data to save
 */
export async function saveGeneratedResume(name, resumeData, createdAt = null) {
  return new Promise((resolve, reject) => {
    getSavedResumes().then(savedResumes => {
      const newResume = {
        id: `resume-${Date.now()}`,
        name: name || `Resume ${new Date().toLocaleDateString()}`,
        data: resumeData,
        createdAt: createdAt || Date.now(),
        updatedAt: createdAt || Date.now()
      };
      
      const updated = [newResume, ...savedResumes];
      chrome.storage.local.set({ savedResumes: updated }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(newResume);
        }
      });
    }).catch(reject);
  });
}

/**
 * Get all saved resumes
 * @returns {Promise<Array>} Array of saved resumes
 */
export async function getSavedResumes() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['savedResumes'], (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        const saved = Array.isArray(result.savedResumes) ? result.savedResumes : [];
        // Sort by createdAt (newest first)
        saved.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        resolve(saved);
      }
    });
  });
}

/**
 * Delete a saved resume
 * @param {string} resumeId - ID of resume to delete
 */
export async function deleteSavedResume(resumeId) {
  return new Promise((resolve, reject) => {
    getSavedResumes().then(savedResumes => {
      const updated = savedResumes.filter(r => r.id !== resumeId);
      chrome.storage.local.set({ savedResumes: updated }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    }).catch(reject);
  });
}

/**
 * Get a specific saved resume by ID
 * @param {string} resumeId - ID of resume to get
 */
export async function getSavedResume(resumeId) {
  return new Promise((resolve, reject) => {
    getSavedResumes().then(savedResumes => {
      const resume = savedResumes.find(r => r.id === resumeId);
      resolve(resume || null);
    }).catch(reject);
  });
}

/**
 * Storage service object (for convenience)
 */
export const storageService = {
  saveResume,
  getResume,
  clearResume,
  saveGeneratedResume,
  getSavedResumes,
  deleteSavedResume,
  getSavedResume
};


