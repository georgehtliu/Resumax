import React, { useState, useEffect, useMemo, useRef } from 'react';
import { storageService } from '../services/storage';
import { supabase } from '../config/supabase';
import { useToast } from '../hooks/useToast';
import { SkeletonList, SkeletonCard } from './ui/Skeleton';
import Tooltip from './ui/Tooltip';
import { Trash2, Calendar } from 'lucide-react';
import { Icon } from './ui/Icons';
import SelectedResumeEditor from './editors/SelectedResumeEditor';
import LatexPreviewModal from './modals/LatexPreviewModal';
import ShareResumeButton from './ShareResumeButton';
import ToastContainer from './ui/ToastContainer';
import PdfViewerWithOverlays from './pdf/PdfViewerWithOverlays';
import { renderLatex } from '../services/api';
import { buildLatexDocument } from '../utils/latexTemplate';
import { formatRelativeTime, isRecent } from '../utils/dateUtils';
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
        location: entry.location || null,
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
  const { toasts, removeToast, success, error: showError } = useToast();
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
  const [jobDescriptionExpanded, setJobDescriptionExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const previewRef = useRef(null);

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
    setJobDescriptionExpanded(false);
  }, [selectedResume?.id]);

  // Auto-generate LaTeX when editedResume changes
  useEffect(() => {
    if (editedResume) {
      try {
        const selectedPayload = buildSelectedResumePayload(editedResume, masterResume);
        const latex = buildLatexDocument(selectedPayload);
        setLatexSource(latex);
      } catch (error) {
        console.error('Error building LaTeX preview:', error);
      }
    }
  }, [editedResume, masterResume]);

  // Auto-render PDF when resume is first selected (but not on every update to avoid excessive API calls)
  useEffect(() => {
    if (editedResume && !latexPdfBase64 && !renderingPdf) {
      // Small delay to let LaTeX generate first
      const timer = setTimeout(() => {
        renderPdfPreview();
      }, 500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editedResume]);

  // Auto-scroll to preview when a resume is selected
  useEffect(() => {
    if (selectedResume && editedResume && previewRef.current) {
      // Small delay to ensure the preview section is rendered
      const timer = setTimeout(() => {
        previewRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [selectedResume, editedResume]);

  // Collect all available bullets from master resume


  function openLatexPreview() {
    if (!editedResume) {
      showError('Select a resume to preview.');
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
      showError('Unable to generate LaTeX for this resume. Please check that all sections are filled out correctly.');
    }
  }

  function downloadPdf() {
    if (!latexPdfBase64) {
      showError('No PDF available to download. Please regenerate the PDF first.');
      return;
    }

    try {
      // Convert base64 to blob
      const byteCharacters = atob(latexPdfBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 10);
      const resumeName = selectedResume?.name || 'resume';
      const filename = `${resumeName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${timestamp}.pdf`;
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download PDF failed:', error);
      showError('Failed to download PDF. Please try again.');
    }
  }

  async function copyLatexToClipboard() {
    try {
      await navigator.clipboard.writeText(latexSource);
      success('LaTeX copied to clipboard!');
    } catch (error) {
      console.error('Clipboard copy failed:', error);
      showError('Could not copy to clipboard. Please copy manually.');
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
        showError('LaTeX render did not return a PDF.');
      }
    } catch (error) {
      console.error('Failed to render PDF for saved resume:', error);
      showError(error?.message || 'Failed to render PDF preview.');
    } finally {
      setRenderingPdf(false);
    }
  }


  async function handleSaveAsNew() {
    if (!newResumeName.trim()) {
      showError('Please enter a name for the new resume');
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

  // Filter and sort resumes
  const filteredAndSortedResumes = useMemo(() => {
    let filtered = savedResumes;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(resume => {
        const nameMatch = resume.name.toLowerCase().includes(query);
        const jobMatch = resume.data?.jobDescription?.toLowerCase().includes(query);
        return nameMatch || jobMatch;
      });
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return b.createdAt - a.createdAt;
        case 'oldest':
          return a.createdAt - b.createdAt;
        case 'updated':
          return b.updatedAt - a.updatedAt;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return sorted;
  }, [savedResumes, searchQuery, sortBy]);

  async function copyJobDescriptionToClipboard() {
    if (!selectedResume?.data?.jobDescription) return;
    try {
      await navigator.clipboard.writeText(selectedResume.data.jobDescription);
      success('Job description copied to clipboard!');
    } catch (error) {
      showError('Could not copy to clipboard.');
    }
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
      <div className="saved-resumes-hero">
        <div className="saved-resumes-hero-content">
          <h1 className="saved-resumes-hero-title">Saved Resumes</h1>
          <p className="saved-resumes-hero-subtitle">View, edit, and manage your saved resumes</p>
        </div>

        {/* Summary Stats */}
        {savedResumes.length > 0 && (
          <div className="saved-resumes-stats-modern">
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
              <Icon name="file" size={16} />
              <span>{savedResumes.length} Saved Resumes</span>
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
              <span>{totalBullets} Total Bullets</span>
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
              <Icon name="chart" size={16} />
              <span>{avgBulletsPerResume} Avg per Resume</span>
            </div>
          </div>
        )}
      </div>

      {savedResumes.length === 0 ? (
        <div className="saved-resumes-empty-modern">
          <div className="empty-state-icon">
            <Icon name="file" size={64} />
          </div>
          <h3>No saved resumes yet</h3>
          <p>Generate and save your first resume to get started. Create tailored resumes for different job applications.</p>
          <div className="empty-state-actions" style={{ marginTop: 'var(--space-6)' }}>
            <button 
              className="btn btn-primary"
              onClick={() => {
                // Note: Navigation to generate tab would need to be passed as prop
                // For now, this refreshes the list and user can navigate manually
                if (onLoadResume) {
                  onLoadResume();
                }
                // Show helpful message
                success('Navigate to the "Generate Resume" tab to create your first resume!');
              }}
            >
              <Icon name="sparkles" size={16} />
              Get Started
            </button>
          </div>
          <div className="empty-state-tips" style={{ 
            marginTop: 'var(--space-6)', 
            padding: 'var(--space-4)',
            background: 'var(--color-primary-50)',
            borderRadius: 'var(--radius-md)',
            maxWidth: '400px'
          }}>
            <p style={{ 
              margin: '0 0 var(--space-2) 0',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-primary-700)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)'
            }}>
              <Icon name="lightbulb" size={16} />
              Pro Tip
            </p>
            <p style={{ 
              margin: 0,
              fontSize: 'var(--font-size-sm)',
              color: 'var(--text-secondary)',
              lineHeight: 'var(--line-height-relaxed)'
            }}>
              Create tailored resumes for each job application to maximize your chances of getting noticed.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Search and Filter Controls */}
          <div className="resume-list-controls">
            <div className="search-input-wrapper">
              <Icon name="search" size={16} />
              <input 
                type="text" 
                placeholder="Search resumes by name or job description..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              {searchQuery && (
                <button
                  className="search-clear"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                >
                  <Icon name="x" size={14} />
                </button>
              )}
            </div>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="updated">Recently Updated</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>

          {filteredAndSortedResumes.length === 0 ? (
            <div className="saved-resumes-empty-modern" style={{ padding: 'var(--space-12) var(--space-6)' }}>
              <Icon name="search" size={48} style={{ opacity: 0.5, marginBottom: 'var(--space-4)' }} />
              <h3>No resumes found</h3>
              <p>Try adjusting your search or filter criteria.</p>
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setSearchQuery('');
                  setSortBy('newest');
                }}
                style={{ marginTop: 'var(--space-4)' }}
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="section">
              <div className="section-header-modern">
                <div>
                  <h2>Your Resumes {searchQuery && `(${filteredAndSortedResumes.length})`}</h2>
                  <p className="section-description">
                    Click on a resume to view and edit it.
                  </p>
                </div>
              </div>

              <div className="resume-list">
                {filteredAndSortedResumes.map(resume => {
                  const isRecentlyUpdated = isRecent(resume.updatedAt);
                  const jobDescription = resume.data?.jobDescription || '';
                  const jobPreview = jobDescription.length > 0 
                    ? (jobDescription.length > 80 ? jobDescription.substring(0, 80) + '...' : jobDescription)
                    : null;

                  return (
                    <div
                      key={resume.id}
                      className={`resume-item ${selectedResume?.id === resume.id ? 'selected' : ''}`}
                      onClick={() => setSelectedResume(resume)}
                    >
                      <div className="resume-item-content">
                        <div className="resume-item-header">
                          <h3 className="resume-name">{resume.name}</h3>
                          {isRecentlyUpdated && (
                            <span className="resume-badge-new">New</span>
                          )}
                        </div>
                        {jobPreview && (
                          <p className="resume-job-preview">{jobPreview}</p>
                        )}
                        <div className="resume-meta">
                          <Icon name="calendar" size={12} />
                          <span>Updated {formatRelativeTime(resume.updatedAt)}</span>
                          <span className="meta-divider">•</span>
                          <Icon name="zap" size={12} />
                          <span>{getStructuredBulletCount(resume.data)} bullets</span>
                        </div>
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
                            aria-label={`Delete resume: ${resume.name}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </Tooltip>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {selectedResume && (
            <>
              {/* Two Column Layout - Same as GenerateResume */}
              {editedResume ? (
                <div className="saved-resumes-results-container">
                  {/* Left Column: Resume Sections */}
                  <div className="saved-resumes-left-column">
                    <div className="section section-modern">
                      <div className="section-header-modern-with-action">
                        <div>
                          <h2>{selectedResume.name}</h2>
                          <p className="section-description">
                            Created: {formatDate(selectedResume.createdAt)} • 
                            Updated: {formatRelativeTime(selectedResume.updatedAt)} • 
                            {getStructuredBulletCount(selectedResume.data)} bullets
                          </p>
                          {selectedResume.data?.jobDescription && (
                            <div className="job-description-section">
                              <div 
                                className="job-description-header"
                                onClick={() => setJobDescriptionExpanded(!jobDescriptionExpanded)}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                  <Icon name="briefcase" size={16} />
                                  <span style={{ fontWeight: 'var(--font-weight-semibold)' }}>Job Description</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                  <button
                                    className="btn-icon-tiny"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      copyJobDescriptionToClipboard();
                                    }}
                                    title="Copy job description"
                                    aria-label="Copy job description to clipboard"
                                  >
                                    <Icon name="clipboard" size={14} />
                                  </button>
                                  <Icon 
                                    name={jobDescriptionExpanded ? "chevronUp" : "chevronDown"} 
                                    size={16} 
                                  />
                                </div>
                              </div>
                              {jobDescriptionExpanded && (
                                <div className="job-description-content">
                                  <p style={{ 
                                    whiteSpace: 'pre-wrap', 
                                    wordBreak: 'break-word',
                                    margin: 0,
                                    fontSize: 'var(--font-size-sm)',
                                    lineHeight: 'var(--line-height-relaxed)',
                                    color: 'var(--text-primary)'
                                  }}>
                                    {selectedResume.data.jobDescription}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="section-header-actions">
                          <button
                            className="btn btn-secondary btn-modern"
                            onClick={() => {
                              setSelectedResume(null);
                              setEditedResume(null);
                              setShowLatexPreview(false);
                              setLatexPdfBase64(null);
                            }}
                            title="Close this resume"
                          >
                            <Icon name="x" size={16} />
                            Close
                          </button>
                          <button
                            className="btn btn-primary btn-modern"
                            onClick={() => setShowSaveDialog(true)}
                            disabled={saving}
                          >
                            <Icon name="save" size={16} />
                            Save As New
                          </button>
                        </div>
                      </div>
                      
                      <SelectedResumeEditor
                        resume={editedResume}
                        masterResume={masterResume}
                        onUpdate={setEditedResume}
                        showPersonalInfo={false}
                        showSkills={true}
                        showEducation={true}
                        verticalLayout={true}
                      />
                    </div>
                  </div>

                  {/* Right Column: LaTeX Preview */}
                  <div className="saved-resumes-right-column" ref={previewRef}>
                    <div className="latex-preview-panel">
                      <div className="latex-preview-panel-header">
                        <h3>LaTeX Preview</h3>
                        <div className="latex-preview-actions">
                          <button
                            className="btn btn-primary btn-small"
                            onClick={async () => {
                              if (!editedResume) return;
                              
                              // Generate LaTeX source
                              try {
                                const selectedPayload = buildSelectedResumePayload(editedResume, masterResume);
                                const latex = buildLatexDocument(selectedPayload);
                                setLatexSource(latex);
                                
                                // Render PDF
                                await renderPdfPreview();
                              } catch (error) {
                                console.error('Error building LaTeX preview:', error);
                                showError('Could not generate LaTeX preview. Please try again.');
                              }
                            }}
                            disabled={renderingPdf}
                          >
                            {renderingPdf ? (
                              <>
                                <Icon name="loader" size={14} />
                                Rendering...
                              </>
                            ) : (
                              <>
                                <Icon name="refresh" size={14} />
                                Regenerate PDF
                              </>
                            )}
                          </button>
                          <button
                            className="btn btn-secondary btn-small"
                            onClick={downloadPdf}
                            disabled={!latexPdfBase64 || renderingPdf}
                            title="Download PDF"
                          >
                            <Icon name="download" size={14} />
                            Download PDF
                          </button>
                        </div>
                      </div>
                      
                      <div className="latex-preview-panel-content">
                        {renderingPdf && <div className="pdf-loading">Rendering PDF…</div>}
                        {!renderingPdf && latexPdfBase64 && (
                          <PdfViewerWithOverlays
                            pdfBase64={latexPdfBase64}
                            comments={[]}
                            onTextSelect={(anchor) => {
                              console.log('Text selected:', anchor);
                            }}
                            scale={1.0}
                            hideHighlighting={true}
                          />
                        )}
                        {!renderingPdf && !latexPdfBase64 && (
                          <div className="pdf-empty">
                            <p>Click "Regenerate PDF" to generate a preview.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="section">
                  <div className="section-header-modern-with-action">
                    <div>
                      <h2>{selectedResume.name}</h2>
                      <p className="section-description">
                        Created: {formatDate(selectedResume.createdAt)} • 
                        Updated: {formatRelativeTime(selectedResume.updatedAt)} • 
                        {getStructuredBulletCount(selectedResume.data)} bullets
                      </p>
                      {selectedResume.data?.jobDescription && (
                        <div className="job-description-section">
                          <div 
                            className="job-description-header"
                            onClick={() => setJobDescriptionExpanded(!jobDescriptionExpanded)}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                              <Icon name="briefcase" size={16} />
                              <span style={{ fontWeight: 'var(--font-weight-semibold)' }}>Job Description</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                              <button
                                className="btn-icon-tiny"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyJobDescriptionToClipboard();
                                }}
                                title="Copy job description"
                                aria-label="Copy job description to clipboard"
                              >
                                <Icon name="clipboard" size={14} />
                              </button>
                              <Icon 
                                name={jobDescriptionExpanded ? "chevronUp" : "chevronDown"} 
                                size={16} 
                              />
                            </div>
                          </div>
                          {jobDescriptionExpanded && (
                            <div className="job-description-content">
                              <p style={{ 
                                whiteSpace: 'pre-wrap', 
                                wordBreak: 'break-word',
                                margin: 0,
                                fontSize: 'var(--font-size-sm)',
                                lineHeight: 'var(--line-height-relaxed)',
                                color: 'var(--text-primary)'
                              }}>
                                {selectedResume.data.jobDescription}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="section-header-actions">
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
        resumeData={editedResume}
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
      
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

export default SavedResumes;

