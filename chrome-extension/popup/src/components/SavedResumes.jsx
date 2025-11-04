import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storage';
import ExperienceEditor from './ExperienceEditor';
import EducationEditor from './EducationEditor';
import ProjectEditor from './ProjectEditor';
import CustomSectionEditor from './CustomSectionEditor';
import './SavedResumes.css';

/**
 * Saved Resumes Component
 * 
 * Tab 3: List of saved resumes with ability to view and delete
 */
function SavedResumes({ onLoadResume, refreshTrigger, masterResume }) {
  const [savedResumes, setSavedResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedResume, setSelectedResume] = useState(null);
  const [editedResume, setEditedResume] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newResumeName, setNewResumeName] = useState('');
  const [saving, setSaving] = useState(false);
  const [showAddBulletDialog, setShowAddBulletDialog] = useState(null); // { sectionType, entryId }
  const [availableBullets, setAvailableBullets] = useState([]);

  useEffect(() => {
    loadSavedResumes();
  }, [refreshTrigger]);

  async function loadSavedResumes() {
    setLoading(true);
    try {
      const resumes = await storageService.getSavedResumes();
      setSavedResumes(resumes);
    } catch (error) {
      console.error('Error loading saved resumes:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(resumeId) {
    try {
      await storageService.deleteSavedResume(resumeId);
      await loadSavedResumes();
      if (selectedResume?.id === resumeId) {
        setSelectedResume(null);
        setEditedBullets([]);
      }
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting resume:', error);
      alert('Error deleting resume');
    }
  }

  // Initialize edited resume structure when resume is selected
  useEffect(() => {
    if (selectedResume) {
      // Convert saved resume data to structured format (sections -> entries -> bullets)
      const savedData = selectedResume.data || {};
      
      // If it's in the old format (just selectedBullets), convert it
      if (savedData.selectedBullets && !savedData.experiences) {
        // Convert flat bullet list to structured format
        const structured = {
          experiences: [],
          education: [],
          projects: [],
          customSections: []
        };
        
        // Create a single entry for each bullet (basic conversion)
        savedData.selectedBullets.forEach((bullet, index) => {
          structured.experiences.push({
            id: `exp-${index}`,
            company: 'Experience',
            role: '',
            startDate: '',
            endDate: '',
            bullets: [bullet]
          });
        });
        
        setEditedResume(structured);
      } else {
        // Already in structured format
        setEditedResume({
          experiences: savedData.experiences || [],
          education: savedData.education || [],
          projects: savedData.projects || [],
          customSections: savedData.customSections || []
        });
      }
    }
  }, [selectedResume]);

  // Collect all available bullets from master resume
  function collectMasterBullets() {
    if (!masterResume) return [];
    
    const allBullets = [];
    
    // Collect from experiences
    (masterResume.experiences || []).forEach(exp => {
      (exp.bullets || []).forEach(bullet => {
        allBullets.push({
          ...bullet,
          sourceSection: 'experiences',
          sourceEntryId: exp.id,
          sourceEntryName: `${exp.company} - ${exp.role}`
        });
      });
    });
    
    // Collect from education
    (masterResume.education || []).forEach(edu => {
      (edu.bullets || []).forEach(bullet => {
        allBullets.push({
          ...bullet,
          sourceSection: 'education',
          sourceEntryId: edu.id,
          sourceEntryName: `${edu.school} - ${edu.degree} ${edu.field}`
        });
      });
    });
    
    // Collect from projects
    (masterResume.projects || []).forEach(proj => {
      (proj.bullets || []).forEach(bullet => {
        allBullets.push({
          ...bullet,
          sourceSection: 'projects',
          sourceEntryId: proj.id,
          sourceEntryName: proj.name
        });
      });
    });
    
    // Collect from custom sections
    (masterResume.customSections || []).forEach(section => {
      (section.bullets || []).forEach(bullet => {
        allBullets.push({
          ...bullet,
          sourceSection: 'customSections',
          sourceEntryId: section.id,
          sourceEntryName: section.title
        });
      });
    });
    
    return allBullets;
  }

  function handleAddEntry(sectionType) {
    const newEntry = getDefaultEntry(sectionType);
    const updated = { ...editedResume };
    updated[sectionType] = [...(updated[sectionType] || []), newEntry];
    setEditedResume(updated);
  }

  function handleUpdateEntry(sectionType, updatedEntry) {
    const updated = { ...editedResume };
    updated[sectionType] = updated[sectionType].map(entry =>
      entry.id === updatedEntry.id ? updatedEntry : entry
    );
    setEditedResume(updated);
  }

  function handleDeleteEntry(sectionType, entryId) {
    const updated = { ...editedResume };
    updated[sectionType] = updated[sectionType].filter(entry => entry.id !== entryId);
    setEditedResume(updated);
  }

  function handleAddBulletToEntry(sectionType, entryId) {
    setShowAddBulletDialog({ sectionType, entryId });
    setAvailableBullets(collectMasterBullets());
  }

  function handleSelectBulletToAdd(bullet) {
    if (!showAddBulletDialog) return;
    
    const { sectionType, entryId } = showAddBulletDialog;
    const updated = { ...editedResume };
    const entry = updated[sectionType].find(e => e.id === entryId);
    
    if (entry) {
      const newBullet = {
        id: `bullet-${Date.now()}`,
        text: bullet.text || bullet.rewritten || '',
        original: bullet.text || bullet.original || ''
      };
      entry.bullets = [...(entry.bullets || []), newBullet];
      setEditedResume({ ...updated });
    }
    
    setShowAddBulletDialog(null);
  }

  function getDefaultEntry(sectionType) {
    const timestamp = Date.now();
    switch (sectionType) {
      case 'experiences':
        return {
          id: `exp-${timestamp}`,
          company: '',
          role: '',
          startDate: '',
          endDate: '',
          bullets: []
        };
      case 'education':
        return {
          id: `edu-${timestamp}`,
          school: '',
          degree: '',
          field: '',
          startDate: '',
          endDate: '',
          bullets: []
        };
      case 'projects':
        return {
          id: `proj-${timestamp}`,
          name: '',
          description: '',
          technologies: '',
          startDate: '',
          endDate: '',
          bullets: []
        };
      case 'customSections':
        return {
          id: `custom-${timestamp}`,
          title: '',
          subtitle: '',
          bullets: []
        };
      default:
        return { id: `entry-${timestamp}`, bullets: [] };
    }
  }

  async function handleSaveAsNew() {
    if (!newResumeName.trim()) {
      alert('Please enter a name for the new resume');
      return;
    }

    setSaving(true);
    try {
      const resumeData = {
        experiences: editedResume.experiences || [],
        education: editedResume.education || [],
        projects: editedResume.projects || [],
        customSections: editedResume.customSections || [],
        jobDescription: selectedResume.data?.jobDescription || ''
      };

      await storageService.saveGeneratedResume(newResumeName.trim(), resumeData);
      
      // Reset state
      setShowSaveDialog(false);
      setNewResumeName('');
      
      // Reload saved resumes
      await loadSavedResumes();
      
      if (onLoadResume) {
        onLoadResume();
      }

      alert('Resume saved successfully!');
    } catch (error) {
      console.error('Error saving resume:', error);
      alert('Error saving resume');
    } finally {
      setSaving(false);
    }
  }

  function formatDate(timestamp) {
    if (!timestamp) return 'Unknown date';
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  if (loading) {
    return (
      <div className="saved-resumes">
        <div className="section">
          <p>Loading saved resumes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="saved-resumes">
      {savedResumes.length === 0 ? (
        <div className="section">
          <div className="empty-state">
            <p>No saved resumes yet.</p>
            <p className="empty-hint">Generate and save a resume to see it here.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="section">
            <h2>Saved Resumes ({savedResumes.length})</h2>
            <p className="section-description">
              Click on a resume to view it. Resumes are sorted by newest first.
            </p>

            <div className="resume-list">
              {savedResumes.map(resume => (
                <div
                  key={resume.id}
                  className={`resume-item ${selectedResume?.id === resume.id ? 'selected' : ''}`}
                  onClick={() => setSelectedResume(resume)}
                >
                  <div className="resume-item-content">
                    <h3 className="resume-name">{resume.name}</h3>
                    <p className="resume-meta">
                      {formatDate(resume.createdAt)} • {resume.data?.selectedBullets?.length || 0} bullets
                    </p>
                  </div>
                  <div className="resume-item-actions">
                    <button
                      className="btn-icon-small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteConfirm(resume.id);
                      }}
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedResume && (
            <div className="section">
              <div className="section-header-with-action">
                <h2>{selectedResume.name}</h2>
                <div className="header-actions">
                  <button
                    className="btn btn-primary"
                    onClick={() => setShowSaveDialog(true)}
                  >
                    💾 Save As New Resume
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setSelectedResume(null);
                      setEditedResume(null);
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
              
              <div className="resume-details">
                <div className="detail-row">
                  <span className="detail-label">Created:</span>
                  <span className="detail-value">{formatDate(selectedResume.createdAt)}</span>
                </div>
                {selectedResume.data?.jobDescription && (
                  <div className="detail-row">
                    <span className="detail-label">Job Description:</span>
                    <span className="detail-value">
                      {selectedResume.data.jobDescription.substring(0, 100)}...
                    </span>
                  </div>
                )}
              </div>

              {/* Structured Resume Editor */}
              {editedResume && (
                <div className="resume-editor">
                  {/* Work Experience Section */}
                  <div className="resume-section-group">
                    <div className="section-group-header">
                      <h3 className="section-group-title">Work Experience</h3>
                      <button
                        className="btn btn-small btn-primary"
                        onClick={() => handleAddEntry('experiences')}
                      >
                        + Add Experience
                      </button>
                    </div>
                    
                    {(!editedResume.experiences || editedResume.experiences.length === 0) ? (
                      <div className="empty-state">
                        <p>No experiences yet. Add your first experience!</p>
                      </div>
                    ) : (
                      editedResume.experiences.map(experience => (
                        <ExperienceEditor
                          key={experience.id}
                          experience={experience}
                          onUpdate={(updatedExp) => handleUpdateEntry('experiences', updatedExp)}
                          onDelete={(expId) => handleDeleteEntry('experiences', expId)}
                          onAddBulletFromMaster={() => handleAddBulletToEntry('experiences', experience.id)}
                        />
                      ))
                    )}
                  </div>

                  {/* Education Section */}
                  <div className="resume-section-group">
                    <div className="section-group-header">
                      <h3 className="section-group-title">Education</h3>
                      <button
                        className="btn btn-small btn-primary"
                        onClick={() => handleAddEntry('education')}
                      >
                        + Add Education
                      </button>
                    </div>
                    
                    {(!editedResume.education || editedResume.education.length === 0) ? (
                      <div className="empty-state">
                        <p>No education entries yet. Add your first education!</p>
                      </div>
                    ) : (
                      editedResume.education.map(edu => (
                        <EducationEditor
                          key={edu.id}
                          education={edu}
                          onUpdate={(updatedEdu) => handleUpdateEntry('education', updatedEdu)}
                          onDelete={(eduId) => handleDeleteEntry('education', eduId)}
                          onAddBulletFromMaster={() => handleAddBulletToEntry('education', edu.id)}
                        />
                      ))
                    )}
                  </div>

                  {/* Projects Section */}
                  <div className="resume-section-group">
                    <div className="section-group-header">
                      <h3 className="section-group-title">Projects</h3>
                      <button
                        className="btn btn-small btn-primary"
                        onClick={() => handleAddEntry('projects')}
                      >
                        + Add Project
                      </button>
                    </div>
                    
                    {(!editedResume.projects || editedResume.projects.length === 0) ? (
                      <div className="empty-state">
                        <p>No projects yet. Add your first project!</p>
                      </div>
                    ) : (
                      editedResume.projects.map(project => (
                        <ProjectEditor
                          key={project.id}
                          project={project}
                          onUpdate={(updatedProj) => handleUpdateEntry('projects', updatedProj)}
                          onDelete={(projId) => handleDeleteEntry('projects', projId)}
                          onAddBulletFromMaster={() => handleAddBulletToEntry('projects', project.id)}
                        />
                      ))
                    )}
                  </div>

                  {/* Custom Sections */}
                  <div className="resume-section-group">
                    <div className="section-group-header">
                      <h3 className="section-group-title">Custom Sections</h3>
                      <button
                        className="btn btn-small btn-primary"
                        onClick={() => handleAddEntry('customSections')}
                      >
                        + Add Custom Section
                      </button>
                    </div>
                    
                    {(!editedResume.customSections || editedResume.customSections.length === 0) ? (
                      <div className="empty-state">
                        <p>No custom sections yet. Add certifications, skills, awards, etc.!</p>
                      </div>
                    ) : (
                      editedResume.customSections.map(section => (
                        <CustomSectionEditor
                          key={section.id}
                          section={section}
                          onUpdate={(updatedSection) => handleUpdateEntry('customSections', updatedSection)}
                          onDelete={(sectionId) => handleDeleteEntry('customSections', sectionId)}
                          onAddBulletFromMaster={() => handleAddBulletToEntry('customSections', section.id)}
                        />
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Save As New Dialog */}
      {showSaveDialog && (
        <div className="save-dialog-overlay">
          <div className="save-dialog">
            <h3>Save As New Resume</h3>
            <p className="dialog-description">
              Enter a name for this resume (e.g., "Google SWE v2", "Meta Frontend Updated")
            </p>
            <input
              type="text"
              className="resume-name-input"
              value={newResumeName}
              onChange={(e) => setNewResumeName(e.target.value)}
              placeholder="Resume name..."
              autoFocus
              onKeyPress={(e) => {
                if (e.key === 'Enter' && newResumeName.trim()) {
                  handleSaveAsNew();
                }
              }}
            />
            <div className="dialog-actions">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowSaveDialog(false);
                  setNewResumeName('');
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSaveAsNew}
                disabled={!newResumeName.trim() || saving}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Bullet Dialog - Select from Master Resume */}
      {showAddBulletDialog && (
        <div className="save-dialog-overlay">
          <div className="save-dialog" style={{ maxWidth: '600px', maxHeight: '80vh', overflow: 'auto' }}>
            <h3>Add Bullet from Master Resume</h3>
            <p className="dialog-description">
              Select a bullet point from your master resume to add to this entry.
            </p>
            <div className="bullets-selection-list">
              {availableBullets.length === 0 ? (
                <div className="empty-state-small">
                  <p>No bullets available in master resume.</p>
                </div>
              ) : (
                availableBullets.map((bullet, index) => (
                  <div
                    key={bullet.id || index}
                    className="bullet-selection-item"
                    onClick={() => handleSelectBulletToAdd(bullet)}
                  >
                    <div className="bullet-selection-text">
                      {bullet.text || bullet.rewritten || 'No text'}
                    </div>
                    <div className="bullet-selection-source">
                      From: {bullet.sourceEntryName || 'Unknown'}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="dialog-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowAddBulletDialog(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="save-dialog-overlay">
          <div className="save-dialog">
            <h3>Delete Resume?</h3>
            <p className="dialog-description">
              Are you sure you want to delete this resume? This action cannot be undone.
            </p>
            <div className="dialog-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowDeleteConfirm(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={() => handleDelete(showDeleteConfirm)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SavedResumes;

