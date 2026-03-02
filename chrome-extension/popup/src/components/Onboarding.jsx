import React, { useState } from 'react';
import ResumeUpload from './ResumeUpload';
import ResumeParseResult from './ResumeParseResult';
import { Icon } from './ui/Icons';
import { useToast } from '../hooks/useToast';
import ToastContainer from './ui/ToastContainer';
import { parseResumeStream } from '../services/api';
import './Onboarding.css';

/**
 * Onboarding Component
 * Shows when user first signs in with no data
 * Allows them to choose between uploading a resume or manually entering data
 */
function Onboarding({ onUploadComplete, onSkip }) {
  const { toasts, removeToast, error: showError } = useToast();
  const [mode, setMode] = useState(null); // 'upload' or 'manual'
  const [parseResult, setParseResult] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [currentFileData, setCurrentFileData] = useState(null);
  const [parseStep, setParseStep] = useState(null);

  async function handleUpload(fileData) {
    setUploading(true);
    setParseStep(null);
    setCurrentFileData(fileData);
    let streamError = null;
    try {
      await parseResumeStream(fileData, (event) => {
        if (event.type === 'progress') {
          setParseStep(event.message);
        } else if (event.type === 'complete') {
          setParseResult(event.result);
        } else if (event.type === 'error') {
          streamError = event.message;
        }
      });
      if (streamError) {
        showError(streamError || 'Failed to parse resume. Please try again.');
      }
    } catch (error) {
      console.error('Upload error:', error);
      showError('Failed to parse resume. Please try again.');
    } finally {
      setUploading(false);
      setParseStep(null);
    }
  }

  async function handleAccept(resume) {
    if (onUploadComplete) {
      await onUploadComplete(resume, currentFileData);
    }
  }

  function handleReject() {
    setParseResult(null);
    setCurrentFileData(null);
  }

  async function handleEdit(resume) {
    // Treat edit same as accept — App.jsx will open the profile editor
    if (onUploadComplete) {
      await onUploadComplete(resume || {}, currentFileData);
    }
  }

  function handleSkip() {
    if (onSkip) {
      onSkip();
    }
  }

  if (mode === 'upload') {
    if (parseResult) {
      return (
        <div className="onboarding-container">
          <div className="onboarding-header">
            <button
              className="btn-back"
              onClick={handleReject}
            >
              ← Back
            </button>
            <h1>Resume Parsed</h1>
            <p className="subtitle">Review the extracted information below</p>
          </div>
          <ResumeParseResult
            parseResult={parseResult}
            onAccept={handleAccept}
            onReject={handleReject}
            onEdit={handleEdit}
          />
          <ToastContainer toasts={toasts} removeToast={removeToast} />
        </div>
      );
    }

    return (
      <div className="onboarding-container">
        <div className="onboarding-header">
          <button
            className="btn-back"
            onClick={() => setMode(null)}
            disabled={uploading}
          >
            ← Back
          </button>
          <h1>Upload Your Resume</h1>
          <p className="subtitle">
            {uploading ? 'Parsing your resume…' : "We'll extract your information automatically"}
          </p>
          {uploading && parseStep && (
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-primary-600)', marginTop: 'var(--space-2)', textAlign: 'center' }}>
              {parseStep}
            </p>
          )}
        </div>
        <ResumeUpload
          onUpload={handleUpload}
          onCancel={() => setMode(null)}
          disabled={uploading}
        />
        <ToastContainer toasts={toasts} removeToast={removeToast} />
      </div>
    );
  }

  return (
    <div className="onboarding-container">
      <div className="onboarding-header">
        <h1>Welcome to Resume Master! 👋</h1>
        <p className="subtitle">Let's get your resume set up</p>
      </div>

      <div className="onboarding-options">
        <div className="option-card" onClick={() => setMode('upload')}>
          <div className="option-icon">
            <Icon name="file" size={32} />
          </div>
          <h3>Upload Existing Resume</h3>
          <p className="option-description">
            Upload your PDF, DOCX, or TXT resume and we'll extract the information for you.
          </p>
          <div className="option-features">
            <span className="feature-tag">Fast</span>
            <span className="feature-tag">Automatic</span>
          </div>
        </div>

        <div className="option-card" onClick={handleSkip}>
          <div className="option-icon">
            <Icon name="edit" size={32} />
          </div>
          <h3>Enter Manually</h3>
          <p className="option-description">
            Start from scratch and build your master resume step by step.
          </p>
          <div className="option-features">
            <span className="feature-tag">Custom</span>
            <span className="feature-tag">Detailed</span>
          </div>
        </div>
      </div>

      <div className="onboarding-footer">
        <p>You can always add more information later</p>
      </div>
      
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

export default Onboarding;

