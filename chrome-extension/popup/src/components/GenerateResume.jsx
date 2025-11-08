import React, { useState } from 'react';
import JobMatcher from './JobMatcher';
import OptimizationPanel from './OptimizationPanel';
import SelectedResumeEditor from './SelectedResumeEditor';
import LatexPreviewModal from './LatexPreviewModal';
import { storageService } from '../services/storage';
import { buildStructuredResume, selectResume, renderLatex } from '../services/api';
import { buildLatexDocument } from '../utils/latexTemplate';
import './GenerateResume.css';

/**
 * Generate New Resume Component
 * 
 * Tab 2: Generate optimized resume from job description
 */
function GenerateResume({ masterResume, onSave, onSelectionComplete }) {
  const [currentJob, setCurrentJob] = useState(null);
  const [optimizationResult, setOptimizationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resumeName, setResumeName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [customizedBullets, setCustomizedBullets] = useState(null);
  const [customizedResume, setCustomizedResume] = useState(null);
  const [optimizationMode, setOptimizationMode] = useState('select'); // 'select' or 'optimize'
  const [showLatexPreview, setShowLatexPreview] = useState(false);
  const [latexSource, setLatexSource] = useState('');
  const [latexPdfBase64, setLatexPdfBase64] = useState(null);
  const [renderingPdf, setRenderingPdf] = useState(false);

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
   * Handle optimization request (with rewriting)
   */
  async function handleOptimize(jobDescription) {
    setLoading(true);
    try {
      // Mock optimization - will connect to backend later
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Collect bullets from all sections
      const allBullets = [
        ...(Array.isArray(masterResume.experiences) ? masterResume.experiences.flatMap(exp => Array.isArray(exp?.bullets) ? exp.bullets : []) : []),
        ...(Array.isArray(masterResume.education) ? masterResume.education.flatMap(edu => Array.isArray(edu?.bullets) ? edu.bullets : []) : []),
        ...(Array.isArray(masterResume.projects) ? masterResume.projects.flatMap(proj => Array.isArray(proj?.bullets) ? proj.bullets : []) : []),
        ...(Array.isArray(masterResume.customSections) ? masterResume.customSections.flatMap(section => Array.isArray(section?.bullets) ? section.bullets : []) : [])
      ];

      const mockResult = {
        mode: 'optimize', // Indicates this includes rewriting
        selectedBullets: allBullets
          .slice(0, 12)
          .map(bullet => ({
            ...bullet,
            relevanceScore: Math.random() * 0.3 + 0.7,
            rewritten: bullet.text + ' (optimized)', // Mock - would be optimized by LLM
            original: bullet.text
          })),
        gaps: ['Cloud deployment', 'Machine learning'],
        jobDescription: jobDescription
      };

      setOptimizationResult(mockResult);
      setCustomizedResume(null);
    } catch (error) {
      console.error('Error optimizing:', error);
      alert('Error optimizing resume');
    } finally {
      setLoading(false);
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
      const isSelectMode = optimizationResult.mode === 'select';

      let savedResume;
      if (isSelectMode) {
        const resumeData = cloneStructuredResume(customizedResume || optimizationResult.selectedResume);
        savedResume = {
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
      } else {
        const bulletsToSave = customizedBullets || optimizationResult.selectedBullets;
        savedResume = {
          selectedBullets: bulletsToSave,
          gaps: optimizationResult.gaps,
          mode: optimizationResult.mode,
          jobDescription: optimizationResult.jobDescription
        };
      }

      await storageService.saveGeneratedResume(resumeName.trim(), savedResume);
      
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
      <div className="section">
        <h2>Match to Job Description</h2>
        <p className="section-description">
          Extract or paste a job description, then select the best resume points.
        </p>
        
        {/* Mode Selection */}
        <div className="optimization-mode-selector">
          <div className="mode-option">
            <input
              type="radio"
              id="mode-select"
              name="optimization-mode"
              value="select"
              checked={optimizationMode === 'select'}
              onChange={(e) => setOptimizationMode(e.target.value)}
            />
            <label htmlFor="mode-select">
              <div className="mode-label">
                <span className="mode-icon">📋</span>
                <div className="mode-content">
                  <div className="mode-title">Select Best Bullets</div>
                  <div className="mode-description">Fast selection without rewriting</div>
                </div>
              </div>
            </label>
          </div>
          
          <div className="mode-option">
            <input
              type="radio"
              id="mode-optimize"
              name="optimization-mode"
              value="optimize"
              checked={optimizationMode === 'optimize'}
              onChange={(e) => setOptimizationMode(e.target.value)}
            />
            <label htmlFor="mode-optimize">
              <div className="mode-label">
                <span className="mode-icon">✨</span>
                <div className="mode-content">
                  <div className="mode-title">Optimize & Rewrite</div>
                  <div className="mode-description">Selection + AI rewriting (slower)</div>
                </div>
              </div>
            </label>
          </div>
        </div>
        
        <JobMatcher
          jobDescription={currentJob?.description || ''}
          onExtract={handleExtractJobDescription}
          onSelect={handleSelect}
          onOptimize={handleOptimize}
          optimizationMode={optimizationMode}
          loading={loading}
        />
      </div>

      {/* Optimization Results */}
      {optimizationResult && (
        <div className="section">
          <div className="section-header-with-action">
            <h2>
              {optimizationResult.mode === 'optimize' ? 'Optimized Resume' : 'Selected Resume'}
            </h2>
            <button
              className="btn btn-primary"
              onClick={() => setShowSaveDialog(true)}
              disabled={saving}
            >
              💾 Save Resume
            </button>
            {optimizationResult.mode === 'select' && (
              <button
                className="btn btn-secondary"
                onClick={openLatexPreview}
              >
                👁️ LaTeX Preview
              </button>
            )}
          </div>
          
          {optimizationResult.mode === 'select' ? (
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
          ) : (
            <OptimizationPanel
              result={optimizationResult}
              onClose={() => {
                setOptimizationResult(null);
                setCustomizedBullets(null);
                setCustomizedResume(null);
              }}
              onBulletsUpdate={handleBulletsUpdate}
            />
          )}
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
  const lines = Math.max(1, Math.ceil(effectiveLength / 140));
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
    total += Math.max(1, Math.ceil((text.length || 0) / 90));
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

