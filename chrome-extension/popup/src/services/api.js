const DEFAULT_API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_RESUMAX_API_URL)
    ? import.meta.env.VITE_RESUMAX_API_URL
    : 'http://localhost:8000/api/v1';

function getApiBaseUrl() {
  try {
    const stored = localStorage.getItem('resumaxApiBaseUrl');
    if (stored && typeof stored === 'string' && stored.trim().length > 0) {
      return stored.trim();
    }
  } catch (error) {
    console.warn('Unable to read stored API base URL:', error);
  }
  return DEFAULT_API_BASE_URL;
}

function ensureBulletId(bullet, index) {
  if (bullet?.id) {
    return bullet.id;
  }
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `bullet-${Date.now()}-${index}`;
}

function normalizeBullets(bullets = []) {
  return bullets
    .filter((bullet) => bullet && typeof bullet.text === 'string' && bullet.text.trim().length > 0)
    .map((bullet, index) => ({
      id: ensureBulletId(bullet, index),
      text: bullet.text.trim(),
    }));
}

function normalizeExperiences(experiences = []) {
  return experiences
    .filter((exp) => exp && (exp.company || exp.role || (exp.bullets && exp.bullets.length > 0)))
    .map((exp) => ({
      id: exp.id || ensureBulletId(exp, 0),
      company: exp.company || '',
      role: exp.role || '',
      startDate: exp.startDate || null,
      endDate: exp.endDate || null,
      bullets: normalizeBullets(exp.bullets),
    }))
    .filter((exp) => exp.bullets.length > 0);
}

function normalizeEducation(education = []) {
  return education
    .filter((edu) => edu && (edu.school || edu.degree || edu.field || (edu.bullets && edu.bullets.length > 0)))
    .map((edu) => ({
      id: edu.id || ensureBulletId(edu, 0),
      school: edu.school || '',
      degree: edu.degree || '',
      field: edu.field || '',
      startDate: edu.startDate || null,
      endDate: edu.endDate || null,
      bullets: normalizeBullets(edu.bullets),
    }))
    .filter((edu) => edu.bullets.length > 0);
}

function normalizeProjects(projects = []) {
  return projects
    .filter((project) => project && (project.name || project.description || (project.bullets && project.bullets.length > 0)))
    .map((project) => ({
      id: project.id || ensureBulletId(project, 0),
      name: project.name || '',
      description: project.description || '',
      technologies: project.technologies || null,
      startDate: project.startDate || null,
      endDate: project.endDate || null,
      bullets: normalizeBullets(project.bullets),
    }))
    .filter((project) => project.bullets.length > 0);
}

function normalizeCustomSections(customSections = []) {
  return customSections
    .filter((section) => section && (section.title || (section.bullets && section.bullets.length > 0)))
    .map((section) => ({
      id: section.id || ensureBulletId(section, 0),
      title: section.title || '',
      subtitle: section.subtitle || null,
      bullets: normalizeBullets(section.bullets),
    }))
    .filter((section) => section.bullets.length > 0);
}

function normalizePersonalInfo(info = {}) {
  if (!info || typeof info !== 'object') {
    return null;
  }

  const normalized = {
    firstName: typeof info.firstName === 'string' ? info.firstName : '',
    lastName: typeof info.lastName === 'string' ? info.lastName : '',
    email: typeof info.email === 'string' ? info.email : '',
    phone: typeof info.phone === 'string' ? info.phone : '',
    linkedin: typeof info.linkedin === 'string' ? info.linkedin : '',
    github: typeof info.github === 'string' ? info.github : ''
  };

  const hasValue = Object.values(normalized).some((value) => value && value.trim().length > 0);
  return hasValue ? normalized : null;
}

function normalizeSkillGroups(skills = []) {
  if (!Array.isArray(skills)) {
    return [];
  }

  return skills
    .map((group, index) => {
      const id = typeof group?.id === 'string' && group.id.length > 0
        ? group.id
        : ensureBulletId(group, index);

      const title = typeof group?.title === 'string' ? group.title : '';
      const normalizedSkills = Array.isArray(group?.skills)
        ? group.skills
            .map((skill) => (typeof skill === 'string' ? skill.trim() : ''))
            .filter(Boolean)
        : [];

      if (!title && normalizedSkills.length === 0) {
        return null;
      }

      return {
        id,
        title,
        skills: normalizedSkills
      };
    })
    .filter(Boolean);
}

export function buildStructuredResume(masterResume = {}) {
  return {
    personalInfo: normalizePersonalInfo(masterResume.personalInfo),
    skills: normalizeSkillGroups(masterResume.skills),
    experiences: normalizeExperiences(masterResume.experiences),
    education: normalizeEducation(masterResume.education),
    projects: normalizeProjects(masterResume.projects),
    customSections: normalizeCustomSections(masterResume.customSections),
  };
}

export async function selectResume({
  jobDescription,
  resume,
  bulletsPerExperience = 3,
  bulletsPerEducation = 2,
  bulletsPerProject = 2,
  bulletsPerCustom = 5,
}) {
  const baseUrl = getApiBaseUrl();
  const requestBody = {
    job_description: jobDescription,
    resume,
    bullets_per_experience: bulletsPerExperience,
    bullets_per_education: bulletsPerEducation,
    bullets_per_project: bulletsPerProject,
    bullets_per_custom: bulletsPerCustom,
  };

  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/select`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    let errorMessage = `Selection request failed with status ${response.status}`;
    try {
      const errorPayload = await response.json();
      if (errorPayload?.detail) {
        errorMessage = Array.isArray(errorPayload.detail)
          ? errorPayload.detail.map((item) => (item.msg ? `${item.msg}` : JSON.stringify(item))).join('\n')
          : (errorPayload.detail.message || errorPayload.detail);
      }
    } catch (parseError) {
      const fallbackText = await response.text();
      if (fallbackText) {
        errorMessage = fallbackText;
      }
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function renderLatex(resume) {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/latex/render`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ resume }),
  });

  if (!response.ok) {
    let errorMessage = `LaTeX render failed with status ${response.status}`;
    try {
      const payload = await response.json();
      if (payload?.detail) {
        errorMessage = Array.isArray(payload.detail)
          ? payload.detail.map((item) => (item.msg ? item.msg : JSON.stringify(item))).join('\n')
          : payload.detail;
      }
    } catch {
      const fallback = await response.text();
      if (fallback) {
        errorMessage = fallback;
      }
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export const apiService = {
  buildStructuredResume,
  selectResume,
  renderLatex,
};


