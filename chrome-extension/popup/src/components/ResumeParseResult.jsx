import React, { useState } from 'react';
import { Icon } from './ui/Icons';
import './ResumeParseResult.css';

/**
 * Component to display resume parsing results and handle user actions.
 * Shows success/error states and allows users to accept, edit, or reject parsed data.
 */
function ResumeParseResult({ parseResult, onAccept, onReject, onEdit }) {
  const { success, resume, raw_text, warnings, errors, extraction_quality, extracted_sections } = parseResult;
  const [showRawText, setShowRawText] = useState(false);
  
  // Complete failure - no text extracted
  if (!success && !raw_text) {
    return (
      <div className="parse-result parse-result-error">
        <div className="parse-result-header">
          <Icon name="alert-circle" size={24} />
          <h3>Could Not Parse Resume</h3>
        </div>
        <div className="parse-result-content">
          <p className="parse-error-message">{errors.join(', ')}</p>
          <div className="parse-actions">
            <button className="btn btn-secondary" onClick={onReject}>
              Try Different File
            </button>
            <button className="btn btn-primary" onClick={() => onEdit && onEdit(null)}>
              Enter Manually
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Text extracted but structuring failed
  if (!success && raw_text) {
    return (
      <div className="parse-result parse-result-partial">
        <div className="parse-result-header">
          <Icon name="alert-triangle" size={24} />
          <h3>Text Extracted, But Structuring Failed</h3>
        </div>
        <div className="parse-result-content">
          <p>We extracted the text but couldn't automatically organize it into structured sections.</p>
          {warnings.length > 0 && (
            <div className="parse-warnings">
              {warnings.map((warning, i) => (
                <div key={i} className="parse-warning">
                  <Icon name="info" size={16} />
                  <span>{warning}</span>
                </div>
              ))}
            </div>
          )}
          <details className="parse-raw-text-details">
            <summary onClick={() => setShowRawText(!showRawText)}>
              {showRawText ? 'Hide' : 'View'} Extracted Text
            </summary>
            <pre className="parse-raw-text">{raw_text}</pre>
          </details>
          <div className="parse-actions">
            <button className="btn btn-primary" onClick={() => onEdit && onEdit(raw_text)}>
              Review & Edit Text
            </button>
            <button className="btn btn-secondary" onClick={onReject}>
              Try Different File
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Success (complete or partial)
  const missingSections = Object.entries(extracted_sections || {})
    .filter(([_, found]) => !found)
    .map(([section]) => section);
  
  const qualityLabels = {
    complete: 'Complete',
    partial: 'Partial',
    minimal: 'Minimal'
  };
  
  return (
    <div className={`parse-result parse-result-success parse-result-${extraction_quality}`}>
      <div className="parse-result-header">
        <Icon name="check-circle" size={24} />
        <h3>Resume Parsed Successfully</h3>
        <span className="parse-quality-badge">{qualityLabels[extraction_quality] || 'Unknown'}</span>
      </div>
      
      <div className="parse-result-content">
        {extraction_quality === 'partial' && missingSections.length > 0 && (
          <div className="parse-warning">
            <Icon name="info" size={16} />
            <span>Some sections were not found: <strong>{missingSections.join(', ')}</strong>. You can add them manually after importing.</span>
          </div>
        )}
        
        {extraction_quality === 'minimal' && (
          <div className="parse-warning">
            <Icon name="alert-triangle" size={16} />
            <span>Very little information was extracted. Please review and add details manually.</span>
          </div>
        )}
        
        {warnings.length > 0 && (
          <div className="parse-warnings">
            {warnings.map((warning, i) => (
              <div key={i} className="parse-warning">
                <Icon name="info" size={16} />
                <span>{warning}</span>
              </div>
            ))}
          </div>
        )}
        
        {resume && (
          <div className="parse-preview">
            <h4>Extracted Information:</h4>
            <ul className="parse-summary">
              {resume.personalInfo && (resume.personalInfo.firstName || resume.personalInfo.lastName) && (
                <li>✓ Personal Information</li>
              )}
              {resume.experiences && resume.experiences.length > 0 && (
                <li>✓ {resume.experiences.length} Experience{resume.experiences.length !== 1 ? 's' : ''}</li>
              )}
              {resume.education && resume.education.length > 0 && (
                <li>✓ {resume.education.length} Education Entry{resume.education.length !== 1 ? 'ies' : ''}</li>
              )}
              {resume.projects && resume.projects.length > 0 && (
                <li>✓ {resume.projects.length} Project{resume.projects.length !== 1 ? 's' : ''}</li>
              )}
              {resume.skills && resume.skills.length > 0 && (
                <li>✓ {resume.skills.length} Skill Group{resume.skills.length !== 1 ? 's' : ''}</li>
              )}
            </ul>
          </div>
        )}
        
        <div className="parse-actions">
          <button 
            className="btn btn-primary" 
            onClick={() => onAccept && onAccept(resume)}
          >
            Use This Resume
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={() => onEdit && onEdit(resume)}
          >
            Edit Before Using
          </button>
          {raw_text && (
            <button 
              className="btn btn-secondary" 
              onClick={() => {
                setShowRawText(!showRawText);
                if (showRawText) {
                  onEdit && onEdit(raw_text);
                }
              }}
            >
              {showRawText ? 'Edit Raw Text' : 'View Raw Text'}
            </button>
          )}
        </div>
        
        {showRawText && raw_text && (
          <details className="parse-raw-text-details" open>
            <summary>Raw Extracted Text</summary>
            <pre className="parse-raw-text">{raw_text}</pre>
          </details>
        )}
      </div>
    </div>
  );
}

export default ResumeParseResult;

