import React from 'react';
import { Icon } from '../ui/Icons';
import './HumanCritiqueSelection.css';

/**
 * Human Critique Selection Component
 * Modern design matching the About and Resume Tips pages
 */
function HumanCritiqueSelection({ onSelectOption }) {
  const options = [
    {
      id: 'review',
      title: 'Review Resume',
      description: 'Browse and provide feedback on resumes submitted by other users. Help others improve while building your reviewer reputation.',
      icon: 'file',
      color: 'blue'
    },
    {
      id: 'get-reviewed',
      title: 'Have My Resume Reviewed',
      description: 'Submit your resume for review by experienced professionals. Get detailed, actionable feedback to improve your resume.',
      icon: 'messageSquare',
      color: 'green'
    }
  ];

  return (
    <div className="human-critique-selection-modern">
      {/* Hero Section */}
      <div className="critique-hero">
        <div className="critique-hero-content">
          <h1 className="critique-hero-title">
            Critique with Human
          </h1>
          <p className="critique-hero-subtitle">
            Connect with experienced reviewers for personalized feedback
          </p>
        </div>
      </div>

      {/* Options Grid */}
      <div className="critique-options-modern">
        {options.map((option) => (
          <div
            key={option.id}
            className={`critique-option-card-modern critique-option-${option.color}`}
            onClick={() => onSelectOption(option.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectOption(option.id);
              }
            }}
          >
            <div className="critique-option-header">
              <div className={`critique-option-icon-modern critique-icon-${option.color}`}>
                <Icon name={option.icon} size={32} />
              </div>
            </div>
            <h3 className="critique-option-title-modern">{option.title}</h3>
            <p className="critique-option-description-modern">{option.description}</p>
            <div className="critique-option-action-modern">
              <span className="critique-action-text">Get Started</span>
              <Icon name="chevronRight" size={18} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default HumanCritiqueSelection;
