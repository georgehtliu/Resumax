import React, { useState, useEffect } from 'react';
import { Icon } from './ui/Icons';
import { useToast } from '../hooks/useToast';
import ToastContainer from './ui/ToastContainer';
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
function JobMatcher({ jobDescription, onExtract, onSelect, loading }) {
  const { toasts, removeToast, warning } = useToast();
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
      setExtractionStatus('Extracted successfully!');
      setTimeout(() => setExtractionStatus(''), 3000);
    } catch (error) {
      setExtractionStatus('Extraction failed');
      setTimeout(() => setExtractionStatus(''), 3000);
    }
  }

  function handleProcess() {
    const jd = manualJD.trim();
    if (!jd) {
      warning('Please enter or extract a job description first.');
      return;
    }

    if (jd.length < 100) {
      warning('Job description seems too short. Please provide more details.');
      return;
    }

    // Call select handler
    if (onSelect) {
      onSelect(jd);
    }
  }

  return (
    <div className="job-matcher">
      {onExtract && (
        <>
          <div className="job-matcher-section">
            <button
              className="btn btn-primary btn-modern"
              onClick={handleExtract}
              disabled={loading}
            >
              <Icon name="file" size={14} />
              Extract from Tab
            </button>
            {extractionStatus && (
              <p className="status-message" style={{ fontSize: 'var(--font-size-xs)', marginTop: 'var(--space-1)' }}>{extractionStatus}</p>
            )}
          </div>

          {onExtract && <div className="divider" style={{ fontSize: 'var(--font-size-xs)', margin: 'var(--space-2) 0' }}>OR</div>}
        </>
      )}

      <div className="job-matcher-section">
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
              {manualJD.length < 100 ? (
                <>
                  <Icon name="warning" size={14} style={{ marginRight: '4px', verticalAlign: 'middle', display: 'inline-block' }} />
                  Too short
                </>
              ) : (
                <>
                  <Icon name="checkCircle" size={14} style={{ marginRight: '4px', verticalAlign: 'middle', display: 'inline-block' }} />
                  Good length
                </>
              )}
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
          className="btn btn-primary btn-large btn-modern"
          onClick={handleProcess}
          disabled={loading || !manualJD.trim()}
        >
          {loading ? (
            <>
              <Icon name="clipboard" size={16} />
              Selecting...
            </>
          ) : (
            <>
              <Icon name="clipboard" size={16} />
              Generate Resume
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default JobMatcher;


