import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { getLineCountInfo } from '../../utils/latexLineCount';
import PersonalInfoEditor from './PersonalInfoEditor';
import SkillsEditor from './SkillsEditor';
import Tabs from '../ui/Tabs';
import { Icon } from '../ui/Icons';
import BulletSelectionModal from './BulletSelectionModal';
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
      { name: 'location', label: 'Location', placeholder: 'e.g., Mountain View, CA' },
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
  masterResume,
  onUpdate,
  summary,
  showPersonalInfo = true,
  showSkills = true,
  showEducation = true,
  verticalLayout = false
}) {
  const [localResume, setLocalResume] = useState(() => normalizeResume(resume));
  const [activeTab, setActiveTab] = useState('personalInfo');
  // Initialize all sections as collapsed by default
  const [collapsedSections, setCollapsedSections] = useState(() => ({
    personalInfo: true,
    skills: true,
    education: true,
    experiences: true,
    projects: true,
    customSections: true
  }));
  const [bulletModalOpen, setBulletModalOpen] = useState(false);
  const [bulletModalContext, setBulletModalContext] = useState(null); // { sectionKey, entryId }
  const isLocalUpdateRef = useRef(false);
  const lastResumeRef = useRef(JSON.stringify(resume));
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
    // Find the entry to get its identifying information
    const entry = localResume[sectionKey]?.find(e => e.id === entryId);
    if (!entry) return;
    
    // Open modal to select from existing bullets or create new
    setBulletModalContext({ sectionKey, entryId, entry });
    setBulletModalOpen(true);
  }

  function handleSelectBullet(bullet) {
    if (!bulletModalContext) return;
    const { sectionKey, entryId } = bulletModalContext;
    
    // Ensure bullet has valid text (required by backend)
    const bulletText = (bullet.text || '').trim();
    if (!bulletText) {
      alert('Cannot add bullet: bullet text is empty');
      return;
    }
    
    updateResume((draft) => {
      draft[sectionKey] = (draft[sectionKey] || []).map((entry) => {
        if (entry.id !== entryId) return entry;
        const newBullet = {
          id: generateId('bullet'),
          text: bulletText,
          relevanceScore: bullet.relevanceScore || 0.5, // Default relevance score if not provided
          lineCount: bullet.lineCount || null,
          original: bullet.original || null,
          rewritten: bullet.rewritten || null,
          reasoning: bullet.reasoning || null
        };
        return {
          ...entry,
          selectedBullets: [...(entry.selectedBullets || []), newBullet]
        };
      });
    });
    
    setBulletModalOpen(false);
    setBulletModalContext(null);
  }

  function handleCreateNewBullet() {
    if (!bulletModalContext) return;
    const { sectionKey, entryId } = bulletModalContext;
    
    updateResume((draft) => {
      draft[sectionKey] = (draft[sectionKey] || []).map((entry) => {
        if (entry.id !== entryId) return entry;
        const newBullet = {
          id: generateId('bullet'),
          text: '',
          relevanceScore: 0.5, // Default relevance score for new bullets
          lineCount: null,
          original: null,
          rewritten: null,
          reasoning: null
        };
        return {
          ...entry,
          selectedBullets: [...(entry.selectedBullets || []), newBullet]
        };
      });
    });
    
    setBulletModalOpen(false);
    setBulletModalContext(null);
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

  const toggleSection = (sectionId) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const isSectionCollapsed = (sectionId) => {
    return collapsedSections[sectionId] === true;
  };

  // Get available bullets from master resume for a given section and entry
  const getAvailableBullets = useCallback((sectionKey, currentEntry) => {
    if (!masterResume || !currentEntry) return [];
    
    const sectionMap = {
      'experiences': masterResume.experiences || [],
      'education': masterResume.education || [],
      'projects': masterResume.projects || [],
      'customSections': masterResume.customSections || []
    };
    
    const entries = sectionMap[sectionKey] || [];
    const bullets = [];
    
    // Find matching entry in master resume based on identifying fields
    // Only match if the identifying fields have values and match exactly
    let matchingEntry = null;
    
    if (sectionKey === 'experiences') {
      // Match by company and role - both must have values and match
      const currentCompany = currentEntry.company?.toLowerCase().trim();
      const currentRole = currentEntry.role?.toLowerCase().trim();
      
      if (currentCompany && currentRole) {
        matchingEntry = entries.find(entry => {
          const entryCompany = entry.company?.toLowerCase().trim();
          const entryRole = entry.role?.toLowerCase().trim();
          return entryCompany && entryRole && 
                 entryCompany === currentCompany && 
                 entryRole === currentRole;
        });
      }
    } else if (sectionKey === 'education') {
      // Match by school, degree, and field - all must have values and match
      const currentSchool = currentEntry.school?.toLowerCase().trim();
      const currentDegree = currentEntry.degree?.toLowerCase().trim();
      const currentField = currentEntry.field?.toLowerCase().trim();
      
      if (currentSchool && currentDegree && currentField) {
        matchingEntry = entries.find(entry => {
          const entrySchool = entry.school?.toLowerCase().trim();
          const entryDegree = entry.degree?.toLowerCase().trim();
          const entryField = entry.field?.toLowerCase().trim();
          return entrySchool && entryDegree && entryField &&
                 entrySchool === currentSchool && 
                 entryDegree === currentDegree &&
                 entryField === currentField;
        });
      }
    } else if (sectionKey === 'projects') {
      // Match by project name - must have value and match
      const currentName = currentEntry.name?.toLowerCase().trim();
      
      if (currentName) {
        matchingEntry = entries.find(entry => {
          const entryName = entry.name?.toLowerCase().trim();
          return entryName && entryName === currentName;
        });
      }
    } else if (sectionKey === 'customSections') {
      // Match by title - must have value and match
      const currentTitle = currentEntry.title?.toLowerCase().trim();
      
      if (currentTitle) {
        matchingEntry = entries.find(entry => {
          const entryTitle = entry.title?.toLowerCase().trim();
          return entryTitle && entryTitle === currentTitle;
        });
      }
    }
    
    // Only return bullets from the matching entry
    if (matchingEntry) {
      // Get text of bullets already in the current entry (to avoid duplicates)
      const existingBulletTexts = new Set(
        (currentEntry.selectedBullets || [])
          .map(b => (b.text || '').trim().toLowerCase())
          .filter(text => text.length > 0)
      );
      
      (matchingEntry.bullets || []).forEach((bullet) => {
        const bulletText = (bullet.text || '').trim();
        const bulletTextLower = bulletText.toLowerCase();
        
        // Skip if this bullet is already in the current entry
        if (existingBulletTexts.has(bulletTextLower)) {
          return;
        }
        
        bullets.push({
          id: bullet.id,
          text: bulletText,
          parentEntry: {
            company: matchingEntry.company,
            school: matchingEntry.school,
            name: matchingEntry.name,
            title: matchingEntry.title,
            role: matchingEntry.role,
            degree: matchingEntry.degree
          }
        });
      });
    } else {
      // No matching entry found - return empty array (don't show bullets from other entries)
      console.log('[BulletSelection] No matching entry found for:', {
        sectionKey,
        currentEntry: {
          company: currentEntry.company,
          role: currentEntry.role,
          school: currentEntry.school,
          degree: currentEntry.degree,
          field: currentEntry.field,
          name: currentEntry.name,
          title: currentEntry.title
        }
      });
    }
    
    return bullets;
  }, [masterResume]);

  const visibleSections = useMemo(() => {
    return SECTION_CONFIG.filter((section) => {
      if (section.key === 'education' && !showEducation) {
        return false;
      }
      return true;
    });
  }, [showEducation]);

  // Build tabs array
  const tabs = useMemo(() => {
    const tabList = [];
    
    if (showPersonalInfo) {
      tabList.push({ id: 'personalInfo', label: 'Personal Info' });
    }
    
    if (showSkills) {
      tabList.push({ id: 'skills', label: 'Skills' });
    }
    
    visibleSections.forEach((section) => {
      tabList.push({ id: section.key, label: section.title });
    });
    
    return tabList;
  }, [showPersonalInfo, showSkills, visibleSections]);

  // Set initial active tab when tabs change
  useEffect(() => {
    if (tabs.length > 0 && !tabs.find(t => t.id === activeTab)) {
      setActiveTab(tabs[0].id);
    }
  }, [tabs, activeTab]);

  // Debug logging
  useEffect(() => {
    console.log('[SelectedResumeEditor] showSkills:', showSkills, 'skills count:', localResume.skills?.length || 0);
  }, [showSkills, localResume.skills]);

  return (
    <div className={`selected-resume-editor ${verticalLayout ? 'vertical-layout' : ''}`}>
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

      {verticalLayout ? (
        /* Vertical Layout: Show all sections in resume order */
        <div className="selected-resume-vertical-content">
          {showPersonalInfo && (
            <CollapsibleSection
              sectionId="personalInfo"
              title="Personal Information"
              isCollapsed={isSectionCollapsed('personalInfo')}
              onToggle={() => toggleSection('personalInfo')}
            >
              <PersonalInfoEditor
                value={localResume.personalInfo}
                onChange={(info) => updateResume((draft) => {
                  draft.personalInfo = info;
                })}
                variant="compact"
              />
            </CollapsibleSection>
          )}

          {/* Education - matches LaTeX order */}
          {visibleSections.find(s => s.key === 'education') && (
            <CollapsibleSection
              sectionId="education"
              title={visibleSections.find(s => s.key === 'education')?.title || 'Education'}
              isCollapsed={isSectionCollapsed('education')}
              onToggle={() => toggleSection('education')}
            >
              <SectionEditor
                key="education"
                config={visibleSections.find(s => s.key === 'education')}
                entries={localResume.education || []}
                onFieldChange={handleEntryFieldChange}
                onAddEntry={handleAddEntry}
                onDeleteEntry={handleDeleteEntry}
                onAddBullet={handleAddBullet}
                onBulletChange={handleBulletChange}
                onDeleteBullet={handleDeleteBullet}
              />
            </CollapsibleSection>
          )}

          {/* Experience - matches LaTeX order */}
          {visibleSections.find(s => s.key === 'experiences') && (
            <CollapsibleSection
              sectionId="experiences"
              title={visibleSections.find(s => s.key === 'experiences')?.title || 'Work Experience'}
              isCollapsed={isSectionCollapsed('experiences')}
              onToggle={() => toggleSection('experiences')}
            >
              <SectionEditor
                key="experiences"
                config={visibleSections.find(s => s.key === 'experiences')}
                entries={localResume.experiences || []}
                onFieldChange={handleEntryFieldChange}
                onAddEntry={handleAddEntry}
                onDeleteEntry={handleDeleteEntry}
                onAddBullet={handleAddBullet}
                onBulletChange={handleBulletChange}
                onDeleteBullet={handleDeleteBullet}
              />
            </CollapsibleSection>
          )}

          {/* Projects - matches LaTeX order */}
          {visibleSections.find(s => s.key === 'projects') && (
            <CollapsibleSection
              sectionId="projects"
              title={visibleSections.find(s => s.key === 'projects')?.title || 'Projects'}
              isCollapsed={isSectionCollapsed('projects')}
              onToggle={() => toggleSection('projects')}
            >
              <SectionEditor
                key="projects"
                config={visibleSections.find(s => s.key === 'projects')}
                entries={localResume.projects || []}
                onFieldChange={handleEntryFieldChange}
                onAddEntry={handleAddEntry}
                onDeleteEntry={handleDeleteEntry}
                onAddBullet={handleAddBullet}
                onBulletChange={handleBulletChange}
                onDeleteBullet={handleDeleteBullet}
              />
            </CollapsibleSection>
          )}

          {/* Skills - matches LaTeX order */}
          {showSkills && (
            <CollapsibleSection
              sectionId="skills"
              title="Skills"
              isCollapsed={isSectionCollapsed('skills')}
              onToggle={() => toggleSection('skills')}
            >
              <SkillsEditor
                skills={localResume.skills || []}
                onChange={(updatedSkills) => {
                  console.log('[SelectedResumeEditor] Skills updated:', updatedSkills);
                  updateResume((draft) => {
                    draft.skills = updatedSkills;
                  });
                }}
              />
            </CollapsibleSection>
          )}

          {/* Custom Sections - matches LaTeX order */}
          {visibleSections.find(s => s.key === 'customSections') && (
            <CollapsibleSection
              sectionId="customSections"
              title={visibleSections.find(s => s.key === 'customSections')?.title || 'Additional Sections'}
              isCollapsed={isSectionCollapsed('customSections')}
              onToggle={() => toggleSection('customSections')}
            >
              <SectionEditor
                key="customSections"
                config={visibleSections.find(s => s.key === 'customSections')}
                entries={localResume.customSections || []}
                onFieldChange={handleEntryFieldChange}
                onAddEntry={handleAddEntry}
                onDeleteEntry={handleDeleteEntry}
                onAddBullet={handleAddBullet}
                onBulletChange={handleBulletChange}
                onDeleteBullet={handleDeleteBullet}
              />
            </CollapsibleSection>
          )}
        </div>
      ) : (
        /* Tab Layout: Original tab-based view */
        <>
          {/* Tabs Navigation */}
          {tabs.length > 1 && (
            <div className="selected-resume-tabs-wrapper">
              <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
            </div>
          )}

          {/* Tab Content */}
          <div className="selected-resume-tab-content">
            {activeTab === 'personalInfo' && showPersonalInfo && (
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
            )}

            {activeTab === 'skills' && showSkills && (
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
            )}

            {visibleSections.map((section) => {
              if (activeTab === section.key) {
                return (
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
                );
              }
              return null;
            })}
          </div>
        </>
      )}

      {/* Bullet Selection Modal */}
      {bulletModalOpen && bulletModalContext && bulletModalContext.entry && (
        <BulletSelectionModal
          sectionKey={bulletModalContext.sectionKey}
          availableBullets={getAvailableBullets(bulletModalContext.sectionKey, bulletModalContext.entry)}
          onSelectBullet={handleSelectBullet}
          onCreateNew={handleCreateNewBullet}
          onClose={() => {
            setBulletModalOpen(false);
            setBulletModalContext(null);
          }}
        />
      )}
    </div>
  );
}

function CollapsibleSection({ sectionId, title, isCollapsed, onToggle, children }) {
  return (
    <div className={`selected-section ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="selected-section-header" onClick={onToggle}>
        <button
          className="section-toggle-button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          aria-label={isCollapsed ? `Expand ${title}` : `Collapse ${title}`}
        >
          <Icon 
            name={isCollapsed ? 'chevronRight' : 'chevronDown'} 
            size={16} 
          />
        </button>
        <h3>{title}</h3>
      </div>
      {!isCollapsed && (
        <div className="selected-section-content">
          {children}
        </div>
      )}
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
  // Custom layout for experiences
  const isExperience = config.key === 'experiences';
  const isEducation = config.key === 'education';
  const isProject = config.key === 'projects';

  return (
    <div className="selected-section">
      <div className="selected-section-header">
        <h3>{config.title}</h3>
        <button className="btn btn-small" onClick={() => onAddEntry(config.key)}>
          + Add {config.title.replace(/s$/, '')}
        </button>
      </div>
      <div className="selected-section-content">

      {entries.length === 0 ? (
        <div className="selected-section-empty">{config.emptyMessage}</div>
      ) : (
        entries.map((entry) => (
          <div key={entry.id} className="selected-entry">
            {isExperience ? (
              /* Compact Experience Layout: Company | Start | End on one line, Role below */
              <div className="entry-fields-compact">
                <div className="entry-row-top">
                  <div className="entry-field-compact entry-field-company">
                    <label>Company</label>
                    <input
                      type="text"
                      value={entry.company || ''}
                      onChange={(e) => onFieldChange(config.key, entry.id, 'company', e.target.value)}
                      placeholder="e.g., Google"
                    />
                  </div>
                  <div className="entry-field-compact entry-field-date">
                    <label>Start</label>
                    <input
                      type="text"
                      value={entry.startDate || ''}
                      onChange={(e) => onFieldChange(config.key, entry.id, 'startDate', e.target.value)}
                      placeholder="e.g., Jun 2022"
                    />
                  </div>
                  <div className="entry-field-compact entry-field-date">
                    <label>End</label>
                    <input
                      type="text"
                      value={entry.endDate || ''}
                      onChange={(e) => onFieldChange(config.key, entry.id, 'endDate', e.target.value)}
                      placeholder="e.g., Present"
                    />
                  </div>
                </div>
                <div className="entry-row-role">
                  <div className="entry-field-compact entry-field-role">
                    <label>Role</label>
                    <input
                      type="text"
                      value={entry.role || ''}
                      onChange={(e) => onFieldChange(config.key, entry.id, 'role', e.target.value)}
                      placeholder="e.g., Software Engineer"
                    />
                  </div>
                </div>
              </div>
            ) : isEducation ? (
              /* Compact Education Layout: School | Start | End on one line, Degree/Field below */
              <div className="entry-fields-compact">
                <div className="entry-row-top">
                  <div className="entry-field-compact entry-field-company">
                    <label>School</label>
                    <input
                      type="text"
                      value={entry.school || ''}
                      onChange={(e) => onFieldChange(config.key, entry.id, 'school', e.target.value)}
                      placeholder="e.g., Stanford University"
                    />
                  </div>
                  <div className="entry-field-compact entry-field-date">
                    <label>Start</label>
                    <input
                      type="text"
                      value={entry.startDate || ''}
                      onChange={(e) => onFieldChange(config.key, entry.id, 'startDate', e.target.value)}
                      placeholder="e.g., Sep 2018"
                    />
                  </div>
                  <div className="entry-field-compact entry-field-date">
                    <label>End</label>
                    <input
                      type="text"
                      value={entry.endDate || ''}
                      onChange={(e) => onFieldChange(config.key, entry.id, 'endDate', e.target.value)}
                      placeholder="e.g., Jun 2022"
                    />
                  </div>
                </div>
                <div className="entry-row-role entry-row-two-fields">
                  <div className="entry-field-compact entry-field-role">
                    <label>Degree</label>
                    <input
                      type="text"
                      value={entry.degree || ''}
                      onChange={(e) => onFieldChange(config.key, entry.id, 'degree', e.target.value)}
                      placeholder="e.g., B.S."
                    />
                  </div>
                  <div className="entry-field-compact entry-field-role">
                    <label>Field</label>
                    <input
                      type="text"
                      value={entry.field || ''}
                      onChange={(e) => onFieldChange(config.key, entry.id, 'field', e.target.value)}
                      placeholder="e.g., Computer Science"
                    />
                  </div>
                </div>
              </div>
            ) : isProject ? (
              /* Compact Project Layout: Name | Start | End on one line, Description/Technologies below */
              <div className="entry-fields-compact">
                <div className="entry-row-top">
                  <div className="entry-field-compact entry-field-company">
                    <label>Project Name</label>
                    <input
                      type="text"
                      value={entry.name || ''}
                      onChange={(e) => onFieldChange(config.key, entry.id, 'name', e.target.value)}
                      placeholder="e.g., Distributed Task Scheduler"
                    />
                  </div>
                  <div className="entry-field-compact entry-field-date">
                    <label>Start</label>
                    <input
                      type="text"
                      value={entry.startDate || ''}
                      onChange={(e) => onFieldChange(config.key, entry.id, 'startDate', e.target.value)}
                      placeholder="e.g., Jan 2022"
                    />
                  </div>
                  <div className="entry-field-compact entry-field-date">
                    <label>End</label>
                    <input
                      type="text"
                      value={entry.endDate || ''}
                      onChange={(e) => onFieldChange(config.key, entry.id, 'endDate', e.target.value)}
                      placeholder="e.g., May 2022"
                    />
                  </div>
                </div>
                <div className="entry-row-role">
                  <div className="entry-field-compact entry-field-role">
                    <label>Technologies</label>
                    <input
                      type="text"
                      value={entry.technologies || ''}
                      onChange={(e) => onFieldChange(config.key, entry.id, 'technologies', e.target.value)}
                      placeholder="e.g., Go, Kubernetes"
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* Default layout for custom sections */
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
            )}

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


