import React, { useState } from 'react';
import JobMatcher from './JobMatcher';
import SelectedResumeEditor from './SelectedResumeEditor';
import LatexPreviewModal from './LatexPreviewModal';
import KeywordScanner from './KeywordScanner';
import { storageService } from '../services/storage';
import { supabase } from '../config/supabase';
import { buildStructuredResume, selectResume, renderLatex, scanKeywords } from '../services/api';
import { buildLatexDocument } from '../utils/latexTemplate';
import { Icon } from './Icons';
import './GenerateResume.css';

/**
 * Generate New Resume Component
 * 
 * Tab 2: Generate optimized resume from job description
 */
function GenerateResume({ masterResume, onSave, onSelectionComplete, hideExtract = false }) {
  const [currentJob, setCurrentJob] = useState(null);
  const [optimizationResult, setOptimizationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resumeName, setResumeName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [customizedBullets, setCustomizedBullets] = useState(null);
  const [customizedResume, setCustomizedResume] = useState(null);
  const [showLatexPreview, setShowLatexPreview] = useState(false);
  const [latexSource, setLatexSource] = useState('');
  const [latexPdfBase64, setLatexPdfBase64] = useState(null);
  const [renderingPdf, setRenderingPdf] = useState(false);
  const [keywordData, setKeywordData] = useState(null);
  const [scanningKeywords, setScanningKeywords] = useState(false);

  /**
   * Extract job description from current tab
   */
  async function handleExtractJobDescription() {
    setLoading(true);
    try {
      const result = await chrome.runtime.sendMessage({
        type: 'EXTRACT_JOB_DESCRIPTION'
      });

      if (result.success) {
        setCurrentJob({
          description: result.jobDescription,
          source: result.source || 'manual'
        });
      } else {
        alert('Could not extract job description: ' + result.error);
      }
    } catch (error) {
      console.error('Error extracting job description:', error);
      alert('Error extracting job description');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Handle selection request (no rewriting, just selection)
   */
  async function handleSelect(jobDescription) {
    const trimmedDescription = (jobDescription || '').trim();
    if (!trimmedDescription) {
      alert('Please provide a job description before selecting bullets.');
      return;
    }

    setLoading(true);
    setCustomizedBullets(null);
    setCustomizedResume(null);

    try {
      const structuredResume = applySectionPriorities(buildStructuredResume(masterResume));

      if (
        structuredResume.experiences.length === 0 &&
        structuredResume.education.length === 0 &&
        structuredResume.projects.length === 0 &&
        structuredResume.customSections.length === 0
      ) {
        alert('Your master resume is empty. Please add experiences, education, projects, or skills first.');
        return;
      }

      const sectionCaps = computeSectionCaps(structuredResume);

      const apiResponse = await selectResume({
        jobDescription: trimmedDescription,
        resume: structuredResume,
        bulletsPerExperience: Math.max(1, sectionCaps.experience || 0),
        bulletsPerEducation: Math.max(1, sectionCaps.education || 0),
        bulletsPerProject: Math.max(1, sectionCaps.project || 0),
        bulletsPerCustom: Math.max(1, sectionCaps.custom || 0),
      });

      const selectedResume = cloneStructuredResume(apiResponse?.selectedResume);
      const flattenedBullets = flattenSelectedResume(selectedResume);

      setOptimizationResult({
        mode: apiResponse?.mode || 'select',
        selectedBullets: flattenedBullets,
        selectedResume,
        gaps: apiResponse?.gaps || [],
        jobDescription: trimmedDescription,
        fitsOnePage: apiResponse?.fitsOnePage,
        totalLineCount: apiResponse?.totalLineCount,
        maxLines: apiResponse?.maxLines,
        processingTime: typeof apiResponse?.processing_time === 'number'
          ? apiResponse.processing_time
          : undefined,
        rawResponse: apiResponse,
        sectionCaps,
      });

      setCustomizedResume(selectedResume);

      setCurrentJob((prev) => ({
        description: trimmedDescription,
        source: prev?.source || 'manual',
      }));

      // Scan keywords after selection
      scanKeywordsForResume(structuredResume, trimmedDescription);

      if (typeof onSelectionComplete === 'function') {
        onSelectionComplete({
          selectedResume,
          response: apiResponse,
          jobDescription: trimmedDescription
        });
      }
    } catch (error) {
      console.error('Error selecting bullets:', error);
      alert(error?.message || 'Unable to select bullets. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Scan keywords from job description against resume
   */
  async function scanKeywordsForResume(resume, jobDescription) {
    if (!resume || !jobDescription) {
      return;
    }

    setScanningKeywords(true);
    try {
      const keywordResult = await scanKeywords({
        resume,
        jobDescription,
      });
      setKeywordData(keywordResult);
    } catch (error) {
      console.error('Error scanning keywords:', error);
      // Don't show alert for keyword scan errors, just log
    } finally {
      setScanningKeywords(false);
    }
  }


  /**
   * Handle bullet customization updates
   */
  function handleBulletsUpdate(updatedBullets) {
    setCustomizedBullets(updatedBullets);
  }

  function handleResumeUpdate(updatedResume) {
    setCustomizedResume(updatedResume);
  }

  function openLatexPreview() {
    const resumeSource = customizedResume || optimizationResult?.selectedResume;
    if (!resumeSource) {
      return;
    }
    try {
      const latex = buildLatexDocument(resumeSource);
      setLatexSource(latex);
      setShowLatexPreview(true);
      setLatexPdfBase64(null);
    } catch (error) {
      console.error('Error building LaTeX preview:', error);
      alert('Could not generate LaTeX preview. Please try again.');
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
    const blob = new Blob([latexSource], { type: 'application/x-tex' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(resumeName || 'resume').replace(/\s+/g, '_')}.tex`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function renderPdfPreview() {
    const resumeSource = customizedResume || optimizationResult?.selectedResume;
    if (!resumeSource) return;

    setRenderingPdf(true);
    setLatexPdfBase64(null);
    try {
      const response = await renderLatex(resumeSource);
      if (response?.pdf_base64) {
        setLatexPdfBase64(response.pdf_base64);
      } else {
        alert('LaTeX render did not return a PDF.');
      }
    } catch (error) {
      console.error('Render PDF failed:', error);
      alert(error?.message || 'Failed to render PDF preview.');
    } finally {
      setRenderingPdf(false);
    }
  }

  /**
   * Handle save with name
   */
  async function handleSave() {
    if (!optimizationResult) {
      alert('Please generate a resume first');
      return;
    }

    if (!resumeName.trim()) {
      alert('Please enter a name for this resume');
      return;
    }

    setSaving(true);
    try {
      const resumeData = cloneStructuredResume(customizedResume || optimizationResult.selectedResume);
      const savedResume = {
        mode: 'select',
        experiences: resumeData.experiences || [],
        education: resumeData.education || [],
        projects: resumeData.projects || [],
        customSections: resumeData.customSections || [],
        gaps: optimizationResult.gaps,
        jobDescription: optimizationResult.jobDescription,
        fitsOnePage: optimizationResult.fitsOnePage,
        totalLineCount: optimizationResult.totalLineCount,
        maxLines: optimizationResult.maxLines,
        selectedBullets: flattenSelectedResume(resumeData)
      };

      // Save to Supabase
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { error } = await supabase
            .from('saved_resumes')
            .insert({
              user_id: session.user.id,
              name: resumeName.trim(),
              resume_data: savedResume
            });

          if (error) throw error;
        } else {
          // Fallback to Chrome Storage if not signed in
          await storageService.saveGeneratedResume(resumeName.trim(), savedResume);
        }
      } catch (error) {
        console.error('Error saving to Supabase, falling back to Chrome Storage:', error);
        // Fallback to Chrome Storage
        await storageService.saveGeneratedResume(resumeName.trim(), savedResume);
      }
      
      // Reset state
      setShowSaveDialog(false);
      setResumeName('');
      setOptimizationResult(null);
      setCurrentJob(null);
      setCustomizedBullets(null);
      setCustomizedResume(null);
      
      // Notify parent to refresh saved resumes
      if (onSave) {
        onSave();
      }

      alert('Resume saved successfully!');
    } catch (error) {
      console.error('Error saving resume:', error);
      alert('Error saving resume');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="generate-resume">
      {/* Loading Overlay */}
      {loading && (
        <div className="resume-generating-overlay">
          <div className="resume-generating-content">
            <div className="resume-generating-spinner"></div>
            <h3 className="resume-generating-title">Generating Resume</h3>
            <p className="resume-generating-text">Selecting the best bullets for your job description...</p>
          </div>
        </div>
      )}

      <div className="section">
        <h2>Match to Job Description</h2>
        <p className="section-description">
          {hideExtract 
            ? 'Paste a job description, then select the best resume points.'
            : 'Extract or paste a job description, then select the best resume points.'}
        </p>
        
        <JobMatcher
          jobDescription={currentJob?.description || ''}
          onExtract={hideExtract ? undefined : handleExtractJobDescription}
          onSelect={handleSelect}
          loading={loading}
        />
      </div>

      {/* Keyword Scanner */}
      {(keywordData || scanningKeywords) && (
        <div className="section">
          <KeywordScanner keywordData={keywordData} loading={scanningKeywords} />
        </div>
      )}

      {/* Optimization Results */}
      {optimizationResult && (
        <div className="section">
          <div className="section-header-with-action">
            <h2>Selected Resume</h2>
            <button
              className="btn btn-primary"
              onClick={() => setShowSaveDialog(true)}
              disabled={saving}
            >
              <Icon name="save" size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
              Save Resume
            </button>
            {optimizationResult.mode === 'select' && (
              <button
                className="btn btn-secondary"
                onClick={openLatexPreview}
              >
                <Icon name="eye" size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                LaTeX Preview
              </button>
            )}
          </div>
          
          <SelectedResumeEditor
            resume={customizedResume || optimizationResult.selectedResume}
            onUpdate={handleResumeUpdate}
            showPersonalInfo={false}
            showSkills={false}
            showEducation={false}
            summary={{
              fitsOnePage: optimizationResult.fitsOnePage,
              totalLineCount: optimizationResult.totalLineCount,
              maxLines: optimizationResult.maxLines,
              processingTime: optimizationResult.processingTime
            }}
          />
        </div>
      )}

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="save-dialog-overlay">
          <div className="save-dialog">
            <h3>Save Resume</h3>
            <p className="dialog-description">
              Enter a name for this resume (e.g., "Google SWE", "Meta Frontend")
            </p>
            <input
              type="text"
              className="resume-name-input"
              value={resumeName}
              onChange={(e) => setResumeName(e.target.value)}
              placeholder="Resume name..."
              autoFocus
              onKeyPress={(e) => {
                if (e.key === 'Enter' && resumeName.trim()) {
                  handleSave();
                }
              }}
            />
            <div className="dialog-actions">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowSaveDialog(false);
                  setResumeName('');
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={!resumeName.trim() || saving}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
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
    </div>
  );
}

function flattenSelectedResume(selectedResume) {
  if (!selectedResume) {
    return [];
  }

  const resultBullets = [];

  const appendBullets = (items = [], sectionType) => {
    items.forEach((item) => {
      const bulletList = Array.isArray(item.selectedBullets) && item.selectedBullets.length > 0
        ? item.selectedBullets
        : Array.isArray(item.bullets)
          ? item.bullets
          : [];

      bulletList.forEach((bullet) => {
        resultBullets.push({
          ...bullet,
          sectionType,
          parentId: item.id,
          parentTitle: item.company || item.school || item.name || item.title || '',
          parentRole: item.role || item.degree || item.subtitle || '',
        });
      });
    });
  };

  appendBullets(selectedResume.experiences, 'experience');
  appendBullets(selectedResume.education, 'education');
  appendBullets(selectedResume.projects, 'project');
  appendBullets(selectedResume.customSections, 'custom');

  return resultBullets;
}

const LINE_BUDGET = 42;

function estimateBulletLines(text = '') {
  const effectiveLength = (text?.length || 0) + 2;
  const lines = Math.max(1, Math.ceil(effectiveLength / 110));
  return Math.min(lines, 3);
}

function estimateEntryLines(entries = [], cap = 0, headingLines = 2) {
  if (!cap || cap <= 0 || !Array.isArray(entries) || entries.length === 0) {
    return 0;
  }

  let total = 0;

  entries.forEach((entry) => {
    const bulletLines = (entry.bullets || [])
      .map((bullet) => estimateBulletLines(bullet.text))
      .sort((a, b) => b - a);

    const limit = Math.min(cap, bulletLines.length);
    if (limit > 0) {
      total += headingLines;
      for (let i = 0; i < limit; i += 1) {
        total += bulletLines[i];
      }
    }
  });

  return total;
}

function estimateSkillsLines(skillGroups = []) {
  if (!Array.isArray(skillGroups) || skillGroups.length === 0) {
    return 0;
  }

  let total = 2; // section header + spacing
  skillGroups.forEach((group) => {
    const text = (group.skills || []).join(', ');
    total += Math.max(1, Math.ceil((text.length || 0) / 110));
  });
  return total;
}

function estimatePersonalInfoLines(personalInfo) {
  if (!personalInfo) {
    return 2; // minimal heading even if blank
  }
  return 3;
}

function estimateTotalLines(resume, caps) {
  if (!resume) return 0;

  let total = 0;
  total += estimatePersonalInfoLines(resume.personalInfo);
  total += estimateSkillsLines(resume.skills);
  total += estimateEntryLines(resume.experiences, caps.experience, 2);
  total += estimateEntryLines(resume.projects, caps.project, 2);
  total += estimateEntryLines(resume.education, caps.education, 2);
  total += estimateEntryLines(resume.customSections, caps.custom, 2);
  return total;
}

function applySectionPriorities(resume) {
  if (!resume) {
    return resume;
  }

  const projects = Array.isArray(resume.projects) ? [...resume.projects] : [];
  const experiences = Array.isArray(resume.experiences) ? resume.experiences : [];

  if (projects.length > 0) {
    const experienceLines = estimateEntryLines(experiences, 4, 2);
    const desiredProjectEntries = experienceLines > (LINE_BUDGET * 0.5) || experiences.length >= 3
      ? 1
      : Math.min(2, projects.length);

    if (projects.length > desiredProjectEntries) {
      const rankedProjects = [...projects].sort((a, b) => {
        const aBullets = Array.isArray(a?.bullets) ? a.bullets.length : 0;
        const bBullets = Array.isArray(b?.bullets) ? b.bullets.length : 0;
        return bBullets - aBullets;
      });
      resume.projects = rankedProjects.slice(0, desiredProjectEntries);
    }
  }

  return resume;
}

function computeSectionCaps(resume) {
  const experiences = resume.experiences || [];
  const education = resume.education || [];
  const projects = resume.projects || [];
  const custom = resume.customSections || [];

  const getMaxAvailable = (entries) => Math.max(
    0,
    ...entries.map((entry) => Array.isArray(entry?.bullets) ? entry.bullets.length : 0),
  );

  const projectBaseFloor = projects.length <= 1 ? 1 : 2;

  const caps = {
    experience: experiences.length === 0 ? 0 : Math.min(4, Math.max(3, getMaxAvailable(experiences))),
    education: education.length === 0 ? 0 : Math.min(2, Math.max(1, getMaxAvailable(education))),
    project: projects.length === 0 ? 0 : Math.min(3, Math.max(projectBaseFloor, getMaxAvailable(projects))),
    custom: custom.length === 0 ? 0 : Math.min(2, Math.max(1, getMaxAvailable(custom))),
  };

  const minCaps = {
    experience: experiences.length === 0 ? 0 : Math.min(2, Math.max(1, getMaxAvailable(experiences))),
    education: education.length === 0 ? 0 : Math.max(1, Math.min(2, getMaxAvailable(education) || 1)),
    project: projects.length === 0 ? 0 : 1,
    custom: 0,
  };

  Object.keys(caps).forEach((key) => {
    if (caps[key] < minCaps[key]) {
      caps[key] = minCaps[key];
    }
  });

  const reductionOrder = ['custom', 'education', 'project', 'experience'];

  let estimated = estimateTotalLines(resume, caps);
  while (estimated > LINE_BUDGET) {
    let reduced = false;
    for (const key of reductionOrder) {
      if (caps[key] > minCaps[key]) {
        caps[key] -= 1;
        reduced = true;
        break;
      }
    }
    if (!reduced) {
      break;
    }
    estimated = estimateTotalLines(resume, caps);
  }

  return caps;
}

function cloneStructuredResume(resume) {
  const base = {
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

  if (!resume) {
    return base;
  }

  try {
    const cloned = JSON.parse(JSON.stringify(resume));

    const normalizeBullet = (bullet, prefix, index) => {
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
    };

    const normalizeSection = (entries, sectionPrefix) => {
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
    };

    return {
      ...base,
      ...cloned,
      personalInfo: {
        ...base.personalInfo,
        ...(cloned.personalInfo || {})
      },
      skills: Array.isArray(cloned.skills) ? cloned.skills : [],
      experiences: normalizeSection(cloned.experiences, 'experience'),
      education: normalizeSection(cloned.education, 'education'),
      projects: normalizeSection(cloned.projects, 'project'),
      customSections: normalizeSection(cloned.customSections, 'custom')
    };
  } catch (error) {
    console.warn('Unable to clone resume structure, returning original reference.', error);
    return {
      ...base,
      ...resume
    };
  }
}

export default GenerateResume;

