import React, { useState } from 'react';
import './JobMatcher.css';

/**
 * Job Matcher Component
 * 
 * Handles:
 * - Extracting job description from current tab
 * - Manual job description input
 * - Triggering optimization
 */
function JobMatcher({ jobDescription, onExtract, onOptimize, loading }) {
  const [manualJD, setManualJD] = useState(jobDescription || '');
  const [extractionStatus, setExtractionStatus] = useState('');

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

  function handleOptimize() {
    const jd = manualJD.trim();
    if (!jd) {
      alert('Please enter or extract a job description first.');
      return;
    }

    if (jd.length < 100) {
      alert('Job description seems too short. Please provide more details.');
      return;
    }

    onOptimize(jd);
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

      <div className="job-matcher-actions">
        <button
          className="btn btn-primary btn-large"
          onClick={handleOptimize}
          disabled={loading || !manualJD.trim()}
        >
          {loading ? 'Optimizing...' : '🚀 Match Best Bullets'}
        </button>
      </div>
    </div>
  );
}

export default JobMatcher;


