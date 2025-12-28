import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { getLineCountInfo } from '../utils/latexLineCount';
import PersonalInfoEditor from './PersonalInfoEditor';
import SkillsEditor from './SkillsEditor';
import { Icon } from './Icons';
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

function SelectedResumeEditor({
  resume,
  onUpdate,
  summary,
  showPersonalInfo = true,
  showSkills = true,
  showEducation = true
}) {
  const [localResume, setLocalResume] = useState(() => normalizeResume(resume));
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const isLocalUpdateRef = useRef(false);
  const lastResumeRef = useRef(JSON.stringify(resume));
  const carouselRef = useRef(null);
  const slideRefs = useRef([]);
  const isScrollingRef = useRef(false);
  const updateTimerRef = useRef(null);

  const lineTotals = useMemo(() => calculateTotalLines(localResume), [localResume]);
  const maxLines = typeof summary?.maxLines === 'number' ? summary.maxLines : 42;
  const fitsOnePage = lineTotals <= maxLines;

  // Only sync from prop if it's an external change (not from our own updates)
  useEffect(() => {
    // Skip if this update came from our local changes
    if (isLocalUpdateRef.current) {
      isLocalUpdateRef.current = false;
      // Update the ref to match what we expect
      lastResumeRef.current = JSON.stringify(resume);
      return;
    }

    // Only update if the resume prop actually changed
    const resumeStr = JSON.stringify(resume);
    if (resumeStr !== lastResumeRef.current) {
      lastResumeRef.current = resumeStr;
      setLocalResume(normalizeResume(resume));
    }
  }, [resume]);

  // Debounce updates to parent to avoid re-rendering PDF on every keystroke
  useEffect(() => {
    if (onUpdate) {
      // Clear any pending update
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
      }
      
      // Debounce the update - only notify parent after user stops typing for 500ms
      updateTimerRef.current = setTimeout(() => {
        isLocalUpdateRef.current = true;
        onUpdate(clone(localResume));
      }, 500);
    }
    
    // Cleanup on unmount
    return () => {
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
      }
    };
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

  const visibleSections = useMemo(() => {
    return SECTION_CONFIG.filter((section) => {
      if (section.key === 'education' && !showEducation) {
        return false;
      }
      return true;
    });
  }, [showEducation]);

  // Build carousel sections array
  const carouselSections = useMemo(() => {
    const sections = [];
    
    if (showPersonalInfo) {
      sections.push({ type: 'personalInfo', title: 'Personal Information' });
    }
    
    if (showSkills) {
      sections.push({ type: 'skills', title: 'Skills' });
    }
    
    visibleSections.forEach((section) => {
      sections.push({ type: 'section', config: section, title: section.title });
    });
    
    return sections;
  }, [showPersonalInfo, showSkills, visibleSections]);

  // Initialize slide refs array
  useEffect(() => {
    slideRefs.current = new Array(carouselSections.length);
  }, [carouselSections.length]);

  // Scroll to current section when index changes (fallback)
  useEffect(() => {
    if (carouselRef.current && slideRefs.current[currentSectionIndex] && !isScrollingRef.current) {
      isScrollingRef.current = true;
      const carousel = carouselRef.current;
      const slideWidth = carousel.clientWidth; // Use clientWidth instead of offsetWidth to exclude scrollbar
      const scrollPosition = slideWidth * currentSectionIndex;
      const maxScroll = carousel.scrollWidth - carousel.clientWidth;
      const clampedScroll = Math.min(scrollPosition, maxScroll);
      
      carousel.scrollTo({
        left: clampedScroll,
        behavior: 'smooth'
      });
      
      // Reset flag after scroll completes
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 300);
    }
  }, [currentSectionIndex]);

  // Handle scroll events to update current section index (only for manual scrolling)
  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    const handleScroll = () => {
      // Ignore scroll events during programmatic scrolling
      if (isScrollingRef.current) return;
      
      const scrollLeft = carousel.scrollLeft;
      const slideWidth = carousel.offsetWidth;
      const newIndex = Math.round(scrollLeft / slideWidth);
      
      if (newIndex !== currentSectionIndex && newIndex >= 0 && newIndex < carouselSections.length) {
        setCurrentSectionIndex(newIndex);
      }
    };

    carousel.addEventListener('scroll', handleScroll, { passive: true });
    return () => carousel.removeEventListener('scroll', handleScroll);
  }, [currentSectionIndex, carouselSections.length]);

  // Debug logging
  useEffect(() => {
    console.log('[SelectedResumeEditor] showSkills:', showSkills, 'skills count:', localResume.skills?.length || 0);
  }, [showSkills, localResume.skills]);

  function goToNextSection() {
    if (currentSectionIndex < carouselSections.length - 1) {
      const nextIndex = currentSectionIndex + 1;
      goToSection(nextIndex);
    }
  }

  function goToPrevSection() {
    if (currentSectionIndex > 0) {
      const prevIndex = currentSectionIndex - 1;
      goToSection(prevIndex);
    }
  }

  function goToSection(index) {
    if (index >= 0 && index < carouselSections.length && carouselRef.current) {
      isScrollingRef.current = true;
      setCurrentSectionIndex(index);
      
      const carousel = carouselRef.current;
      const slideWidth = carousel.clientWidth; // Use clientWidth instead of offsetWidth to exclude scrollbar
      const scrollPosition = slideWidth * index;
      const maxScroll = carousel.scrollWidth - carousel.clientWidth;
      const clampedScroll = Math.min(scrollPosition, maxScroll);
      
      carousel.scrollTo({
        left: clampedScroll,
        behavior: 'smooth'
      });
      
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 300);
    }
  }

  return (
    <div className="selected-resume-editor">
      {summary && (
        <div className="resume-summary">
          <div className="summary-item">
            <span className="summary-label">One-Page Fit</span>
            <span className={`summary-value ${fitsOnePage ? 'summary-good' : 'summary-warning'}`}>
              {fitsOnePage ? (
                <>
                  <Icon name="checkCircle" size={16} style={{ marginRight: '4px', verticalAlign: 'middle', display: 'inline-block' }} />
                  Fits on one page
                </>
              ) : (
                <>
                  <Icon name="warning" size={16} style={{ marginRight: '4px', verticalAlign: 'middle', display: 'inline-block' }} />
                  Exceeds one page
                </>
              )}
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

      {/* Carousel Navigation */}
      {carouselSections.length > 1 && (
        <div className="carousel-navigation">
          <button
            className="carousel-nav-btn"
            onClick={goToPrevSection}
            disabled={currentSectionIndex === 0}
            aria-label="Previous section"
          >
            <Icon name="chevronLeft" size={20} />
          </button>
          
          <div className="carousel-dots">
            {carouselSections.map((section, index) => (
              <button
                key={index}
                className={`carousel-dot ${index === currentSectionIndex ? 'active' : ''}`}
                onClick={() => goToSection(index)}
                aria-label={`Go to ${section.title}`}
              />
            ))}
          </div>
          
          <button
            className="carousel-nav-btn"
            onClick={goToNextSection}
            disabled={currentSectionIndex === carouselSections.length - 1}
            aria-label="Next section"
          >
            <Icon name="chevronRight" size={20} />
          </button>
        </div>
      )}

      {/* Carousel Container */}
      <div className="carousel-container" ref={carouselRef}>
        <div className="carousel-track">
          {carouselSections.map((section, index) => {
            if (section.type === 'personalInfo') {
              return (
                <div 
                  key="personalInfo"
                  className="carousel-slide" 
                  ref={(el) => {
                    if (slideRefs.current) {
                      slideRefs.current[index] = el;
                    }
                  }}
                >
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
                </div>
              );
            } else if (section.type === 'skills') {
              return (
                <div 
                  key="skills"
                  className="carousel-slide" 
                  data-testid="skills-section"
                  ref={(el) => {
                    if (slideRefs.current) {
                      slideRefs.current[index] = el;
                    }
                  }}
                >
                  <div className="selected-section">
                    <SkillsEditor
                      skills={localResume.skills || []}
                      onChange={(updatedSkills) => {
                        console.log('[SelectedResumeEditor] Skills updated:', updatedSkills);
                        updateResume((draft) => {
                          draft.skills = updatedSkills;
                        });
                      }}
                    />
                  </div>
                </div>
              );
            } else {
              return (
                <div 
                  key={section.config.key} 
                  className="carousel-slide"
                  ref={(el) => {
                    if (slideRefs.current) {
                      slideRefs.current[index] = el;
                    }
                  }}
                >
                  <SectionEditor
                    config={section.config}
                    entries={localResume[section.config.key] || []}
                    onFieldChange={handleEntryFieldChange}
                    onAddEntry={handleAddEntry}
                    onDeleteEntry={handleDeleteEntry}
                    onAddBullet={handleAddBullet}
                    onBulletChange={handleBulletChange}
                    onDeleteBullet={handleDeleteBullet}
                  />
                </div>
              );
            }
          })}
        </div>
      </div>
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
                          {lineInfo.warningMessage && (
                            <span className="line-warning-message" style={{ marginLeft: '8px', color: '#f59e0b', fontSize: '12px' }}>
                              <Icon name="warning" size={12} style={{ marginRight: '4px', verticalAlign: 'middle', display: 'inline-block' }} />
                              {lineInfo.warningMessage}
                            </span>
                          )}
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


