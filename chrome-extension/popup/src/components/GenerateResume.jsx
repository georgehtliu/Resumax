import React, { useState } from 'react';
import JobMatcher from './JobMatcher';
import OptimizationPanel from './OptimizationPanel';
import SelectedResumeEditor from './SelectedResumeEditor';
import { storageService } from '../services/storage';
import { buildStructuredResume, selectResume } from '../services/api';
import './GenerateResume.css';

/**
 * Generate New Resume Component
 * 
 * Tab 2: Generate optimized resume from job description
 */
function GenerateResume({ masterResume, onSave }) {
  const [currentJob, setCurrentJob] = useState(null);
  const [optimizationResult, setOptimizationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resumeName, setResumeName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [customizedBullets, setCustomizedBullets] = useState(null);
  const [customizedResume, setCustomizedResume] = useState(null);
  const [optimizationMode, setOptimizationMode] = useState('select'); // 'select' or 'optimize'

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
      const structuredResume = buildStructuredResume(masterResume);

      if (
        structuredResume.experiences.length === 0 &&
        structuredResume.education.length === 0 &&
        structuredResume.projects.length === 0 &&
        structuredResume.customSections.length === 0
      ) {
        alert('Your master resume is empty. Please add experiences, education, projects, or skills first.');
        return;
      }

      const apiResponse = await selectResume({
        jobDescription: trimmedDescription,
        resume: structuredResume,
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
      });

      setCustomizedResume(selectedResume);

      setCurrentJob((prev) => ({
        description: trimmedDescription,
        source: prev?.source || 'manual',
      }));
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
          </div>
          
          {optimizationResult.mode === 'select' ? (
            <SelectedResumeEditor
              resume={customizedResume || optimizationResult.selectedResume}
              onUpdate={handleResumeUpdate}
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
    return {
      ...base,
      ...cloned,
      personalInfo: {
        ...base.personalInfo,
        ...(cloned.personalInfo || {})
      },
      skills: Array.isArray(cloned.skills) ? cloned.skills : [],
      experiences: Array.isArray(cloned.experiences) ? cloned.experiences : [],
      education: Array.isArray(cloned.education) ? cloned.education : [],
      projects: Array.isArray(cloned.projects) ? cloned.projects : [],
      customSections: Array.isArray(cloned.customSections) ? cloned.customSections : []
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

