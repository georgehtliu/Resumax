import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getLineCountInfo } from '../utils/latexLineCount';
import PersonalInfoEditor from './editors/PersonalInfoEditor';
import SkillsEditor from './editors/SkillsEditor';
import { Icon } from './ui/Icons';
import './editors/SelectedResumeEditor.css';
import './Profile.css';

const SECTION_CONFIG = [
  {
    key: 'experiences',
    title: 'Work Experience',
    emptyMessage: 'No experiences yet. Add your first work experience!',
    fields: [
      { name: 'company', label: 'Company', placeholder: 'e.g., Google' },
      { name: 'role', label: 'Role', placeholder: 'e.g., Software Engineer' },
      { name: 'location', label: 'Location', placeholder: 'e.g., Mountain View, CA' },
      { name: 'startDate', label: 'Start Date', placeholder: 'e.g., Jun 2022' },
      { name: 'endDate', label: 'End Date', placeholder: 'e.g., Present' }
    ],
    bulletLabel: 'Bullet'
  },
  {
    key: 'education',
    title: 'Education',
    emptyMessage: 'No education entries yet. Add your first education!',
    fields: [
      { name: 'school', label: 'School', placeholder: 'e.g., Stanford University' },
      { name: 'degree', label: 'Degree', placeholder: 'e.g., B.S.' },
      { name: 'field', label: 'Field', placeholder: 'e.g., Computer Science' },
      { name: 'startDate', label: 'Start Date', placeholder: 'e.g., Sep 2018' },
      { name: 'endDate', label: 'End Date', placeholder: 'e.g., Jun 2022' }
    ],
    bulletLabel: 'Bullet'
  },
  {
    key: 'projects',
    title: 'Projects',
    emptyMessage: 'No projects yet. Add your first project!',
    fields: [
      { name: 'name', label: 'Project Name', placeholder: 'e.g., Distributed Task Scheduler' },
      { name: 'description', label: 'Summary', placeholder: 'Short project summary', multiline: true },
      { name: 'technologies', label: 'Technologies', placeholder: 'e.g., Go, Kubernetes' },
      { name: 'url', label: 'Project URL', placeholder: 'e.g., https://github.com/username/project' },
      { name: 'startDate', label: 'Start Date', placeholder: 'e.g., Jan 2022' },
      { name: 'endDate', label: 'End Date', placeholder: 'e.g., May 2022' }
    ],
    bulletLabel: 'Bullet'
  },
  {
    key: 'customSections',
    title: 'Custom Sections',
    emptyMessage: 'No custom sections yet. Add certifications, skills, awards, etc.!',
    fields: [
      { name: 'title', label: 'Section Title', placeholder: 'e.g., Technical Skills' },
      { name: 'subtitle', label: 'Subtitle', placeholder: 'Optional subtitle' }
    ],
    bulletLabel: 'Bullet'
  }
];

function Profile({ resume, onResumeUpdate, onSave, calculateTotalBullets, onLoadMockData, onImportResume, onClearAllData }) {
  const [localResume, setLocalResume] = useState(() => normalizeResume(resume));
  
  // Smart expansion: expand sections with content, especially Personal Info and Skills
  const getInitialCollapsedState = (resumeData) => {
    const hasContent = (section) => {
      const data = resumeData[section];
      if (section === 'personalInfo') {
        return data && (data.firstName || data.lastName || data.email);
      }
      if (section === 'skills') {
        return Array.isArray(data) && data.length > 0;
      }
      return Array.isArray(data) && data.length > 0;
    };
    
    return {
      personalInfo: !hasContent('personalInfo'), // Expand if has content
      skills: !hasContent('skills'), // Expand if has content
      education: hasContent('education'), // Collapse if has content (less common to edit)
      experiences: hasContent('experiences'), // Collapse if has content
      projects: hasContent('projects'), // Collapse if has content
      customSections: hasContent('customSections') // Collapse if has content
    };
  };
  
  const [collapsedSections, setCollapsedSections] = useState(() => 
    getInitialCollapsedState(normalizeResume(resume))
  );
  const [saveStatus, setSaveStatus] = useState(null); // null, 'saving', 'saved', 'error'
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const isLocalUpdateRef = useRef(false);
  const lastResumeRef = useRef(JSON.stringify(resume));

  // Sync from prop if it's an external change
  useEffect(() => {
    if (isLocalUpdateRef.current) {
      isLocalUpdateRef.current = false;
      lastResumeRef.current = JSON.stringify(resume);
      setHasUnsavedChanges(false);
      return;
    }

    const resumeStr = JSON.stringify(resume);
    if (resumeStr !== lastResumeRef.current) {
      lastResumeRef.current = resumeStr;
      const normalized = normalizeResume(resume);
      setLocalResume(normalized);
      // Update collapsed state based on new data
      setCollapsedSections(getInitialCollapsedState(normalized));
      setHasUnsavedChanges(false);
    }
  }, [resume]);

  // Track unsaved changes
  useEffect(() => {
    const currentStr = JSON.stringify(localResume);
    const originalStr = JSON.stringify(normalizeResume(resume));
    setHasUnsavedChanges(currentStr !== originalStr);
  }, [localResume, resume]);

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
        const updatedBullets = (entry.bullets || []).map((bullet) =>
          bullet.id === bulletId ? { ...bullet, text: value } : bullet
        );
        return { ...entry, bullets: updatedBullets };
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
          bullets: [...(entry.bullets || []), newBullet]
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
          bullets: (entry.bullets || []).filter((bullet) => bullet.id !== bulletId)
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

  const expandAllSections = () => {
    setCollapsedSections({
      personalInfo: false,
      skills: false,
      education: false,
      experiences: false,
      projects: false,
      customSections: false
    });
  };

  const collapseAllSections = () => {
    setCollapsedSections({
      personalInfo: true,
      skills: true,
      education: true,
      experiences: true,
      projects: true,
      customSections: true
    });
  };

  const getSectionCount = (sectionKey) => {
    const data = localResume[sectionKey];
    if (sectionKey === 'personalInfo') return 1; // Always 1
    if (sectionKey === 'skills') return Array.isArray(data) ? data.length : 0;
    return Array.isArray(data) ? data.length : 0;
  };

  const handleSave = async () => {
    if (!onResumeUpdate || !onSave) return;
    
    setSaveStatus('saving');
    try {
      const masterResume = convertToMasterFormat(localResume);
      const totalBullets = calculateTotalBullets(masterResume);
      const updatedResume = { ...masterResume, totalBullets };
      isLocalUpdateRef.current = true;
      onResumeUpdate(updatedResume);
      await onSave(updatedResume, false);
      setSaveStatus('saved');
      setHasUnsavedChanges(false);
      
      // Reset status after 2 seconds
      setTimeout(() => {
        setSaveStatus(null);
      }, 2000);
    } catch (error) {
      console.error('Error saving resume:', error);
      setSaveStatus('error');
    }
  };

  if (!resume) {
    return <SkeletonLoader />;
  }

  // Calculate section completion
  const calculateSectionProgress = (sectionKey) => {
    const entries = localResume[sectionKey] || [];
    if (entries.length === 0) return { percentage: 0, filled: 0, total: 0 };
    
    const filled = entries.filter(entry => {
      if (sectionKey === 'experiences') {
        return entry.company && entry.role && (entry.bullets || []).length > 0;
      } else if (sectionKey === 'education') {
        return entry.school && entry.degree && (entry.bullets || []).length > 0;
      } else if (sectionKey === 'projects') {
        return entry.name && (entry.bullets || []).length > 0;
      } else if (sectionKey === 'customSections') {
        return entry.title && (entry.bullets || []).length > 0;
      } else if (sectionKey === 'skills') {
        return entry.skills && entry.skills.length > 0;
      }
      return false;
    }).length;
    
    return {
      percentage: Math.round((filled / entries.length) * 100),
      filled,
      total: entries.length
    };
  };

  return (
    <div className="view-container profile-page-modern">
      {/* Save Status Indicator */}
      {saveStatus && <SaveStatusIndicator status={saveStatus} />}
      
      {/* Modern Hero Section */}
      <div className="profile-hero">
        <div className="profile-hero-content">
          <h1 className="profile-hero-title">Master Resume</h1>
          <p className="profile-hero-subtitle">
            Build your comprehensive resume with unlimited bullet points. 
            Generate tailored resumes for each job application.
          </p>
          
          {/* Summary Stats */}
          <div className="profile-stats-modern">
              <div className="stat-badge" style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                padding: 'var(--space-2) var(--space-3)',
                background: 'var(--color-primary-50)',
                border: '1px solid var(--color-primary-200)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--color-primary-700)'
              }}>
                <Icon name="briefcase" size={16} />
                <span>{getSectionCount('experiences')} Experiences</span>
              </div>
              <div className="stat-badge" style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                padding: 'var(--space-2) var(--space-3)',
                background: 'var(--color-primary-50)',
                border: '1px solid var(--color-primary-200)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--color-primary-700)'
              }}>
                <Icon name="graduation" size={16} />
                <span>{getSectionCount('education')} Education</span>
              </div>
              <div className="stat-badge" style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                padding: 'var(--space-2) var(--space-3)',
                background: 'var(--color-primary-50)',
                border: '1px solid var(--color-primary-200)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--color-primary-700)'
              }}>
                <Icon name="folder" size={16} />
                <span>{getSectionCount('projects')} Projects</span>
              </div>
              <div className="stat-badge" style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                padding: 'var(--space-2) var(--space-3)',
                background: 'var(--color-primary-50)',
                border: '1px solid var(--color-primary-200)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--color-primary-700)'
              }}>
                <Icon name="zap" size={16} />
                <span>{localResume.totalBullets || calculateTotalBullets(localResume)} Total Bullets</span>
              </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="profile-actions-modern">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', alignItems: 'center', width: '100%' }}>
            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
              {onImportResume && (
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.pdf,.doc,.docx,.txt';
                    input.onchange = async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        await onImportResume(file);
                      }
                    };
                    input.click();
                  }}
                  style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)'
                  }}
                  title="Import resume from file (PDF, DOCX, TXT)"
                >
                  <Icon name="file" size={16} />
                  <span>Import from Resume</span>
                </button>
              )}
              {onLoadMockData && (
                <button
                  className="btn btn-secondary"
                  onClick={async () => {
                    if (window.confirm('This will replace your current resume with mock data. Continue?')) {
                      await onLoadMockData();
                    }
                  }}
                  style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)'
                  }}
                  title="Load mock data for testing"
                >
                  <Icon name="upload" size={16} />
                  <span>Load Mock Data</span>
                </button>
              )}
              {onClearAllData && (
                <button
                  className="btn btn-secondary"
                  onClick={async () => {
                    const confirmed = window.confirm(
                      '⚠️ WARNING: This will permanently delete ALL your resume data!\n\n' +
                      'This includes:\n' +
                      '• All experiences and bullet points\n' +
                      '• All education entries\n' +
                      '• All projects\n' +
                      '• All custom sections\n' +
                      '• All saved resumes\n' +
                      '• Personal information\n\n' +
                      'This action CANNOT be undone.\n\n' +
                      'Are you absolutely sure you want to continue?'
                    );
                    if (confirmed) {
                      // Double confirmation for destructive action
                      const userInput = window.prompt(
                        '⚠️ FINAL WARNING ⚠️\n\n' +
                        'You are about to PERMANENTLY DELETE all your data.\n\n' +
                        'Type "DELETE" (all caps) to confirm, or click Cancel to abort:'
                      );
                      if (userInput === 'DELETE') {
                        await onClearAllData();
                      } else if (userInput !== null) {
                        // User typed something but not "DELETE"
                        window.alert('Confirmation text did not match. Operation cancelled.');
                      }
                    }
                  }}
                  style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                    color: 'var(--color-error, #ef4444)',
                    borderColor: 'var(--color-error, #ef4444)'
                  }}
                  title="Clear all resume data (destructive action)"
                >
                  <Icon name="trash" size={16} />
                  <span>Clear All Data</span>
                </button>
              )}
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saveStatus === 'saving'}
                style={{ 
                  minWidth: '120px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)'
                }}
              >
                {saveStatus === 'saving' ? (
                  <>
                    <div className="save-spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Icon name="save" size={16} />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
            {/* Expand/Collapse All */}
            <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
              <button
                className="btn btn-ghost"
                onClick={expandAllSections}
                style={{ 
                  fontSize: 'var(--font-size-xs)',
                  padding: 'var(--space-1) var(--space-2)'
                }}
                title="Expand all sections"
              >
                <Icon name="chevronDown" size={12} />
                <span>Expand All</span>
              </button>
              <button
                className="btn btn-ghost"
                onClick={collapseAllSections}
                style={{ 
                  fontSize: 'var(--font-size-xs)',
                  padding: 'var(--space-1) var(--space-2)'
                }}
                title="Collapse all sections"
              >
                <Icon name="chevronUp" size={12} />
                <span>Collapse All</span>
              </button>
            </div>
          </div>
        </div>
        {hasUnsavedChanges && saveStatus !== 'saving' && (
          <div style={{ 
            marginTop: 'var(--space-2)', 
            fontSize: 'var(--font-size-sm)', 
            color: 'var(--color-warning)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-1)'
          }}>
            <Icon name="alert" size={14} />
            <span>You have unsaved changes</span>
          </div>
        )}
      </div>
      <div className="view-content">
        <div className="selected-resume-editor vertical-layout">
          <div className="selected-resume-vertical-content">
            {/* Quick Actions Toolbar */}
            <div className="quick-actions-toolbar" style={{
              display: 'flex',
              gap: 'var(--space-2)',
              padding: 'var(--space-3)',
              background: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-slate-200)',
              marginBottom: 'var(--space-4)',
              flexWrap: 'wrap',
              alignItems: 'center'
            }}>
              <span style={{ 
                fontSize: 'var(--font-size-sm)', 
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--text-secondary)',
                marginRight: 'var(--space-2)'
              }}>Quick Add:</span>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  handleAddEntry('experiences');
                  toggleSection('experiences');
                }}
                style={{ fontSize: 'var(--font-size-xs)', padding: 'var(--space-2) var(--space-3)' }}
              >
                <Icon name="plus" size={12} />
                <span>Experience</span>
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  handleAddEntry('projects');
                  toggleSection('projects');
                }}
                style={{ fontSize: 'var(--font-size-xs)', padding: 'var(--space-2) var(--space-3)' }}
              >
                <Icon name="plus" size={12} />
                <span>Project</span>
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  handleAddEntry('education');
                  toggleSection('education');
                }}
                style={{ fontSize: 'var(--font-size-xs)', padding: 'var(--space-2) var(--space-3)' }}
              >
                <Icon name="plus" size={12} />
                <span>Education</span>
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  handleAddEntry('customSections');
                  toggleSection('customSections');
                }}
                style={{ fontSize: 'var(--font-size-xs)', padding: 'var(--space-2) var(--space-3)' }}
              >
                <Icon name="plus" size={12} />
                <span>Custom Section</span>
              </button>
            </div>

            {/* Personal Information */}
            <CollapsibleSection
              sectionId="personalInfo"
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <Icon name="users" size={18} />
                  <span>Personal Information</span>
                </div>
              }
              description="Your contact information and professional links"
              isCollapsed={isSectionCollapsed('personalInfo')}
              onToggle={() => toggleSection('personalInfo')}
              progress={null}
            >
              <PersonalInfoEditor
                value={localResume.personalInfo}
                onChange={(info) => updateResume((draft) => {
                  draft.personalInfo = info;
                })}
                variant="compact"
              />
            </CollapsibleSection>

            {/* Skills */}
            <CollapsibleSection
              sectionId="skills"
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <Icon name="zap" size={18} />
                  <span>Skills</span>
                  <span className="section-count" style={{
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--text-tertiary)',
                    fontWeight: 'var(--font-weight-normal)'
                  }}>({getSectionCount('skills')})</span>
                </div>
              }
              description="Organize your skills into groups (e.g., Programming Languages, Frameworks, Tools)"
              isCollapsed={isSectionCollapsed('skills')}
              onToggle={() => toggleSection('skills')}
              progress={calculateSectionProgress('skills')}
            >
              <SkillsEditor
                skills={localResume.skills || []}
                onChange={(updatedSkills) => {
                  updateResume((draft) => {
                    draft.skills = updatedSkills;
                  });
                }}
              />
            </CollapsibleSection>

            {/* Education */}
            <CollapsibleSection
              sectionId="education"
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <Icon name="graduation" size={18} />
                  <span>Education</span>
                  <span className="section-count" style={{
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--text-tertiary)',
                    fontWeight: 'var(--font-weight-normal)'
                  }}>({getSectionCount('education')})</span>
                </div>
              }
              description="Add your educational background with degrees, institutions, and relevant coursework"
              isCollapsed={isSectionCollapsed('education')}
              onToggle={() => toggleSection('education')}
              progress={calculateSectionProgress('education')}
            >
              <SectionEditor
                key="education"
                config={SECTION_CONFIG.find(s => s.key === 'education')}
                entries={localResume.education || []}
                onFieldChange={handleEntryFieldChange}
                onAddEntry={handleAddEntry}
                onDeleteEntry={handleDeleteEntry}
                onAddBullet={handleAddBullet}
                onBulletChange={handleBulletChange}
                onDeleteBullet={handleDeleteBullet}
              />
            </CollapsibleSection>

            {/* Experience */}
            <CollapsibleSection
              sectionId="experiences"
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <Icon name="briefcase" size={18} />
                  <span>Work Experience</span>
                  <span className="section-count" style={{
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--text-tertiary)',
                    fontWeight: 'var(--font-weight-normal)'
                  }}>({getSectionCount('experiences')})</span>
                </div>
              }
              description="Add all your work experiences with detailed bullet points. Include achievements, metrics, and impact."
              isCollapsed={isSectionCollapsed('experiences')}
              onToggle={() => toggleSection('experiences')}
              progress={calculateSectionProgress('experiences')}
            >
              <SectionEditor
                key="experiences"
                config={SECTION_CONFIG.find(s => s.key === 'experiences')}
                entries={localResume.experiences || []}
                onFieldChange={handleEntryFieldChange}
                onAddEntry={handleAddEntry}
                onDeleteEntry={handleDeleteEntry}
                onAddBullet={handleAddBullet}
                onBulletChange={handleBulletChange}
                onDeleteBullet={handleDeleteBullet}
              />
            </CollapsibleSection>

            {/* Projects */}
            <CollapsibleSection
              sectionId="projects"
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <Icon name="folder" size={18} />
                  <span>Projects</span>
                  <span className="section-count" style={{
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--text-tertiary)',
                    fontWeight: 'var(--font-weight-normal)'
                  }}>({getSectionCount('projects')})</span>
                </div>
              }
              description="Showcase your personal projects, open source contributions, or side projects"
              isCollapsed={isSectionCollapsed('projects')}
              onToggle={() => toggleSection('projects')}
              progress={calculateSectionProgress('projects')}
            >
              <SectionEditor
                key="projects"
                config={SECTION_CONFIG.find(s => s.key === 'projects')}
                entries={localResume.projects || []}
                onFieldChange={handleEntryFieldChange}
                onAddEntry={handleAddEntry}
                onDeleteEntry={handleDeleteEntry}
                onAddBullet={handleAddBullet}
                onBulletChange={handleBulletChange}
                onDeleteBullet={handleDeleteBullet}
              />
            </CollapsibleSection>

            {/* Custom Sections */}
            <CollapsibleSection
              sectionId="customSections"
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <Icon name="award" size={18} />
                  <span>Custom Sections</span>
                  <span className="section-count" style={{
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--text-tertiary)',
                    fontWeight: 'var(--font-weight-normal)'
                  }}>({getSectionCount('customSections')})</span>
                </div>
              }
              description="Add certifications, awards, publications, or any other relevant sections"
              isCollapsed={isSectionCollapsed('customSections')}
              onToggle={() => toggleSection('customSections')}
              progress={calculateSectionProgress('customSections')}
            >
              <SectionEditor
                key="customSections"
                config={SECTION_CONFIG.find(s => s.key === 'customSections')}
                entries={localResume.customSections || []}
                onFieldChange={handleEntryFieldChange}
                onAddEntry={handleAddEntry}
                onDeleteEntry={handleDeleteEntry}
                onAddBullet={handleAddBullet}
                onBulletChange={handleBulletChange}
                onDeleteBullet={handleDeleteBullet}
              />
            </CollapsibleSection>
          </div>
        </div>
      </div>
    </div>
  );
}

function CollapsibleSection({ sectionId, title, description, isCollapsed, onToggle, children, progress }) {
  return (
    <div className={`selected-section ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="selected-section-header" onClick={onToggle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flex: 1 }}>
          <button
            className="section-toggle-button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            aria-label={isCollapsed ? `Expand ${typeof title === 'string' ? title : 'section'}` : `Collapse ${typeof title === 'string' ? title : 'section'}`}
          >
            <Icon 
              name={isCollapsed ? 'chevronRight' : 'chevronDown'} 
              size={16} 
            />
          </button>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0 }}>
              {typeof title === 'string' ? (
                <span>{title}</span>
              ) : (
                title
              )}
            </h3>
            {description && !isCollapsed && (
              <p style={{ 
                margin: 'var(--space-1) 0 0 0', 
                fontSize: 'var(--font-size-xs)', 
                color: 'var(--text-tertiary)',
                fontWeight: 'var(--font-weight-normal)'
              }}>
                {description}
              </p>
            )}
          </div>
        </div>
      </div>
      {progress && !isCollapsed && (
        <div className="section-progress-container">
          <div className="section-progress-bar">
            <div 
              className="section-progress-fill" 
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
          <div className="section-progress-text">
            <span>{progress.filled} of {progress.total} entries complete</span>
            <span>{progress.percentage}%</span>
          </div>
        </div>
      )}
      <div className="selected-section-content">
        {children}
      </div>
    </div>
  );
}

function SaveStatusIndicator({ status }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (status === 'saved') {
      const timer = setTimeout(() => {
        setVisible(false);
      }, 2000);
      return () => clearTimeout(timer);
    } else {
      setVisible(true);
    }
  }, [status]);

  if (!status || (!visible && status === 'saved')) {
    return null;
  }

  if (status === 'saved') {
    return (
      <div className="save-status-indicator saved">
        <Icon name="check" size={14} />
        <span>Saved</span>
      </div>
    );
  }

  if (status === 'saving') {
    return (
      <div className="save-status-indicator saving">
        <div className="save-spinner" />
        <span>Saving...</span>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="save-status-indicator error">
        <Icon name="x" size={14} />
        <span>Error saving</span>
      </div>
    );
  }

  return null;
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
          <div className="selected-section-empty" style={{
            padding: 'var(--space-8)',
            textAlign: 'center',
            background: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-md)',
            border: '2px dashed var(--color-slate-300)',
            transition: 'all var(--transition-base)'
          }}>
            <div style={{ 
              fontSize: '32px', 
              marginBottom: 'var(--space-3)',
              opacity: 0.5
            }}>
              {isExperience && <Icon name="briefcase" size={32} />}
              {isEducation && <Icon name="graduation" size={32} />}
              {isProject && <Icon name="folder" size={32} />}
              {!isExperience && !isEducation && !isProject && <Icon name="file" size={32} />}
            </div>
            <p style={{ 
              fontSize: 'var(--font-size-base)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--text-primary)',
              margin: '0 0 var(--space-2) 0'
            }}>
              {config.emptyMessage}
            </p>
            <p style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--text-tertiary)',
              margin: '0 0 var(--space-4) 0'
            }}>
              Click the button below to add your first {config.title.replace(/s$/, '').toLowerCase()}
            </p>
            <button
              className="btn btn-primary"
              onClick={() => onAddEntry(config.key)}
              style={{ fontSize: 'var(--font-size-sm)' }}
            >
              <Icon name="plus" size={16} />
              <span>Add {config.title.replace(/s$/, '')}</span>
            </button>
          </div>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="selected-entry">
              {isExperience ? (
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
                  <div className="entry-row-role">
                    <div className="entry-field-compact entry-field-role" style={{ flex: 1 }}>
                      <label>Project URL</label>
                      <input
                        type="url"
                        value={entry.url || ''}
                        onChange={(e) => onFieldChange(config.key, entry.id, 'url', e.target.value)}
                        placeholder="e.g., https://github.com/username/project"
                      />
                    </div>
                  </div>
                  <div className="entry-row-role">
                    <div className="entry-field-compact entry-field-role" style={{ flex: 1 }}>
                      <label>Description</label>
                      <textarea
                        value={entry.description || ''}
                        onChange={(e) => onFieldChange(config.key, entry.id, 'description', e.target.value)}
                        placeholder="Short project summary"
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
              ) : (
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
                  <span>{config.bulletLabel}s ({(entry.bullets || []).length})</span>
                  <button
                    className="btn btn-small"
                    onClick={() => onAddBullet(config.key, entry.id)}
                  >
                    + Add Bullet
                  </button>
                </div>

                {(entry.bullets || []).length === 0 ? (
                  <div className="selected-section-empty small" style={{
                    padding: 'var(--space-4)',
                    textAlign: 'center',
                    background: 'var(--color-slate-50)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px dashed var(--color-slate-300)',
                    marginTop: 'var(--space-2)'
                  }}>
                    <Icon name="lightbulb" size={16} style={{ 
                      display: 'block', 
                      margin: '0 auto var(--space-2)',
                      opacity: 0.6
                    }} />
                    <p style={{ 
                      margin: '0 0 var(--space-2) 0',
                      fontSize: 'var(--font-size-sm)',
                      color: 'var(--text-secondary)'
                    }}>
                      No bullets yet. Add one to highlight this entry.
                    </p>
                    <button
                      className="btn btn-secondary btn-small"
                      onClick={() => onAddBullet(config.key, entry.id)}
                      style={{ fontSize: 'var(--font-size-xs)' }}
                    >
                      <Icon name="plus" size={12} />
                      <span>Add Bullet</span>
                    </button>
                  </div>
                ) : (
                  (entry.bullets || []).map((bullet, index) => {
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
    bullets: Array.isArray(entry.bullets)
      ? entry.bullets.map((bullet, idx) => ({
          id: bullet.id || generateId(`bullet-${idx}`),
          text: bullet.text || ''
        }))
      : []
  }));
}

function normalizePersonalInfo(info) {
  if (!info || typeof info !== 'object') {
    return {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      linkedin: '',
      github: ''
    };
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
        bullets: []
      };
    case 'education':
      return {
        id: baseId,
        school: '',
        degree: '',
        field: '',
        startDate: '',
        endDate: '',
        bullets: []
      };
    case 'projects':
      return {
        id: baseId,
        name: '',
        description: '',
        technologies: '',
        url: '',
        startDate: '',
        endDate: '',
        bullets: []
      };
    case 'customSections':
    default:
      return {
        id: baseId,
        title: '',
        subtitle: '',
        bullets: []
      };
  }
}

function convertToMasterFormat(resume) {
  // Convert from internal format (with bullets) back to master resume format
  return {
    ...resume,
    experiences: (resume.experiences || []).map(entry => ({
      ...entry,
      bullets: entry.bullets || []
    })),
    education: (resume.education || []).map(entry => ({
      ...entry,
      bullets: entry.bullets || []
    })),
    projects: (resume.projects || []).map(entry => ({
      ...entry,
      bullets: entry.bullets || []
    })),
    customSections: (resume.customSections || []).map(entry => ({
      ...entry,
      bullets: entry.bullets || []
    }))
  };
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

function SkeletonLoader() {
  return (
    <div className="view-container">
      <div className="view-header">
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-text" style={{ width: '60%', marginTop: 'var(--space-2)' }} />
      </div>
      <div className="view-content">
        <div className="selected-resume-editor vertical-layout">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton-card">
              <div className="skeleton skeleton-title" />
              <div className="skeleton skeleton-input" />
              <div className="skeleton skeleton-input" />
              <div style={{ marginTop: 'var(--space-3)' }}>
                <div className="skeleton skeleton-bullet" />
                <div className="skeleton skeleton-bullet" />
                <div className="skeleton skeleton-bullet" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Profile;
