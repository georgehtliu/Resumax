import React, { useState } from 'react';
import { Icon } from '../ui/Icons';
import './RoastMyBullets.css';

/**
 * Roast My Bullets Component
 * Provides brutally honest feedback on resume bullets
 */
function RoastMyBullets({ resume, onBack }) {
  const [loading, setLoading] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  // Mock data structure for demonstration
  // TODO: Replace with actual API call
  const mockFeedback = {
    tldr: "Your resume has potential but needs work. 60% of your bullets are too vague, missing quantifiable results, or use weak action verbs. The good news? These are all fixable issues that will dramatically improve your resume's impact.",
    overallScore: 4.2,
    totalBullets: 15,
    issuesFound: 9,
    strengths: 3,
    feedback: [
      {
        id: 'bullet-1',
        text: 'Developed and maintained microservices handling 10M+ daily requests using Python, Go, and Kubernetes, ensuring 99.9% uptime',
        section: 'experience',
        sectionTitle: 'Software Engineer II at Google',
        issues: [
          {
            type: 'good',
            message: 'Great use of specific numbers and technologies'
          },
          {
            type: 'improvement',
            message: 'Could add impact - what business value did this deliver?'
          }
        ]
      },
      {
        id: 'bullet-2',
        text: 'Worked on improving database performance',
        section: 'experience',
        sectionTitle: 'Software Engineer II at Google',
        issues: [
          {
            type: 'bad',
            message: 'Too vague - "worked on" is weak. Use specific action verbs like "optimized", "reduced", "improved"'
          },
          {
            type: 'bad',
            message: 'Missing quantifiable results - how much did performance improve?'
          },
          {
            type: 'bad',
            message: 'No technologies mentioned - which database? What techniques?'
          },
          {
            type: 'suggestion',
            message: 'Try: "Optimized PostgreSQL queries and implemented Redis caching, reducing API response time by 40% and saving $50K annually in infrastructure costs"'
          }
        ]
      },
      {
        id: 'bullet-3',
        text: 'Led team to build features',
        section: 'experience',
        sectionTitle: 'Software Engineer II at Google',
        issues: [
          {
            type: 'bad',
            message: 'Extremely vague - what team size? What features? What impact?'
          },
          {
            type: 'bad',
            message: '"Led team" is passive - use "Led a team of X engineers"'
          },
          {
            type: 'bad',
            message: '"Build features" tells us nothing - be specific about what was built'
          },
          {
            type: 'suggestion',
            message: 'Try: "Led a team of 3 engineers to ship a recommendation feature that increased user engagement by 25% and generated $2M in additional revenue"'
          }
        ]
      }
    ],
    generalIssues: [
      {
        type: 'warning',
        message: 'Many bullets start with weak verbs like "worked on", "helped", "participated"',
        suggestion: 'Start with strong action verbs: "Designed", "Implemented", "Optimized", "Architected", "Led"'
      },
      {
        type: 'warning',
        message: 'Missing quantifiable metrics in 60% of bullets',
        suggestion: 'Add numbers: percentages, dollar amounts, scale (users, requests, data volume)'
      },
      {
        type: 'info',
        message: 'Good use of specific technologies throughout',
        suggestion: null
      }
    ]
  };

  async function handleGenerateRoast() {
    setLoading(true);
    // TODO: Call backend API to generate roast
    // For now, just simulate loading
    setTimeout(() => {
      setLoading(false);
      setShowFeedback(true);
    }, 2000);
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
      case 'warning':
        return <Icon name="warning" size={16} className="issue-icon issue-icon-warning" />;
      case 'info':
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
      case 'warning':
        return 'Warning';
      case 'info':
        return 'Good';
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

  if (showFeedback) {
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
              <span className="score-value">{mockFeedback.overallScore.toFixed(1)}</span>
              <span className="score-label">/ 10</span>
            </div>
          </div>
          <p className="tldr-text">{mockFeedback.tldr}</p>
          <div className="tldr-stats">
            <div className="stat-item">
              <span className="stat-value">{mockFeedback.totalBullets}</span>
              <span className="stat-label">Total Bullets</span>
            </div>
            <div className="stat-item">
              <span className="stat-value stat-issues">{mockFeedback.issuesFound}</span>
              <span className="stat-label">Issues Found</span>
            </div>
            <div className="stat-item">
              <span className="stat-value stat-strengths">{mockFeedback.strengths}</span>
              <span className="stat-label">Strengths</span>
            </div>
          </div>
        </div>

        {/* General Issues */}
        {mockFeedback.generalIssues && mockFeedback.generalIssues.length > 0 && (
          <div className="roast-section">
            <h2 className="section-title">General Issues</h2>
            <div className="general-issues-list">
              {mockFeedback.generalIssues.map((issue, index) => (
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
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detailed Feedback by Bullet */}
        <div className="roast-section">
          <h2 className="section-title">Detailed Feedback</h2>
          <p className="section-description">Bullet-by-bullet analysis with specific suggestions</p>
          
          <div className="feedback-list">
            {mockFeedback.feedback.map((item) => (
              <div key={item.id} className="feedback-item">
                <div className="feedback-bullet-header">
                  <div className="bullet-section-badge">{item.sectionTitle}</div>
                </div>
                
                <div className="feedback-bullet-text">
                  {item.text}
                </div>

                <div className="feedback-issues">
                  {item.issues.map((issue, issueIndex) => (
                    <div key={issueIndex} className={`feedback-issue feedback-issue-${issue.type}`}>
                      <div className="issue-header">
                        {getIssueIcon(issue.type)}
                        <span className="issue-label">{getIssueLabel(issue.type)}</span>
                      </div>
                      <p className="issue-message">{issue.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="roast-actions">
          <button className="btn btn-secondary" onClick={() => setShowFeedback(false)}>
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

