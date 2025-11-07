import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { getLineCountInfo } from '../utils/latexLineCount';
import PersonalInfoEditor from './PersonalInfoEditor';
import SkillsEditor from './SkillsEditor';
import './SelectedResumeEditor.css';

const DEFAULT_PERSONAL_INFO = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  linkedin: '',
  github: ''
};

const SECTION_CONFIG = [
  {
    key: 'experiences',
    title: 'Work Experience',
    emptyMessage: 'No experiences selected. Add a role to include relevant achievements.',
    fields: [
      { name: 'company', label: 'Company', placeholder: 'e.g., Google' },
      { name: 'role', label: 'Role', placeholder: 'e.g., Software Engineer' },
      { name: 'startDate', label: 'Start Date', placeholder: 'e.g., Jun 2022' },
      { name: 'endDate', label: 'End Date', placeholder: 'e.g., Present' }
    ],
    bulletLabel: 'Experience Bullet'
  },
  {
    key: 'education',
    title: 'Education',
    emptyMessage: 'No education entries selected. Add a degree to highlight your background.',
    fields: [
      { name: 'school', label: 'School', placeholder: 'e.g., Stanford University' },
      { name: 'degree', label: 'Degree', placeholder: 'e.g., B.S.' },
      { name: 'field', label: 'Field', placeholder: 'e.g., Computer Science' },
      { name: 'startDate', label: 'Start Date', placeholder: 'e.g., Sep 2018' },
      { name: 'endDate', label: 'End Date', placeholder: 'e.g., Jun 2022' }
    ],
    bulletLabel: 'Education Bullet'
  },
  {
    key: 'projects',
    title: 'Projects',
    emptyMessage: 'No projects selected. Showcase a project that aligns with the role.',
    fields: [
      { name: 'name', label: 'Project Name', placeholder: 'e.g., Distributed Task Scheduler' },
      { name: 'description', label: 'Summary', placeholder: 'Short project summary', multiline: true },
      { name: 'technologies', label: 'Technologies', placeholder: 'e.g., Go, Kubernetes' },
      { name: 'startDate', label: 'Start Date', placeholder: 'e.g., Jan 2022' },
      { name: 'endDate', label: 'End Date', placeholder: 'e.g., May 2022' }
    ],
    bulletLabel: 'Project Bullet'
  },
  {
    key: 'customSections',
    title: 'Additional Sections',
    emptyMessage: 'No custom sections selected yet.',
    fields: [
      { name: 'title', label: 'Section Title', placeholder: 'e.g., Technical Skills' },
      { name: 'subtitle', label: 'Subtitle', placeholder: 'Optional subtitle' }
    ],
    bulletLabel: 'Section Bullet'
  }
];

function SelectedResumeEditor({ resume, onUpdate, summary }) {
  const [localResume, setLocalResume] = useState(() => normalizeResume(resume));

  const lineTotals = useMemo(() => calculateTotalLines(localResume), [localResume]);
  const maxLines = typeof summary?.maxLines === 'number' ? summary.maxLines : 50;
  const fitsOnePage = lineTotals <= maxLines;

  useEffect(() => {
    setLocalResume(normalizeResume(resume));
  }, [resume]);

  useEffect(() => {
    if (onUpdate) {
      onUpdate(clone(localResume));
    }
  }, [localResume, onUpdate]);

  const updateResume = useCallback((mutator) => {
    setLocalResume((prev) => {
      const next = clone(prev);
      mutator(next);
      return next;
    });
  }, []);

  function handleEntryFieldChange(sectionKey, entryId, field, value) {
    updateResume((draft) => {
      draft[sectionKey] = (draft[sectionKey] || []).map((entry) =>
        entry.id === entryId ? { ...entry, [field]: value } : entry
      );
    });
  }

  function handleBulletChange(sectionKey, entryId, bulletId, value) {
    updateResume((draft) => {
      draft[sectionKey] = (draft[sectionKey] || []).map((entry) => {
        if (entry.id !== entryId) return entry;
        const updatedBullets = (entry.selectedBullets || []).map((bullet) =>
          bullet.id === bulletId ? { ...bullet, text: value } : bullet
        );
        return { ...entry, selectedBullets: updatedBullets };
      });
    });
  }

  function handleAddEntry(sectionKey) {
    updateResume((draft) => {
      draft[sectionKey] = [
        ...(draft[sectionKey] || []),
        createEmptyEntry(sectionKey)
      ];
    });
  }

  function handleDeleteEntry(sectionKey, entryId) {
    updateResume((draft) => {
      draft[sectionKey] = (draft[sectionKey] || []).filter((entry) => entry.id !== entryId);
    });
  }

  function handleAddBullet(sectionKey, entryId) {
    updateResume((draft) => {
      draft[sectionKey] = (draft[sectionKey] || []).map((entry) => {
        if (entry.id !== entryId) return entry;
        const newBullet = {
          id: generateId('bullet'),
          text: ''
        };
        return {
          ...entry,
          selectedBullets: [...(entry.selectedBullets || []), newBullet]
        };
      });
    });
  }

  function handleDeleteBullet(sectionKey, entryId, bulletId) {
    updateResume((draft) => {
      draft[sectionKey] = (draft[sectionKey] || []).map((entry) => {
        if (entry.id !== entryId) return entry;
        return {
          ...entry,
          selectedBullets: (entry.selectedBullets || []).filter((bullet) => bullet.id !== bulletId)
        };
      });
    });
  }

  return (
    <div className="selected-resume-editor">
      {summary && (
        <div className="resume-summary">
          <div className="summary-item">
            <span className="summary-label">One-Page Fit</span>
            <span className={`summary-value ${fitsOnePage ? 'summary-good' : 'summary-warning'}`}>
              {fitsOnePage ? '✅ Fits on one page' : '⚠️ Exceeds one page'}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Estimated Lines</span>
            <span className="summary-value">
              {lineTotals} / {maxLines}
            </span>
          </div>
          {summary.processingTime && (
            <div className="summary-item">
              <span className="summary-label">Processing Time</span>
              <span className="summary-value">{summary.processingTime.toFixed(2)}s</span>
            </div>
          )}
        </div>
      )}

      <div className="selected-section">
        <h3>Personal Information</h3>
        <PersonalInfoEditor
          value={localResume.personalInfo}
          onChange={(info) => updateResume((draft) => {
            draft.personalInfo = info;
          })}
          variant="compact"
        />
      </div>

      <div className="selected-section">
        <SkillsEditor
          skills={localResume.skills}
          onChange={(updatedSkills) => updateResume((draft) => {
            draft.skills = updatedSkills;
          })}
        />
      </div>

      {SECTION_CONFIG.map((section) => (
        <SectionEditor
          key={section.key}
          config={section}
          entries={localResume[section.key] || []}
          onFieldChange={handleEntryFieldChange}
          onAddEntry={handleAddEntry}
          onDeleteEntry={handleDeleteEntry}
          onAddBullet={handleAddBullet}
          onBulletChange={handleBulletChange}
          onDeleteBullet={handleDeleteBullet}
        />
      ))}
    </div>
  );
}

function SectionEditor({
  config,
  entries,
  onFieldChange,
  onAddEntry,
  onDeleteEntry,
  onAddBullet,
  onBulletChange,
  onDeleteBullet
}) {
  return (
    <div className="selected-section">
      <div className="selected-section-header">
        <h3>{config.title}</h3>
        <button className="btn btn-small" onClick={() => onAddEntry(config.key)}>
          + Add {config.title.replace(/s$/, '')}
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="selected-section-empty">{config.emptyMessage}</div>
      ) : (
        entries.map((entry) => (
          <div key={entry.id} className="selected-entry">
            <div className="entry-fields">
              {config.fields.map((field) => (
                <div key={field.name} className="entry-field">
                  <label>{field.label}</label>
                  {field.multiline ? (
                    <textarea
                      value={entry[field.name] || ''}
                      onChange={(e) => onFieldChange(config.key, entry.id, field.name, e.target.value)}
                      placeholder={field.placeholder}
                      rows={3}
                    />
                  ) : (
                    <input
                      type="text"
                      value={entry[field.name] || ''}
                      onChange={(e) => onFieldChange(config.key, entry.id, field.name, e.target.value)}
                      placeholder={field.placeholder}
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="selected-bullets">
              <div className="selected-bullets-header">
                <span>{config.bulletLabel}s ({(entry.selectedBullets || []).length})</span>
                <button
                  className="btn btn-small"
                  onClick={() => onAddBullet(config.key, entry.id)}
                >
                  + Add Bullet
                </button>
              </div>

              {(entry.selectedBullets || []).length === 0 ? (
                <div className="selected-section-empty small">No bullets yet. Add one to highlight this entry.</div>
              ) : (
                (entry.selectedBullets || []).map((bullet, index) => {
                  const lineInfo = getLineCountInfo(bullet.text || '');
                  return (
                    <div key={bullet.id || index} className="selected-bullet-row">
                      <span className="bullet-index">{index + 1}.</span>
                      <div className="bullet-text-group">
                        <textarea
                          value={bullet.text || ''}
                          onChange={(e) => onBulletChange(config.key, entry.id, bullet.id, e.target.value)}
                          placeholder="Edit bullet point..."
                          rows={lineInfo.count >= 3 ? 3 : 2}
                          className={lineInfo.warning ? 'bullet-warning' : ''}
                        />
                        <span className={`line-indicator ${lineInfo.category}`}>
                          {lineInfo.count === 0 ? '' : `${lineInfo.count} line${lineInfo.count > 1 ? 's' : ''}`}
                        </span>
                      </div>
                      <button
                        className="btn-icon"
                        onClick={() => onDeleteBullet(config.key, entry.id, bullet.id)}
                        title="Delete bullet"
                      >
                        ×
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="selected-entry-actions">
              <button
                className="btn btn-secondary btn-small"
                onClick={() => onDeleteEntry(config.key, entry.id)}
              >
                Delete Entry
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function normalizeResume(resume) {
  if (!resume) {
    return {
      personalInfo: { ...DEFAULT_PERSONAL_INFO },
      skills: [],
      experiences: [],
      education: [],
      projects: [],
      customSections: []
    };
  }

  return {
    personalInfo: normalizePersonalInfo(resume.personalInfo),
    skills: normalizeSkills(resume.skills),
    experiences: normalizeEntries(resume.experiences),
    education: normalizeEntries(resume.education),
    projects: normalizeEntries(resume.projects),
    customSections: normalizeEntries(resume.customSections)
  };
}

function normalizeEntries(entries = []) {
  return entries.map((entry) => ({
    id: entry.id || generateId('entry'),
    ...entry,
    selectedBullets: Array.isArray(entry.selectedBullets)
      ? entry.selectedBullets.map((bullet, idx) => ({
          id: bullet.id || generateId(`bullet-${idx}`),
          text: bullet.text || '',
          relevanceScore: bullet.relevanceScore,
          lineCount: bullet.lineCount
        }))
      : []
  }));
}

function normalizePersonalInfo(info) {
  if (!info || typeof info !== 'object') {
    return { ...DEFAULT_PERSONAL_INFO };
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

  return skills.map((group, index) => ({
    id: typeof group?.id === 'string' && group.id.length > 0 ? group.id : generateId(`skill-${index}`),
    title: typeof group?.title === 'string' ? group.title : '',
    skills: Array.isArray(group?.skills)
      ? group.skills.map((skill) => (typeof skill === 'string' ? skill : '')).filter(Boolean)
      : []
  }));
}

function createEmptyEntry(sectionKey) {
  const baseId = generateId(sectionKey.slice(0, 3) || 'entry');
  switch (sectionKey) {
    case 'experiences':
      return {
        id: baseId,
        company: '',
        role: '',
        startDate: '',
        endDate: '',
        selectedBullets: []
      };
    case 'education':
      return {
        id: baseId,
        school: '',
        degree: '',
        field: '',
        startDate: '',
        endDate: '',
        selectedBullets: []
      };
    case 'projects':
      return {
        id: baseId,
        name: '',
        description: '',
        technologies: '',
        startDate: '',
        endDate: '',
        selectedBullets: []
      };
    case 'customSections':
    default:
      return {
        id: baseId,
        title: '',
        subtitle: '',
        selectedBullets: []
      };
  }
}

function generateId(prefix = 'id') {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now()}`;
}

function clone(value) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    console.warn('Failed to clone value', error);
    return value;
  }
}

function calculateTotalLines(resume) {
  if (!resume) return 0;

  let total = 0;

  const accumulate = (entries = []) => {
    entries.forEach((entry) => {
      (entry.selectedBullets || []).forEach((bullet) => {
        const info = getLineCountInfo(bullet.text || '');
        total += Math.max(1, info.count || 0);
      });
      if ((entry.selectedBullets || []).length > 0) {
        total += 2; // approximate spacing for headings
      }
    });
  };

  accumulate(resume.experiences);
  accumulate(resume.education);
  accumulate(resume.projects);
  accumulate(resume.customSections);

  (resume.skills || []).forEach((group) => {
    const items = Array.isArray(group?.skills) ? group.skills.filter(Boolean) : [];
    if (items.length > 0) {
      if (group.title) {
        total += 1;
      }
      total += items.length;
    }
  });

  return total;
}

export default SelectedResumeEditor;


