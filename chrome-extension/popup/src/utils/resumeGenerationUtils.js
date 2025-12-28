/**
 * Utility functions for resume generation and optimization
 */

export const LINE_BUDGET = 42;

/**
 * Flatten selected resume into a list of bullets with metadata
 */
export function flattenSelectedResume(selectedResume) {
  if (!selectedResume) {
    return [];
  }

  const resultBullets = [];

  // Optimized: use flatMap for better performance
  const appendBullets = (items = [], sectionType) => {
    if (!Array.isArray(items) || items.length === 0) {
      return;
    }
    
    for (const item of items) {
      const bulletList = Array.isArray(item.selectedBullets) && item.selectedBullets.length > 0
        ? item.selectedBullets
        : Array.isArray(item.bullets)
          ? item.bullets
          : [];

      if (bulletList.length === 0) {
        continue;
      }

      // Pre-compute common values to avoid repeated lookups
      const parentTitle = item.company || item.school || item.name || item.title || '';
      const parentRole = item.role || item.degree || item.subtitle || '';
      
      for (const bullet of bulletList) {
        resultBullets.push({
          ...bullet,
          sectionType,
          parentId: item.id,
          parentTitle,
          parentRole,
        });
      }
    }
  };

  appendBullets(selectedResume.experiences, 'experience');
  appendBullets(selectedResume.education, 'education');
  appendBullets(selectedResume.projects, 'project');
  appendBullets(selectedResume.customSections, 'custom');

  return resultBullets;
}

/**
 * Estimate number of lines a bullet point will take
 */
export function estimateBulletLines(text = '') {
  const effectiveLength = (text?.length || 0) + 2;
  const lines = Math.max(1, Math.ceil(effectiveLength / 110));
  return Math.min(lines, 3);
}

/**
 * Estimate total lines for a section of entries
 */
export function estimateEntryLines(entries = [], cap = 0, headingLines = 2) {
  if (!cap || cap <= 0 || !Array.isArray(entries) || entries.length === 0) {
    return 0;
  }

  let total = 0;

  entries.forEach((entry) => {
    const bulletLines = (entry.bullets || [])
      .map((bullet) => estimateBulletLines(bullet.text))
      .sort((a, b) => b - a);

    const limit = Math.min(cap, bulletLines.length);
    if (limit > 0) {
      total += headingLines;
      for (let i = 0; i < limit; i += 1) {
        total += bulletLines[i];
      }
    }
  });

  return total;
}

/**
 * Estimate lines for skills section
 */
export function estimateSkillsLines(skillGroups = []) {
  if (!Array.isArray(skillGroups) || skillGroups.length === 0) {
    return 0;
  }

  let total = 2; // section header + spacing
  skillGroups.forEach((group) => {
    const text = (group.skills || []).join(', ');
    total += Math.max(1, Math.ceil((text.length || 0) / 110));
  });
  return total;
}

/**
 * Estimate lines for personal info section
 */
export function estimatePersonalInfoLines(personalInfo) {
  if (!personalInfo) {
    return 2; // minimal heading even if blank
  }
  return 3;
}

/**
 * Estimate total lines for entire resume
 */
export function estimateTotalLines(resume, caps) {
  if (!resume) return 0;

  let total = 0;
  total += estimatePersonalInfoLines(resume.personalInfo);
  total += estimateSkillsLines(resume.skills);
  total += estimateEntryLines(resume.experiences, caps.experience, 2);
  total += estimateEntryLines(resume.projects, caps.project, 2);
  total += estimateEntryLines(resume.education, caps.education, 2);
  total += estimateEntryLines(resume.customSections, caps.custom, 2);
  return total;
}

/**
 * Apply section priorities to optimize resume layout
 */
export function applySectionPriorities(resume) {
  if (!resume) {
    return resume;
  }

  const projects = Array.isArray(resume.projects) ? [...resume.projects] : [];
  const experiences = Array.isArray(resume.experiences) ? resume.experiences : [];

  if (projects.length > 0) {
    const experienceLines = estimateEntryLines(experiences, 4, 2);
    const desiredProjectEntries = experienceLines > (LINE_BUDGET * 0.5) || experiences.length >= 3
      ? 1
      : Math.min(2, projects.length);

    if (projects.length > desiredProjectEntries) {
      const rankedProjects = [...projects].sort((a, b) => {
        const aBullets = Array.isArray(a?.bullets) ? a.bullets.length : 0;
        const bBullets = Array.isArray(b?.bullets) ? b.bullets.length : 0;
        return bBullets - aBullets;
      });
      resume.projects = rankedProjects.slice(0, desiredProjectEntries);
    }
  }

  return resume;
}

/**
 * Compute section caps (max bullets per section) based on resume content
 */
export function computeSectionCaps(resume) {
  const experiences = resume.experiences || [];
  const education = resume.education || [];
  const projects = resume.projects || [];
  const custom = resume.customSections || [];

  const getMaxAvailable = (entries) => Math.max(
    0,
    ...entries.map((entry) => Array.isArray(entry?.bullets) ? entry.bullets.length : 0),
  );

  const projectBaseFloor = projects.length <= 1 ? 1 : 2;

  const caps = {
    experience: experiences.length === 0 ? 0 : Math.min(4, Math.max(3, getMaxAvailable(experiences))),
    education: education.length === 0 ? 0 : Math.min(2, Math.max(1, getMaxAvailable(education))),
    project: projects.length === 0 ? 0 : Math.min(3, Math.max(projectBaseFloor, getMaxAvailable(projects))),
    custom: custom.length === 0 ? 0 : Math.min(2, Math.max(1, getMaxAvailable(custom))),
  };

  const minCaps = {
    experience: experiences.length === 0 ? 0 : Math.min(2, Math.max(1, getMaxAvailable(experiences))),
    education: education.length === 0 ? 0 : Math.max(1, Math.min(2, getMaxAvailable(education) || 1)),
    project: projects.length === 0 ? 0 : 1,
    custom: 0,
  };

  Object.keys(caps).forEach((key) => {
    if (caps[key] < minCaps[key]) {
      caps[key] = minCaps[key];
    }
  });

  const reductionOrder = ['custom', 'education', 'project', 'experience'];

  let estimated = estimateTotalLines(resume, caps);
  let iterations = 0;
  const maxIterations = 20; // Safety limit to prevent infinite loops
  
  while (estimated > LINE_BUDGET && iterations < maxIterations) {
    iterations++;
    let reduced = false;
    for (const key of reductionOrder) {
      if (caps[key] > minCaps[key]) {
        caps[key] -= 1;
        reduced = true;
        break;
      }
    }
    if (!reduced) {
      break;
    }
    estimated = estimateTotalLines(resume, caps);
  }

  return caps;
}

/**
 * Clone and normalize structured resume data
 */
export function cloneStructuredResume(resume) {
  const base = {
    personalInfo: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      linkedin: '',
      github: ''
    },
    skills: [],
    experiences: [],
    education: [],
    projects: [],
    customSections: []
  };

  if (!resume) {
    return base;
  }

  try {
    // Use structuredClone if available (faster than JSON parse/stringify)
    // Fallback to JSON for older browsers
    let cloned;
    if (typeof structuredClone !== 'undefined') {
      cloned = structuredClone(resume);
    } else {
      cloned = JSON.parse(JSON.stringify(resume));
    }

    const normalizeBullet = (bullet, prefix, index) => {
      if (!bullet || typeof bullet !== 'object') {
        return {
          id: `${prefix}-${index}`,
          text: typeof bullet === 'string' ? bullet : '',
          original: typeof bullet === 'string' ? bullet : ''
        };
      }

      const baseText = typeof bullet.text === 'string' && bullet.text.trim().length > 0
        ? bullet.text
        : typeof bullet.rewritten === 'string'
          ? bullet.rewritten
          : '';

      return {
        ...bullet,
        id: bullet.id || `${prefix}-${index}`,
        text: baseText,
        original: bullet.original || baseText || bullet.text || ''
      };
    };

    const normalizeSection = (entries, sectionPrefix) => {
      if (!Array.isArray(entries)) {
        return [];
      }

      // Use a single timestamp for all entries in this section to avoid repeated Date.now() calls
      const timestamp = Date.now();

      return entries.map((entry, entryIndex) => {
        const entryId = entry.id || `${sectionPrefix}-${entryIndex}-${timestamp}`;
        const candidateBullets = Array.isArray(entry.bullets) && entry.bullets.length > 0
          ? entry.bullets
          : Array.isArray(entry.selectedBullets)
            ? entry.selectedBullets
            : [];

        // Only normalize bullets once, reuse for selectedBullets if needed
        const normalizedBullets = candidateBullets.map((bullet, bulletIndex) =>
          normalizeBullet(bullet, `${entryId}-bullet`, bulletIndex)
        );

        const selectedBullets = Array.isArray(entry.selectedBullets) && entry.selectedBullets.length > 0
          ? entry.selectedBullets.map((bullet, bulletIndex) =>
              normalizeBullet(bullet, `${entryId}-selected`, bulletIndex)
            )
          : normalizedBullets;

        return {
          ...entry,
          id: entryId,
          bullets: normalizedBullets,
          selectedBullets
        };
      });
    };

    return {
      ...base,
      ...cloned,
      personalInfo: {
        ...base.personalInfo,
        ...(cloned.personalInfo || {})
      },
      skills: Array.isArray(cloned.skills) ? cloned.skills : [],
      experiences: normalizeSection(cloned.experiences, 'experience'),
      education: normalizeSection(cloned.education, 'education'),
      projects: normalizeSection(cloned.projects, 'project'),
      customSections: normalizeSection(cloned.customSections, 'custom')
    };
  } catch (error) {
    console.warn('Unable to clone resume structure, returning original reference.', error);
    return {
      ...base,
      ...resume
    };
  }
}


