import React, { useState } from 'react';
import ResumeUpload from './ResumeUpload';
import { Icon } from './Icons';
import './Onboarding.css';

/**
 * Onboarding Component
 * Shows when user first signs in with no data
 * Allows them to choose between uploading a resume or manually entering data
 */
function Onboarding({ onUploadComplete, onSkip }) {
  const [mode, setMode] = useState(null); // 'upload' or 'manual'

  async function handleUpload(fileData) {
    try {
      // TODO: Call backend API to parse resume
      // For now, simulate parsing with a delay and show a message
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock parsed resume data (in real implementation, this would come from backend API)
      // The backend should parse the file and return structured resume data
      const mockParsedResume = {
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

      // Show alert that parsing is not yet implemented
      alert('Resume parsing is not yet implemented. For now, please enter your resume information manually.');

      if (onUploadComplete) {
        await onUploadComplete(mockParsedResume, fileData);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload resume. Please try again.');
      throw error;
    }
  }

  function handleSkip() {
    if (onSkip) {
      onSkip();
    }
  }

  if (mode === 'upload') {
    return (
      <div className="onboarding-container">
        <div className="onboarding-header">
          <button
            className="btn-back"
            onClick={() => setMode(null)}
          >
            ← Back
          </button>
          <h1>Upload Your Resume</h1>
          <p className="subtitle">We'll extract your information automatically</p>
        </div>
        <ResumeUpload
          onUpload={handleUpload}
          onCancel={() => setMode(null)}
        />
      </div>
    );
  }

  return (
    <div className="onboarding-container">
      <div className="onboarding-header">
        <h1>Welcome to Resumax! 👋</h1>
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
    </div>
  );
}

export default Onboarding;

