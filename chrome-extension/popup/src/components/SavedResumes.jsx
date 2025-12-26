import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storage';
import { supabase } from '../config/supabase';
import { useToast } from '../hooks/useToast';
import { SkeletonList, SkeletonCard } from './Skeleton';
import Tooltip from './Tooltip';
import { Trash2, FileText, Calendar } from 'lucide-react';
import { Icon } from './Icons';
import SelectedResumeEditor from './SelectedResumeEditor';
import LatexPreviewModal from './LatexPreviewModal';
import ShareResumeButton from './ShareResumeButton';
import { renderLatex } from '../services/api';
import { buildLatexDocument } from '../utils/latexTemplate';
import './SavedResumes.css';

const DEFAULT_PERSONAL_INFO = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  linkedin: '',
  github: ''
};

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

function normalizeSkills(skills) {
  if (!Array.isArray(skills)) {
    return [];
  }

  return skills.map((group, index) => ({
    id: typeof group?.id === 'string' && group.id.length > 0 ? group.id : `skill-${Date.now()}-${index}`,
    title: typeof group?.title === 'string' ? group.title : '',
    skills: Array.isArray(group?.skills)
      ? group.skills.map(skill => (typeof skill === 'string' ? skill : '')).filter(Boolean)
      : []
  }));
}

function normalizeBullet(bullet, prefix, index) {
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
}

function normalizeSectionEntries(entries, sectionPrefix) {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries.map((entry, entryIndex) => {
    const entryId = entry.id || `${sectionPrefix}-${entryIndex}-${Date.now()}`;
    const candidateBullets = Array.isArray(entry.bullets) && entry.bullets.length > 0
      ? entry.bullets
      : Array.isArray(entry.selectedBullets)
        ? entry.selectedBullets
        : [];

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
}

function buildSelectedBullets(entry, prefix) {
  const source = Array.isArray(entry.selectedBullets) && entry.selectedBullets.length > 0
    ? entry.selectedBullets
    : Array.isArray(entry.bullets)
      ? entry.bullets
      : [];

  return source
    .map((bullet, index) => {
      const normalized = normalizeBullet(bullet, `${prefix}-selected`, index);
      const text = typeof normalized.text === 'string' ? normalized.text.trim() : '';
      if (!text) {
        return null;
      }
      return {
        id: normalized.id,
        text,
        relevanceScore: typeof bullet?.relevanceScore === 'number' ? bullet.relevanceScore : 0.0,
        lineCount: typeof bullet?.lineCount === 'number' ? bullet.lineCount : undefined,
        original: normalized.original || bullet?.original || undefined,
        rewritten: bullet?.rewritten || undefined,
        reasoning: bullet?.reasoning || undefined
      };
    })
    .filter(Boolean);
}

function mapExperiencesForSelectedResume(entries = []) {
  return normalizeSectionEntries(entries, 'experience')
    .map((entry, index) => {
      const entryId = entry.id || `experience-${index}`;
      const selectedBullets = buildSelectedBullets(entry, entryId);
      if (selectedBullets.length === 0 && !(entry.company || entry.role)) {
        return null;
      }
      return {
        id: entryId,
        company: entry.company || '',
        role: entry.role || '',
        startDate: entry.startDate || null,
        endDate: entry.endDate || null,
        selectedBullets
      };
    })
    .filter(Boolean);
}

function mapProjectsForSelectedResume(entries = []) {
  return normalizeSectionEntries(entries, 'project')
    .map((entry, index) => {
      const entryId = entry.id || `project-${index}`;
      const selectedBullets = buildSelectedBullets(entry, entryId);
      return {
        id: entryId,
        name: entry.name || '',
        description: entry.description || '',
        technologies: entry.technologies || null,
        startDate: entry.startDate || null,
        endDate: entry.endDate || null,
        selectedBullets
      };
    })
    .filter(Boolean);
}

function mapCustomSectionsForSelectedResume(entries = []) {
  return normalizeSectionEntries(entries, 'custom')
    .map((entry, index) => {
      const entryId = entry.id || `custom-${index}`;
      const selectedBullets = buildSelectedBullets(entry, entryId);
      if (selectedBullets.length === 0 && !entry.title) {
        return null;
      }
      return {
        id: entryId,
        title: entry.title || '',
        subtitle: entry.subtitle || null,
        selectedBullets
      };
    })
    .filter(Boolean);
}

function mapEducationForSelectedResume(masterEducation = []) {
  return normalizeSectionEntries(masterEducation, 'education')
    .map((entry, index) => {
      const entryId = entry.id || `education-${index}`;
      const selectedBullets = buildSelectedBullets(entry, entryId);
      return {
        id: entryId,
        school: entry.school || '',
        degree: entry.degree || '',
        field: entry.field || '',
        startDate: entry.startDate || null,
        endDate: entry.endDate || null,
        selectedBullets
      };
    });
}

function buildSelectedResumePayload(resume, masterResume) {
  const baseResume = resume || {};
  const master = masterResume || {};

  return {
    personalInfo: normalizePersonalInfo(master.personalInfo),
    skills: normalizeSkills(master.skills),
    experiences: mapExperiencesForSelectedResume(baseResume.experiences),
    education: mapEducationForSelectedResume(master.education),
    projects: mapProjectsForSelectedResume(baseResume.projects),
    customSections: mapCustomSectionsForSelectedResume(baseResume.customSections)
  };
}

function getStructuredBulletCount(data) {
  if (!data) return 0;

  const experiences = Array.isArray(data.experiences) ? data.experiences : [];
  const education = Array.isArray(data.education) ? data.education : [];
  const projects = Array.isArray(data.projects) ? data.projects : [];
  const customSections = Array.isArray(data.customSections) ? data.customSections : [];
  const skills = Array.isArray(data.skills) ? data.skills : [];

  const fromSkills = skills.reduce((sum, group) => sum + (Array.isArray(group?.skills) ? group.skills.filter(Boolean).length : 0), 0);

  const fromSections = (sections) => sections.reduce((sum, entry) => sum + (Array.isArray(entry?.bullets) ? entry.bullets.length : 0), 0);

  return fromSkills + fromSections(experiences) + fromSections(education) + fromSections(projects) + fromSections(customSections);
}

function flattenStructuredResume(resume) {
  if (!resume) return [];

  const result = [];

  const append = (entries = [], sectionType) => {
    entries.forEach((entry) => {
      (entry.bullets || entry.selectedBullets || []).forEach((bullet, index) => {
        result.push({
          id: bullet.id || `${sectionType}-${entry.id || index}-${index}`,
          text: typeof bullet.text === 'string' ? bullet.text : '',
          sectionType,
          parentId: entry.id,
          parentTitle: entry.company || entry.school || entry.name || entry.title || '',
          parentRole: entry.role || entry.degree || entry.subtitle || ''
        });
      });
    });
  };

  append(resume.experiences, 'experience');
  append(resume.education, 'education');
  append(resume.projects, 'project');
  append(resume.customSections, 'custom');

  return result;
}

/**
 * Saved Resumes Component
 * 
 * Tab 3: List of saved resumes with ability to view and delete
 */
function SavedResumes({ onLoadResume, refreshTrigger, masterResume }) {
  const [savedResumes, setSavedResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const { success, error: showError } = useToast();
  const [selectedResume, setSelectedResume] = useState(null);
  const [editedResume, setEditedResume] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newResumeName, setNewResumeName] = useState('');
  const [saving, setSaving] = useState(false);
  const [showLatexPreview, setShowLatexPreview] = useState(false);
  const [latexSource, setLatexSource] = useState('');
  const [latexPdfBase64, setLatexPdfBase64] = useState(null);
  const [renderingPdf, setRenderingPdf] = useState(false);

  useEffect(() => {
    loadSavedResumes();
  }, [refreshTrigger]);

  async function loadSavedResumes() {
    setLoading(true);
    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setSavedResumes([]);
        setLoading(false);
        return;
      }

      // Load from Supabase
      const { data, error } = await supabase
        .from('saved_resumes')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform Supabase data to match expected format
      const transformedResumes = (data || []).map(resume => ({
        id: resume.id,
        name: resume.name,
        data: resume.resume_data,
        createdAt: resume.created_at ? new Date(resume.created_at).getTime() : Date.now(),
        updatedAt: resume.updated_at ? new Date(resume.updated_at).getTime() : Date.now()
      }));

      setSavedResumes(transformedResumes);
    } catch (error) {
      console.error('Error loading saved resumes:', error);
      // Fallback to Chrome Storage if Supabase fails
      try {
        const resumes = await storageService.getSavedResumes();
        setSavedResumes(resumes);
      } catch (fallbackError) {
        console.error('Fallback to Chrome Storage also failed:', fallbackError);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(resumeId) {
    try {
      // Check if it's a UUID (Supabase) or Chrome Storage ID
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resumeId);
      
      if (isUUID) {
        // Delete from Supabase
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('Not signed in');
        }

        const { error } = await supabase
          .from('saved_resumes')
          .delete()
          .eq('id', resumeId)
          .eq('user_id', session.user.id);

        if (error) throw error;
      } else {
        // Delete from Chrome Storage (fallback)
        await storageService.deleteSavedResume(resumeId);
      }

      await loadSavedResumes();
      if (selectedResume?.id === resumeId) {
        setSelectedResume(null);
        setEditedResume(null);
      }
      setShowDeleteConfirm(null);
      success('Resume deleted');
    } catch (error) {
      console.error('Error deleting resume:', error);
      showError('Failed to delete resume: ' + error.message);
    }
  }

  // Initialize edited resume structure when resume is selected
  useEffect(() => {
    if (selectedResume) {
      // Convert saved resume data to structured format (sections -> entries -> bullets)
      const savedData = selectedResume.data || {};
      
      // If it's in the old format (just selectedBullets), convert it
      const sharedPersonalInfo = normalizePersonalInfo(masterResume?.personalInfo);
      const sharedSkills = normalizeSkills(masterResume?.skills);
      const sharedEducation = normalizeSectionEntries(masterResume?.education, 'education');

      if (savedData.selectedBullets && !savedData.experiences) {
        // Convert flat bullet list to structured format
        const structured = {
          personalInfo: sharedPersonalInfo,
          skills: sharedSkills,
          experiences: [],
          education: sharedEducation,
          projects: [],
          customSections: []
        };
        
        // Create a single entry for each bullet (basic conversion)
        savedData.selectedBullets.forEach((bullet, index) => {
          const normalizedBullet = normalizeBullet(bullet, `legacy-exp-${index}`, 0);
          structured.experiences.push({
            id: `exp-${index}`,
            company: 'Experience',
            role: '',
            startDate: '',
            endDate: '',
            bullets: [normalizedBullet],
            selectedBullets: [normalizedBullet]
          });
        });
        
        setEditedResume(structured);
      } else {
        // Already in structured format
        setEditedResume({
          personalInfo: sharedPersonalInfo,
          skills: sharedSkills,
          experiences: normalizeSectionEntries(savedData.experiences, 'experience'),
          education: sharedEducation,
          projects: normalizeSectionEntries(savedData.projects, 'project'),
          customSections: normalizeSectionEntries(savedData.customSections, 'custom')
        });
      }
    }
  }, [selectedResume, masterResume]);

  useEffect(() => {
    if (!editedResume || !selectedResume) {
      return;
    }

    setEditedResume((prev) => ({
      ...prev,
      personalInfo: normalizePersonalInfo(masterResume?.personalInfo),
      skills: normalizeSkills(masterResume?.skills),
      education: normalizeSectionEntries(masterResume?.education, 'education')
    }));
  }, [
    masterResume?.personalInfo,
    masterResume?.skills,
    masterResume?.education,
    selectedResume?.id
  ]);

  useEffect(() => {
    setShowLatexPreview(false);
    setLatexSource('');
    setLatexPdfBase64(null);
  }, [selectedResume?.id]);

  // Collect all available bullets from master resume


  function openLatexPreview() {
    if (!editedResume) {
      alert('Select a resume to preview.');
      return;
    }

    try {
      const selectedPayload = buildSelectedResumePayload(editedResume, masterResume);
      const latex = buildLatexDocument(selectedPayload);
      setLatexSource(latex);
      setLatexPdfBase64(null);
      setShowLatexPreview(true);
    } catch (error) {
      console.error('Error building LaTeX for saved resume:', error);
      alert('Unable to generate LaTeX for this resume. Please check that all sections are filled out correctly.');
    }
  }

  async function copyLatexToClipboard() {
    try {
      await navigator.clipboard.writeText(latexSource);
      alert('LaTeX copied to clipboard!');
    } catch (error) {
      console.error('Clipboard copy failed:', error);
      alert('Could not copy to clipboard. Please copy manually.');
    }
  }

  function downloadLatex() {
    if (!latexSource) {
      return;
    }

    const fileName = (selectedResume?.name || 'saved_resume').replace(/\s+/g, '_');
    const blob = new Blob([latexSource], { type: 'application/x-tex' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}.tex`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function renderPdfPreview() {
    if (!editedResume) {
      return;
    }

    setRenderingPdf(true);
    setLatexPdfBase64(null);
    try {
      const selectedPayload = buildSelectedResumePayload(editedResume, masterResume);
      const response = await renderLatex(selectedPayload);
      if (response?.pdf_base64) {
        setLatexPdfBase64(response.pdf_base64);
      } else {
        alert('LaTeX render did not return a PDF.');
      }
    } catch (error) {
      console.error('Failed to render PDF for saved resume:', error);
      alert(error?.message || 'Failed to render PDF preview.');
    } finally {
      setRenderingPdf(false);
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
        personalInfo: normalizePersonalInfo(editedResume.personalInfo),
        skills: normalizeSkills(editedResume.skills),
        experiences: editedResume.experiences || [],
        education: editedResume.education || [],
        projects: editedResume.projects || [],
        customSections: editedResume.customSections || [],
        jobDescription: selectedResume.data?.jobDescription || '',
        selectedBullets: flattenStructuredResume(editedResume)
      };

      // Save to Supabase
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { error } = await supabase
          .from('saved_resumes')
          .insert({
            user_id: session.user.id,
            name: newResumeName.trim(),
            resume_data: resumeData
          });

        if (error) throw error;
      } else {
        // Fallback to Chrome Storage if not signed in
        await storageService.saveGeneratedResume(newResumeName.trim(), resumeData);
      }
      
      // Reset state
      setShowSaveDialog(false);
      setNewResumeName('');
      
      // Reload saved resumes
      await loadSavedResumes();
      
      if (onLoadResume) {
        onLoadResume();
      }

      success('Resume saved successfully!');
    } catch (error) {
      console.error('Error saving resume:', error);
      showError('Failed to save resume: ' + error.message);
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
        <div className="view-header">
          <h1>Saved Resumes</h1>
          <p className="view-subtitle">View and manage your saved resumes</p>
        </div>
        <SkeletonList items={3} />
      </div>
    );
  }

  // Calculate stats
  const totalBullets = savedResumes.reduce((sum, r) => sum + getStructuredBulletCount(r.data), 0);
  const avgBulletsPerResume = savedResumes.length > 0 ? Math.round(totalBullets / savedResumes.length) : 0;

  return (
    <div className="saved-resumes">
      {/* Header Section */}
      <div className="saved-resumes-header-section">
        <div className="view-header">
          <h1>Saved Resumes</h1>
          <p className="view-subtitle">View, edit, and manage your saved resumes</p>
        </div>

        {/* Stats Cards */}
        {savedResumes.length > 0 && (
          <div className="saved-resumes-stats">
            <div className="stat-card">
              <div className="stat-icon stat-icon-primary">
                <FileText size={20} />
              </div>
              <div className="stat-content">
                <div className="stat-value">{savedResumes.length}</div>
                <div className="stat-label">Saved Resumes</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon stat-icon-secondary">
                <Icon name="fileText" size={20} />
              </div>
              <div className="stat-content">
                <div className="stat-value">{totalBullets}</div>
                <div className="stat-label">Total Bullets</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon stat-icon-tertiary">
                <Icon name="chart" size={20} />
              </div>
              <div className="stat-content">
                <div className="stat-value">{avgBulletsPerResume}</div>
                <div className="stat-label">Avg per Resume</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {savedResumes.length === 0 ? (
        <div className="saved-resumes-empty-modern">
          <div className="empty-state-icon">
            <FileText size={64} />
          </div>
          <h3>No saved resumes yet</h3>
          <p>Generate and save your first resume to get started. Create tailored resumes for different job applications.</p>
        </div>
      ) : (
        <>
          <div className="section">
            <div className="section-header-modern">
              <div>
                <h2>Your Resumes</h2>
                <p className="section-description">
                  Click on a resume to view and edit it. Resumes are sorted by newest first.
                </p>
              </div>
            </div>

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
                      <Calendar size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                      {formatDate(resume.createdAt)} • {getStructuredBulletCount(resume.data)} bullets
                    </p>
                  </div>
                  <div className="resume-item-actions">
                    <ShareResumeButton 
                      resumeId={resume.id}
                      resumeName={resume.name}
                    />
                    <Tooltip content="Delete resume">
                      <button
                        className="btn-icon-small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDeleteConfirm(resume.id);
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </Tooltip>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedResume && (
            <>
              <div className="section">
                <div className="section-header-modern-with-action">
                  <div>
                    <h2>{selectedResume.name}</h2>
                    <p className="section-description">
                      Created: {formatDate(selectedResume.createdAt)} • 
                      Updated: {formatDate(selectedResume.updatedAt)} • 
                      {getStructuredBulletCount(selectedResume.data)} bullets
                      {selectedResume.data?.jobDescription && (
                        <>
                          <br />
                          <strong>Job:</strong> {selectedResume.data.jobDescription.substring(0, 100)}
                          {selectedResume.data.jobDescription.length > 100 ? '...' : ''}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="section-header-actions">
                    <button
                      className="btn btn-secondary btn-modern"
                      onClick={openLatexPreview}
                      disabled={!editedResume}
                    >
                      <Icon name="eye" size={16} />
                      LaTeX Preview
                    </button>
                    <button
                      className="btn btn-primary btn-modern"
                      onClick={() => setShowSaveDialog(true)}
                      disabled={!editedResume || saving}
                    >
                      <Icon name="save" size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                      Save As New
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => {
                        setSelectedResume(null);
                        setEditedResume(null);
                        setShowLatexPreview(false);
                        setLatexPdfBase64(null);
                      }}
                    >
                      <Icon name="x" size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                      Close
                    </button>
                  </div>
                </div>
              </div>

              {/* Resume Editor with Carousel */}
              {editedResume && (
                <div className="section">
                  <SelectedResumeEditor
                    resume={editedResume}
                    onUpdate={setEditedResume}
                    showPersonalInfo={true}
                    showSkills={true}
                    showEducation={true}
                  />
                </div>
              )}
            </>
          )}
        </>
      )}

      <LatexPreviewModal
        open={showLatexPreview}
        latexSource={latexSource}
        onClose={() => setShowLatexPreview(false)}
        onCopy={copyLatexToClipboard}
        onDownloadTex={downloadLatex}
        onRefreshPdf={renderPdfPreview}
        pdfBase64={latexPdfBase64}
        loadingPdf={renderingPdf}
      />

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

