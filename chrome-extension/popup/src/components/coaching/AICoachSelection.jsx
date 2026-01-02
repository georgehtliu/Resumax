import React from 'react';
import { Icon } from '../ui/Icons';
import './AICoachSelection.css';

/**
 * AI Coach Selection Component
 * Modern design matching the About and Resume Tips pages
 */
function AICoachSelection({ onSelectOption }) {
  const options = [
    {
      id: 'roast',
      title: 'Roast My Bullets',
      description: 'Get brutally honest feedback on your resume bullets. Our AI will tell you exactly what\'s wrong and how to fix it.',
      icon: 'zap',
      color: 'orange',
      features: ['Honest', 'Direct', 'Actionable']
    },
    {
      id: 'interview-prep',
      title: 'Interview Question Prep',
      description: 'Generate interview questions based on your resume bullets. Get STAR-method answer frameworks to help you articulate your experiences clearly.',
      icon: 'messageSquare',
      color: 'purple',
      features: ['STAR Method', 'Behavioral', 'Technical']
    }
  ];

  return (
    <div className="ai-coach-selection-modern">
      {/* Hero Section */}
      <div className="coach-hero">
        <div className="coach-hero-content">
          <h1 className="coach-hero-title">
            AI Coach
          </h1>
          <p className="coach-hero-subtitle">
            Get AI-powered feedback and suggestions for your resume
          </p>
        </div>
      </div>

      {/* Options Grid */}
      <div className="coach-options-modern">
        {options.map((option) => (
          <div
            key={option.id}
            className={`coach-option-card-modern coach-option-${option.color}`}
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
            <div className="coach-option-header">
              <div className={`coach-option-icon-modern coach-icon-${option.color}`}>
                <Icon name={option.icon} size={32} />
              </div>
            </div>
            <h3 className="coach-option-title-modern">{option.title}</h3>
            <p className="coach-option-description-modern">{option.description}</p>
            <div className="coach-option-features-modern">
              {option.features.map((feature, index) => (
                <span key={index} className="coach-feature-tag-modern">
                  {feature}
                </span>
              ))}
            </div>
            <div className="coach-option-action-modern">
              <span className="coach-action-text">Get Started</span>
              <Icon name="chevronRight" size={18} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AICoachSelection;

