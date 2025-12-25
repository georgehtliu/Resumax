import React from 'react';
import './ResumeCoaching.css';

/**
 * Resume Coaching Component
 * Barebones placeholder for future coaching features
 */
function ResumeCoaching() {
  return (
    <div className="coaching-page">
      <div className="coaching-header">
        <h1>Resume Coaching</h1>
        <p className="coaching-subtitle">Get personalized feedback and tips to improve your resume</p>
      </div>

      <div className="coaching-content">
        <div className="coaching-placeholder">
          <div className="placeholder-icon">🎓</div>
          <h2>Coming Soon</h2>
          <p>Resume coaching features will be available here soon.</p>
          <p className="placeholder-subtext">
            Get AI-powered feedback, industry-specific tips, and personalized recommendations
            to make your resume stand out.
          </p>
        </div>
      </div>
    </div>
  );
}

export default ResumeCoaching;

