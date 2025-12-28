import React from 'react';
import { FileText, MessageSquare, ArrowRight } from 'lucide-react';
import './HumanCritiqueSelection.css';

function HumanCritiqueSelection({ onSelectOption }) {
  return (
    <div className="human-critique-selection">
      <div className="selection-header">
        <h1>Critique with Human</h1>
        <p className="selection-subtitle">Choose how you'd like to engage with human resume reviews</p>
      </div>

      <div className="selection-options">
        <div 
          className="option-card"
          onClick={() => onSelectOption('review')}
        >
          <div className="option-icon">
            <FileText size={32} />
          </div>
          <h2>Review Resume</h2>
          <p className="option-description">
            Browse and provide feedback on resumes submitted by other users. 
            Help others improve while building your reviewer reputation.
          </p>
          <div className="option-action">
            <span>Get Started</span>
            <ArrowRight size={18} />
          </div>
        </div>

        <div 
          className="option-card"
          onClick={() => onSelectOption('get-reviewed')}
        >
          <div className="option-icon">
            <MessageSquare size={32} />
          </div>
          <h2>Have My Resume Reviewed</h2>
          <p className="option-description">
            Submit your resume for review by experienced professionals. 
            Get detailed, actionable feedback to improve your resume.
          </p>
          <div className="option-action">
            <span>Get Started</span>
            <ArrowRight size={18} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default HumanCritiqueSelection;

