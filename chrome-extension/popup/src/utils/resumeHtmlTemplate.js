/**
 * Resume HTML Template - Converts resume data structure to HTML
 * This provides a clean HTML representation for easy text selection and highlighting
 */

function escapeHtml(text = '') {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function buildHeadingHtml(personalInfo) {
  const info = personalInfo || {};
  const name = [info.firstName, info.lastName].filter(Boolean).join(' ') || 'Candidate Name';

  const contactParts = [];
  if (info.phone) contactParts.push(`<span>${escapeHtml(info.phone)}</span>`);
  if (info.email) contactParts.push(`<a href="mailto:${escapeHtml(info.email)}">${escapeHtml(info.email)}</a>`);
  if (info.linkedin) contactParts.push(`<a href="${escapeHtml(info.linkedin)}" target="_blank">${escapeHtml(info.linkedin)}</a>`);
  if (info.github) contactParts.push(`<a href="${escapeHtml(info.github)}" target="_blank">${escapeHtml(info.github)}</a>`);

  const contactLine = contactParts.join(' <span class="separator">|</span> ');

  return `
    <div class="resume-heading">
      <h1 class="resume-name">${escapeHtml(name)}</h1>
      <div class="resume-contact">${contactLine}</div>
    </div>
  `;
}

function buildEducationSectionHtml(entries = []) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return '';
  }

  const sectionBody = entries.map((entry) => {
    const endDate = entry.endDate ? escapeHtml(entry.endDate) : '';
    const gradLine = endDate ? `Expected Graduation: ${endDate}` : '';
    const degreeText = escapeHtml(entry.degree || '');
    const fieldText = entry.field ? escapeHtml(entry.field) : '';
    const degreeLine = degreeText && fieldText ? `${degreeText}, ${fieldText}` : (degreeText || fieldText);
    
    const bullets = (entry.selectedBullets || entry.bullets || [])
      .map((bullet) => `        <li class="resume-item">${escapeHtml(bullet.text || '')}</li>`)
      .join('\n');
    
    const list = bullets ? `\n      <ul class="resume-item-list">\n${bullets}\n      </ul>` : '';

    return `    <div class="resume-subheading">
      <div class="resume-subheading-header">
        <div class="resume-subheading-left">
          <strong>${escapeHtml(entry.school || '')}</strong>
        </div>
        <div class="resume-subheading-right">
          ${gradLine}
        </div>
      </div>
      <div class="resume-subheading-subheader">
        <div class="resume-subheading-left">
          <em>${degreeLine}</em>
        </div>
        <div class="resume-subheading-right"></div>
      </div>${list}
    </div>`;
  }).join('\n\n');

  return `<section class="resume-section">
    <h2 class="resume-section-title">Education</h2>
    <ul class="resume-subheading-list">
${sectionBody}
    </ul>
  </section>`;
}

function buildExperienceSectionHtml(entries = []) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return '';
  }

  const sectionBody = entries.map((entry) => {
    const start = entry.startDate ? escapeHtml(entry.startDate) : '';
    const end = entry.endDate ? escapeHtml(entry.endDate) : 'Present';
    const dateRange = start ? `${start} – ${end}` : end;
    const location = escapeHtml(entry.location || '');
    
    const bullets = (entry.selectedBullets || [])
      .map((bullet) => `        <li class="resume-item">${escapeHtml(bullet.text || '')}</li>`)
      .join('\n');
    
    const list = bullets ? `\n      <ul class="resume-item-list">\n${bullets}\n      </ul>` : '';

    return `    <div class="resume-subheading">
      <div class="resume-subheading-header">
        <div class="resume-subheading-left">
          <strong>${escapeHtml(entry.company || '')}</strong>
        </div>
        <div class="resume-subheading-right">
          ${dateRange}
        </div>
      </div>
      <div class="resume-subheading-subheader">
        <div class="resume-subheading-left">
          <em>${escapeHtml(entry.role || '')}</em>
        </div>
        <div class="resume-subheading-right">
          ${location}
        </div>
      </div>${list}
    </div>`;
  }).join('\n\n');

  return `<section class="resume-section">
    <h2 class="resume-section-title">EXPERIENCE</h2>
    <ul class="resume-subheading-list">
${sectionBody}
    </ul>
  </section>`;
}

function buildProjectsSectionHtml(entries = []) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return '';
  }

  const sectionBody = entries.map((entry) => {
    const heading = entry.url
      ? `<a href="${escapeHtml(entry.url)}" target="_blank"><strong>${escapeHtml(entry.name || '')}</strong></a>`
      : `<strong>${escapeHtml(entry.name || '')}</strong>`;
    const tech = entry.technologies ? ` <span class="separator">|</span> <em>${escapeHtml(entry.technologies)}</em>` : '';
    
    const bullets = (entry.selectedBullets || [])
      .map((bullet) => `        <li class="resume-item">${escapeHtml(bullet.text || '')}</li>`)
      .join('\n');
    
    const list = bullets ? `\n      <ul class="resume-item-list">\n${bullets}\n      </ul>` : '';

    return `    <div class="resume-project-heading">
      <div class="resume-subheading-header">
        <div class="resume-subheading-left">
          ${heading}${tech}
        </div>
        <div class="resume-subheading-right"></div>
      </div>${list}
    </div>`;
  }).join('\n\n');

  return `<section class="resume-section">
    <h2 class="resume-section-title">PROJECTS</h2>
    <ul class="resume-subheading-list">
${sectionBody}
    </ul>
  </section>`;
}

function buildSkillsSectionHtml(skillGroups = []) {
  if (!Array.isArray(skillGroups) || skillGroups.length === 0) {
    return '';
  }

  const lines = skillGroups
    .filter((group) => group && (group.title || (group.skills && group.skills.length)))
    .map((group) => `<strong>${escapeHtml(group.title || 'Skills')}</strong>: ${escapeHtml((group.skills || []).join(', '))}`);

  if (lines.length === 0) {
    return '';
  }

  const body = lines.join('<br>');

  return `<section class="resume-section">
    <h2 class="resume-section-title">SKILLS</h2>
    <ul class="resume-item-list skills-list">
      <li class="resume-item">
        ${body}
      </li>
    </ul>
  </section>`;
}

function buildCustomSectionsHtml(sections = []) {
  if (!Array.isArray(sections) || sections.length === 0) {
    return '';
  }

  return sections.map((section) => {
    const header = escapeHtml(section.title || 'Additional');
    const bullets = (section.selectedBullets || [])
      .map((bullet) => `        <li class="resume-item">${escapeHtml(bullet.text || '')}</li>`)
      .join('\n');
    
    if (!bullets) {
      return '';
    }

    return `<section class="resume-section">
    <h2 class="resume-section-title">${header}</h2>
    <ul class="resume-item-list">
${bullets}
    </ul>
  </section>`;
  }).join('\n');
}

export function buildResumeHtml(resume) {
  const structured = resume || {};

  const parts = [
    buildHeadingHtml(structured.personalInfo),
    buildEducationSectionHtml(structured.education),
    buildExperienceSectionHtml(structured.experiences),
    buildProjectsSectionHtml(structured.projects),
    buildSkillsSectionHtml(structured.skills),
    buildCustomSectionsHtml(structured.customSections)
  ].filter(Boolean);

  return parts.join('\n');
}



