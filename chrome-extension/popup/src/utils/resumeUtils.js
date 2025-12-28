// Utility functions for working with resume data

export function findBulletText(resume, bulletId) {
  if (!resume?.resume_data) return '';
  const data = resume.resume_data;
  
  // Search through all sections
  const sections = [
    ...(data.experiences || []),
    ...(data.education || []),
    ...(data.projects || []),
    ...(data.customSections || [])
  ];
  
  for (const entry of sections) {
    const bullets = entry.selectedBullets || entry.bullets || [];
    for (let idx = 0; idx < bullets.length; idx++) {
      const bullet = bullets[idx];
      const id = bullet.id || `${entry.id}-bullet-${idx}`;
      if (id === bulletId) {
        return typeof bullet === 'string' ? bullet : (bullet.text || bullet.rewritten || '');
      }
    }
  }
  return '';
}

export function findBulletContext(resume, bulletId) {
  if (!resume?.resume_data) return { sectionType: null, entryId: null };
  const data = resume.resume_data;
  
  // Search through experiences
  for (const entry of (data.experiences || [])) {
    const bullets = entry.selectedBullets || entry.bullets || [];
    for (let idx = 0; idx < bullets.length; idx++) {
      const bullet = bullets[idx];
      const id = bullet.id || `${entry.id}-bullet-${idx}`;
      if (id === bulletId) {
        return { sectionType: 'experience', entryId: entry.id };
      }
    }
  }
  
  // Search through education
  for (const entry of (data.education || [])) {
    const bullets = entry.selectedBullets || entry.bullets || [];
    for (let idx = 0; idx < bullets.length; idx++) {
      const bullet = bullets[idx];
      const id = bullet.id || `${entry.id}-bullet-${idx}`;
      if (id === bulletId) {
        return { sectionType: 'education', entryId: entry.id };
      }
    }
  }
  
  // Search through projects
  for (const entry of (data.projects || [])) {
    const bullets = entry.selectedBullets || entry.bullets || [];
    for (let idx = 0; idx < bullets.length; idx++) {
      const bullet = bullets[idx];
      const id = bullet.id || `${entry.id}-bullet-${idx}`;
      if (id === bulletId) {
        return { sectionType: 'project', entryId: entry.id };
      }
    }
  }
  
  return { sectionType: null, entryId: null };
}


