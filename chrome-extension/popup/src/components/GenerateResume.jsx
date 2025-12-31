import React, { useState, startTransition, useEffect } from 'react';
import JobMatcher from './JobMatcher';
import SelectedResumeEditor from './editors/SelectedResumeEditor';
import LatexPreviewModal from './modals/LatexPreviewModal';
import KeywordScanner from './KeywordScanner';
import PdfViewerWithOverlays from './pdf/PdfViewerWithOverlays';
import { storageService } from '../services/storage';
import { supabase } from '../config/supabase';
import { buildStructuredResume, selectResume, renderLatex, scanKeywords } from '../services/api';
import { buildLatexDocument } from '../utils/latexTemplate';
import {
  flattenSelectedResume,
  applySectionPriorities,
  computeSectionCaps,
  cloneStructuredResume
} from '../utils/resumeGenerationUtils';
import {
  JOB_DESCRIPTION_TEMPLATES,
  getJobDescriptionForArea,
  getAreaDisplayName,
  getAvailableAreas
} from '../utils/jobDescriptionTemplates';
import { Icon } from './ui/Icons';
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
  const [inputMode, setInputMode] = useState('paste'); // 'paste' or 'area'
  const [selectedArea, setSelectedArea] = useState(null);

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

      // Use startTransition to mark state updates as non-urgent
      // This allows React to keep the UI responsive during heavy processing
      const processResume = () => {
        const selectedResume = cloneStructuredResume(apiResponse?.selectedResume);
        
        // Always ensure skills are included from master resume (API may not return them)
        // Use skills from API response if present, otherwise use from master resume
        selectedResume.skills = selectedResume.skills && selectedResume.skills.length > 0
          ? selectedResume.skills
          : (structuredResume.skills || []);
        
        const flattenedBullets = flattenSelectedResume(selectedResume);

        // Use startTransition for non-urgent state updates
        startTransition(() => {
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
          
          // Call onSelectionComplete after state is set
          if (typeof onSelectionComplete === 'function') {
            onSelectionComplete({
              selectedResume,
              response: apiResponse,
              jobDescription: trimmedDescription
            });
          }
        });
      };

      // Yield to browser to keep UI responsive, then process
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(processResume, { timeout: 100 });
      } else {
        // Fallback for browsers without requestIdleCallback
        setTimeout(processResume, 0);
      }

      setCurrentJob((prev) => ({
        description: trimmedDescription,
        source: prev?.source || 'manual',
      }));

      // Scan keywords after selection - defer to avoid blocking UI
      setTimeout(() => {
        scanKeywordsForResume(structuredResume, trimmedDescription);
      }, 100);
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

  // Auto-generate LaTeX when resume is generated or updated
  useEffect(() => {
    if (optimizationResult) {
      const resumeSource = customizedResume || optimizationResult?.selectedResume;
      if (resumeSource) {
        try {
          const latex = buildLatexDocument(resumeSource);
          setLatexSource(latex);
        } catch (error) {
          console.error('Error building LaTeX preview:', error);
        }
      }
    }
  }, [optimizationResult, customizedResume]);

  // Auto-render PDF when resume is first generated (but not on every update to avoid excessive API calls)
  useEffect(() => {
    if (optimizationResult && !latexPdfBase64 && !renderingPdf) {
      const resumeSource = customizedResume || optimizationResult?.selectedResume;
      if (resumeSource) {
        // Small delay to let LaTeX generate first
        const timer = setTimeout(() => {
          renderPdfPreview();
        }, 500);
        return () => clearTimeout(timer);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optimizationResult]);

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
        skills: resumeData.skills || [],
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

      {/* Header Section */}
      <div className="generate-resume-header">
        <h1>Generate Resume</h1>
        <p className="generate-resume-subtitle">Create a tailored resume for any job description</p>
      </div>

      {/* Job Description Section - Hide after resume is generated */}
      {!optimizationResult && (
        <div className="section section-modern">
          <div className="section-header-modern">
            <h2>Job Description</h2>
            <p className="section-description">
              Choose how you want to generate your resume
            </p>
          </div>

          {/* Mode Selector */}
          <div className="input-mode-selector">
            <button
              className={`mode-button ${inputMode === 'paste' ? 'active' : ''}`}
              onClick={() => {
                setInputMode('paste');
                setSelectedArea(null);
                setCurrentJob(null);
              }}
            >
              <Icon name="file" size={16} />
              Paste Job Description
            </button>
            <button
              className={`mode-button ${inputMode === 'area' ? 'active' : ''}`}
              onClick={() => {
                setInputMode('area');
                setCurrentJob(null);
              }}
            >
              <Icon name="target" size={16} />
              Select Area of Focus
            </button>
          </div>

          {/* Paste Job Description Mode */}
          {inputMode === 'paste' && (
            <JobMatcher
              jobDescription={currentJob?.description || ''}
              onExtract={hideExtract ? undefined : handleExtractJobDescription}
              onSelect={handleSelect}
              loading={loading}
            />
          )}

          {/* Area of Focus Mode */}
          {inputMode === 'area' && (
            <div className="area-selection">
              <p className="area-selection-description">
                Select a focus area to generate a resume tailored for that role. We'll use a comprehensive job description covering typical requirements for that position.
              </p>
              <div className="area-grid">
                {getAvailableAreas().map((area) => (
                  <button
                    key={area}
                    className={`area-card ${selectedArea === area ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedArea(area);
                      const jobDescription = getJobDescriptionForArea(area);
                      setCurrentJob({
                        description: jobDescription,
                        source: 'template',
                        area: area
                      });
                    }}
                    disabled={loading}
                  >
                    <div className="area-card-content">
                      <h3>{getAreaDisplayName(area)}</h3>
                      <p className="area-card-description">
                        {area === 'backend' && 'API design, databases, microservices, cloud infrastructure'}
                        {area === 'frontend' && 'React, Vue, UI/UX, responsive design, web performance'}
                        {area === 'fullstack' && 'End-to-end development, full application stack expertise'}
                        {area === 'devops' && 'CI/CD, Kubernetes, cloud infrastructure, automation'}
                        {area === 'mobile' && 'iOS, Android, React Native, Flutter, mobile apps'}
                        {area === 'data' && 'Data pipelines, ETL, big data, data warehousing'}
                        {area === 'ml' && 'Machine learning, deep learning, MLOps, AI systems'}
                        {area === 'security' && 'Cybersecurity, penetration testing, security architecture'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
              
              {/* Generate Button */}
              {selectedArea && currentJob?.description && (
                <div className="job-matcher-actions">
                  <button
                    className="btn btn-primary btn-large btn-modern"
                    onClick={() => handleSelect(currentJob.description)}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Icon name="loader" size={16} />
                        Generating Resume...
                      </>
                    ) : (
                      <>
                        <Icon name="target" size={16} />
                        Generate Resume
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Keyword Scanner - Show when there's keyword data, even after resume is generated */}
      {(keywordData || scanningKeywords) && (
        <div className="section section-modern">
          <div className="section-header-modern">
            <h2>Keyword Analysis</h2>
            <p className="section-description">
              See which keywords from the job description match your resume
            </p>
          </div>
          <KeywordScanner keywordData={keywordData} loading={scanningKeywords} />
        </div>
      )}

      {/* Optimization Results - Two Column Layout */}
      {optimizationResult && (
        <div className="generate-resume-results-container">
          {/* Left Column: Resume Sections */}
          <div className="generate-resume-left-column">
            <div className="section section-modern">
              <div className="section-header-modern-with-action">
                <div>
                  <h2>Selected Resume</h2>
                  <p className="section-description">
                    Review and customize your selected resume. {optimizationResult.fitsOnePage 
                      ? '✅ Fits on one page' 
                      : '⚠️ Exceeds one page limit'}
                  </p>
                </div>
                <div className="section-header-actions">
                  <button
                    className="btn btn-secondary btn-modern"
                    onClick={() => {
                      setOptimizationResult(null);
                      setCurrentJob(null);
                      setCustomizedBullets(null);
                      setCustomizedResume(null);
                      setKeywordData(null);
                      setLatexSource('');
                      setLatexPdfBase64(null);
                      setShowLatexPreview(false);
                      setInputMode('paste');
                      setSelectedArea(null);
                    }}
                    title="Generate a new resume for a different job"
                  >
                    <Icon name="refresh" size={16} />
                    Generate New Resume
                  </button>
                  <button
                    className="btn btn-primary btn-modern"
                    onClick={() => setShowSaveDialog(true)}
                    disabled={saving}
                  >
                    <Icon name="save" size={16} />
                    Save Resume
                  </button>
                </div>
              </div>
              
              <SelectedResumeEditor
                resume={customizedResume || optimizationResult.selectedResume}
                onUpdate={handleResumeUpdate}
                showPersonalInfo={false}
                showSkills={true}
                showEducation={true}
                summary={{
                  fitsOnePage: optimizationResult.fitsOnePage,
                  totalLineCount: optimizationResult.totalLineCount,
                  maxLines: optimizationResult.maxLines,
                  processingTime: optimizationResult.processingTime
                }}
                verticalLayout={true}
              />
            </div>
          </div>

          {/* Right Column: LaTeX Preview */}
          <div className="generate-resume-right-column">
            <div className="latex-preview-panel">
              <div className="latex-preview-panel-header">
                <h3>LaTeX Preview</h3>
                <button
                  className="btn btn-primary btn-small"
                  onClick={async () => {
                    const resumeSource = customizedResume || optimizationResult?.selectedResume;
                    if (!resumeSource) return;
                    
                    // Generate LaTeX source
                    try {
                      const latex = buildLatexDocument(resumeSource);
                      setLatexSource(latex);
                      
                      // Render PDF
                      await renderPdfPreview();
                    } catch (error) {
                      console.error('Error building LaTeX preview:', error);
                      alert('Could not generate LaTeX preview. Please try again.');
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
        resumeData={customizedResume || optimizationResult?.selectedResume}
      />
    </div>
  );
}

export default GenerateResume;

