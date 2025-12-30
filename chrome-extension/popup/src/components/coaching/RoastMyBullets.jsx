import React, { useState } from 'react';
import { Icon } from '../ui/Icons';
import { roastResume, buildStructuredResume } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import './RoastMyBullets.css';

/**
 * Roast My Bullets Component
 * Provides brutally honest feedback on resume bullets
 */
function RoastMyBullets({ resume, onBack }) {
  const [loading, setLoading] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const { error: showError } = useToast();

  async function handleGenerateRoast() {
    if (!resume) {
      showError('No resume data available. Please add some experiences or projects first.');
      return;
    }

    // Check if resume has any bullets
    const hasBullets = 
      (resume.experiences && resume.experiences.some(exp => exp.bullets && exp.bullets.length > 0)) ||
      (resume.projects && resume.projects.some(proj => proj.bullets && proj.bullets.length > 0)) ||
      (resume.education && resume.education.some(edu => edu.bullets && edu.bullets.length > 0)) ||
      (resume.customSections && resume.customSections.some(section => section.bullets && section.bullets.length > 0));

    if (!hasBullets) {
      showError('Your resume has no bullet points. Please add some experiences, projects, or education entries with bullets first.');
      return;
    }

    setLoading(true);
    setFeedback(null);

    try {
      // Build structured resume for API
      const structuredResume = buildStructuredResume(resume);
      
      // Call API
      const response = await roastResume({ resume: structuredResume });
      
      setFeedback(response);
      setShowFeedback(true);
    } catch (error) {
      console.error('Error generating roast:', error);
      showError(error?.message || 'Failed to generate roast. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function getIssueIcon(type) {
    switch (type) {
      case 'good':
        return <Icon name="checkCircle" size={16} className="issue-icon issue-icon-good" />;
      case 'bad':
        return <Icon name="xCircle" size={16} className="issue-icon issue-icon-bad" />;
      case 'improvement':
        return <Icon name="alert" size={16} className="issue-icon issue-icon-improvement" />;
      case 'suggestion':
        return <Icon name="lightbulb" size={16} className="issue-icon issue-icon-suggestion" />;
      case 'format':
        return <Icon name="warning" size={16} className="issue-icon issue-icon-warning" />;
      case 'grammar':
        return <Icon name="xCircle" size={16} className="issue-icon issue-icon-bad" />;
      case 'warning':
        return <Icon name="warning" size={16} className="issue-icon issue-icon-warning" />;
      case 'info':
      case 'error':
        return <Icon name="checkCircle" size={16} className="issue-icon issue-icon-info" />;
      default:
        return null;
    }
  }

  function getIssueLabel(type) {
    switch (type) {
      case 'good':
        return 'Strength';
      case 'bad':
        return 'Issue';
      case 'improvement':
        return 'Could improve';
      case 'suggestion':
        return 'Suggestion';
      case 'format':
        return 'Format';
      case 'grammar':
        return 'Grammar';
      case 'warning':
        return 'Warning';
      case 'info':
        return 'Good';
      case 'error':
        return 'Error';
      default:
        return '';
    }
  }

  if (loading) {
    return (
      <div className="roast-container">
        <div className="roast-header">
          {onBack && (
            <button className="btn-back" onClick={onBack}>
              <Icon name="chevronLeft" size={20} />
              Back to AI Coach
            </button>
          )}
          <h1>Roast My Bullets</h1>
          <p className="roast-subtitle">Getting brutally honest feedback...</p>
        </div>

        <div className="roast-loading">
          <Icon name="loader" size={48} className="spinning" />
          <h3>Analyzing Your Bullets</h3>
          <p>Our AI is reviewing every bullet point and preparing honest feedback.</p>
        </div>
      </div>
    );
  }

  if (showFeedback && feedback) {
    return (
      <div className="roast-container">
        <div className="roast-header">
          {onBack && (
            <button className="btn-back" onClick={onBack}>
              <Icon name="chevronLeft" size={20} />
              Back to AI Coach
            </button>
          )}
          <h1>Roast My Bullets</h1>
          <p className="roast-subtitle">Brutally honest feedback on your resume</p>
        </div>

        {/* TLDR Summary */}
        <div className="roast-tldr">
          <div className="tldr-header">
            <h2>TL;DR</h2>
            <div className="overall-score">
              <span className="score-value">{feedback.overallScore?.toFixed(1) || '0.0'}</span>
              <span className="score-label">/ 10</span>
            </div>
          </div>
          <p className="tldr-text">{feedback.tldr || 'No summary available.'}</p>
          <div className="tldr-stats">
            <div className="stat-item">
              <span className="stat-value">{feedback.totalBullets || 0}</span>
              <span className="stat-label">Total Bullets</span>
            </div>
            <div className="stat-item">
              <span className="stat-value stat-issues">{feedback.issuesFound || 0}</span>
              <span className="stat-label">Issues Found</span>
            </div>
            <div className="stat-item">
              <span className="stat-value stat-strengths">{feedback.strengths || 0}</span>
              <span className="stat-label">Strengths</span>
            </div>
          </div>
        </div>

        {/* Format Issues Section */}
        {feedback.formatIssues && feedback.formatIssues.length > 0 && (
          <div className="roast-section">
            <h2 className="section-title">Format Issues</h2>
            <div className="format-issues-list">
              {feedback.formatIssues.map((formatIssue, index) => (
                <div key={index} className="format-issue-item">
                  <h3 className="format-issue-title">{formatIssue.issue}</h3>
                  <p className="format-issue-details">{formatIssue.details}</p>
                  <div className="format-issue-recommendation">
                    <Icon name="lightbulb" size={16} />
                    <span><strong>Recommendation:</strong> {formatIssue.recommendation}</span>
                  </div>
                  {formatIssue.affectedBullets && formatIssue.affectedBullets.length > 0 && (
                    <p className="format-issue-affected">
                      Affects {formatIssue.affectedBullets.length} bullet{formatIssue.affectedBullets.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* General Issues */}
        {feedback.generalIssues && feedback.generalIssues.length > 0 && (
          <div className="roast-section">
            <h2 className="section-title">General Issues</h2>
            <div className="general-issues-list">
              {feedback.generalIssues.map((issue, index) => (
                <div key={index} className="general-issue-item">
                  <div className="issue-header">
                    {getIssueIcon(issue.type)}
                    <span className="issue-label">{getIssueLabel(issue.type)}</span>
                  </div>
                  <p className="issue-message">{issue.message}</p>
                  {issue.suggestion && (
                    <div className="issue-suggestion">
                      <Icon name="lightbulb" size={14} />
                      <span>{issue.suggestion}</span>
                    </div>
                  )}
                  {issue.examples && issue.examples.length > 0 && (
                    <div className="issue-examples">
                      <strong>Examples:</strong>
                      <ul>
                        {issue.examples.map((example, exIndex) => (
                          <li key={exIndex}>{example}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detailed Feedback by Bullet */}
        {feedback.feedback && feedback.feedback.length > 0 && (
          <div className="roast-section">
            <h2 className="section-title">Detailed Feedback</h2>
            <p className="section-description">Bullet-by-bullet analysis with specific suggestions</p>
            
            <div className="feedback-list">
              {feedback.feedback.map((item) => (
                <div key={item.id} className="feedback-item">
                  <div className="feedback-bullet-header">
                    <div className="bullet-section-badge">{item.sectionTitle || item.section}</div>
                  </div>
                  
                  <div className="feedback-bullet-text">
                    {item.text}
                  </div>

                  {item.issues && item.issues.length > 0 && (
                    <div className="feedback-issues">
                      {item.issues.map((issue, issueIndex) => (
                        <div key={issueIndex} className={`feedback-issue feedback-issue-${issue.type}`}>
                          <div className="issue-header">
                            {getIssueIcon(issue.type)}
                            <span className="issue-label">{getIssueLabel(issue.type)}</span>
                            {issue.severity && (
                              <span className="issue-severity">({issue.severity})</span>
                            )}
                          </div>
                          <p className="issue-message">{issue.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="roast-actions">
          <button 
            className="btn btn-secondary" 
            onClick={() => {
              setShowFeedback(false);
              setFeedback(null);
            }}
          >
            Generate New Roast
          </button>
        </div>
      </div>
    );
  }

  // Initial state - prompt to generate roast
  return (
    <div className="roast-container">
      <div className="roast-header">
        {onBack && (
          <button className="btn-back" onClick={onBack}>
            <Icon name="chevronLeft" size={20} />
            Back to AI Coach
          </button>
        )}
        <h1>Roast My Bullets</h1>
        <p className="roast-subtitle">
          Get brutally honest feedback on your resume bullets. Our AI will tell you exactly what's wrong and how to fix it.
        </p>
      </div>

      <div className="roast-prompt">
        <div className="prompt-icon">
          <Icon name="zap" size={64} />
        </div>
        <h2>Ready for Some Tough Love?</h2>
        <p>
          We'll analyze all your resume bullets and give you honest, actionable feedback. 
          No sugar-coating, just straight talk about what works and what doesn't.
        </p>
        <button 
          className="btn btn-primary btn-large"
          onClick={handleGenerateRoast}
        >
          <Icon name="zap" size={20} />
          Roast My Bullets
        </button>
      </div>
    </div>
  );
}

export default RoastMyBullets;

