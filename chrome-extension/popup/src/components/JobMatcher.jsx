import React, { useState, useEffect } from 'react';
import './JobMatcher.css';

/**
 * Job Matcher Component
 * 
 * Handles:
 * - Extracting job description from current tab
 * - Manual job description input
 * - Triggering selection or optimization based on mode
 * - Displaying job description in collapsible textbox
 */
function JobMatcher({ jobDescription, onExtract, onSelect, onOptimize, optimizationMode, loading }) {
  const [manualJD, setManualJD] = useState(jobDescription || '');
  const [extractionStatus, setExtractionStatus] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Sync jobDescription prop with local state
  useEffect(() => {
    if (jobDescription) {
      setManualJD(jobDescription);
    }
  }, [jobDescription]);
  
  // Character limit for shortened view
  const SHORT_LIMIT = 300;
  const isLong = manualJD.length > SHORT_LIMIT;
  const displayText = isExpanded || !isLong ? manualJD : manualJD.substring(0, SHORT_LIMIT) + '...';

  async function handleExtract() {
    setExtractionStatus('Extracting...');
    try {
      await onExtract();
      setExtractionStatus('✓ Extracted successfully!');
      setTimeout(() => setExtractionStatus(''), 3000);
    } catch (error) {
      setExtractionStatus('✗ Extraction failed');
      setTimeout(() => setExtractionStatus(''), 3000);
    }
  }

  function handleProcess() {
    const jd = manualJD.trim();
    if (!jd) {
      alert('Please enter or extract a job description first.');
      return;
    }

    if (jd.length < 100) {
      alert('Job description seems too short. Please provide more details.');
      return;
    }

    // Call appropriate handler based on mode
    if (optimizationMode === 'select' && onSelect) {
      onSelect(jd);
    } else if (optimizationMode === 'optimize' && onOptimize) {
      onOptimize(jd);
    }
  }

  return (
    <div className="job-matcher">
      <div className="job-matcher-section">
        <h3>Option 1: Extract from Current Tab</h3>
        <p className="section-description">
          Navigate to a job posting (LinkedIn, Indeed, etc.) and click Extract.
        </p>
        <button
          className="btn btn-primary"
          onClick={handleExtract}
          disabled={loading}
        >
          📄 Extract Job Description
        </button>
        {extractionStatus && (
          <p className="status-message">{extractionStatus}</p>
        )}
      </div>

      <div className="divider">OR</div>

      <div className="job-matcher-section">
        <h3>Option 2: Paste Job Description</h3>
        <p className="section-description">
          Copy and paste the job description manually.
        </p>
        <textarea
          className="jd-textarea"
          value={manualJD}
          onChange={(e) => setManualJD(e.target.value)}
          placeholder="Paste job description here..."
          rows={8}
        />
        <div className="jd-stats">
          <span>{manualJD.length} characters</span>
          {manualJD.length > 0 && (
            <span className={manualJD.length < 100 ? 'warning' : 'ok'}>
              {manualJD.length < 100 ? '⚠ Too short' : '✓ Good length'}
            </span>
          )}
        </div>
      </div>

      {/* Job Description Preview (when extracted or entered) */}
      {manualJD && (
        <div className="job-matcher-section">
          <div className="jd-preview-header">
            <h3>Job Description Preview</h3>
            {isLong && (
              <button
                className="btn-toggle-expand"
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? '▼ Collapse' : '▶ Expand'}
              </button>
            )}
          </div>
          <div className={`jd-preview-box ${isExpanded ? 'expanded' : ''}`}>
            <div className="jd-preview-text">
              {displayText}
            </div>
            {isLong && !isExpanded && (
              <div className="jd-preview-fade">
                <button
                  className="btn-expand-inline"
                  onClick={() => setIsExpanded(true)}
                >
                  Show full description ({manualJD.length} chars)
                </button>
              </div>
            )}
          </div>
          <div className="jd-stats">
            <span>{manualJD.length} characters total</span>
            {isLong && (
              <span className="info">
                {isExpanded ? 'Showing full' : `Showing first ${SHORT_LIMIT} of ${manualJD.length}`}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="job-matcher-actions">
        <button
          className="btn btn-primary btn-large"
          onClick={handleProcess}
          disabled={loading || !manualJD.trim()}
        >
          {loading 
            ? (optimizationMode === 'optimize' ? 'Optimizing...' : 'Selecting...')
            : (optimizationMode === 'optimize' 
                ? '✨ Optimize & Rewrite' 
                : '📋 Select Best Bullets')}
        </button>
      </div>
    </div>
  );
}

export default JobMatcher;


