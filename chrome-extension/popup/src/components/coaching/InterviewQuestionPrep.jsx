import React, { useState } from 'react';
import { Icon } from '../ui/Icons';
import { generateInterviewQuestions } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import './InterviewQuestionPrep.css';

/**
 * Interview Question Prep Component
 * Allows users to select an experience or project and generate interview questions
 */
function InterviewQuestionPrep({ resume, onBack }) {
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedType, setSelectedType] = useState(null); // 'experience' or 'project'
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState(null);
  const { error: showError } = useToast();

  // Get experiences and projects from resume
  const experiences = Array.isArray(resume?.experiences) ? resume.experiences : [];
  const projects = Array.isArray(resume?.projects) ? resume.projects : [];

  function handleSelect(item, type) {
    setSelectedItem(item);
    setSelectedType(type);
  }

  async function handleGenerateQuestions() {
    if (!selectedItem) return;
    
    setLoading(true);
    setQuestions(null);

    try {
      const response = await generateInterviewQuestions({
        item: selectedItem,
        itemType: selectedType,
      });
      
      setQuestions(response);
    } catch (error) {
      console.error('Error generating questions:', error);
      showError(error?.message || 'Failed to generate interview questions. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleBackToSelection() {
    setSelectedItem(null);
    setSelectedType(null);
    setQuestions(null);
  }

  // If item is selected, show the generation UI (placeholder for now)
  if (selectedItem) {
    return (
      <div className="interview-prep-container">
        <div className="interview-prep-header">
          <button className="btn-back" onClick={handleBackToSelection}>
            <Icon name="chevronLeft" size={20} />
            Back to Selection
          </button>
          <h1>Interview Question Prep</h1>
          <p className="interview-prep-subtitle">
            Generating interview questions for your selected {selectedType === 'experience' ? 'experience' : 'project'}
          </p>
        </div>

        <div className="selected-item-preview">
          <div className="selected-item-header">
            {selectedType === 'experience' ? (
              <>
                <h2>{selectedItem.role || 'Position'}</h2>
                <p className="selected-item-company">{selectedItem.company || 'Company'}</p>
                {selectedItem.startDate && selectedItem.endDate && (
                  <p className="selected-item-dates">
                    {selectedItem.startDate} - {selectedItem.endDate}
                  </p>
                )}
              </>
            ) : (
              <>
                <h2>{selectedItem.name || 'Project Name'}</h2>
                {selectedItem.description && (
                  <p className="selected-item-description">{selectedItem.description}</p>
                )}
                {selectedItem.technologies && (
                  <p className="selected-item-technologies">{selectedItem.technologies}</p>
                )}
              </>
            )}
          </div>

          {Array.isArray(selectedItem.bullets) && selectedItem.bullets.length > 0 && (
            <div className="selected-item-bullets">
              <h3>Bullet Points</h3>
              <ul>
                {selectedItem.bullets.map((bullet, index) => (
                  <li key={bullet.id || index}>
                    {typeof bullet === 'string' ? bullet : bullet.text || bullet.rewritten || ''}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {questions && questions.questions && questions.questions.length > 0 ? (
          <div className="questions-display">
            <div className="questions-header">
              <h2>Generated Interview Questions</h2>
              <p className="questions-subtitle">
                {questions.questions.length} question{questions.questions.length !== 1 ? 's' : ''} with STAR method guidance
              </p>
            </div>

            <div className="questions-list">
              {questions.questions.map((q, index) => (
                <div key={index} className="question-card">
                  <div className="question-number">Question {index + 1}</div>
                  <h3 className="question-text">{q.question}</h3>
                  
                  {q.whyAsked && (
                    <div className="why-asked">
                      <strong>Why asked:</strong> {q.whyAsked}
                    </div>
                  )}

                  {q.starFramework && (
                    <div className="star-framework">
                      <h4>STAR Method Framework</h4>
                      <div className="star-section">
                        <div className="star-label">Situation:</div>
                        <div className="star-content">{q.starFramework.situation}</div>
                      </div>
                      <div className="star-section">
                        <div className="star-label">Task:</div>
                        <div className="star-content">{q.starFramework.task}</div>
                      </div>
                      <div className="star-section">
                        <div className="star-label">Action:</div>
                        <div className="star-content">{q.starFramework.action}</div>
                      </div>
                      <div className="star-section">
                        <div className="star-label">Result:</div>
                        <div className="star-content">{q.starFramework.result}</div>
                      </div>
                    </div>
                  )}

                  {q.keyPoints && q.keyPoints.length > 0 && (
                    <div className="key-points">
                      <strong>Key points to mention:</strong>
                      <ul>
                        {q.keyPoints.map((point, pointIndex) => (
                          <li key={pointIndex}>{point}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="questions-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setQuestions(null);
                }}
              >
                Generate New Questions
              </button>
            </div>
          </div>
        ) : (
          <div className="generate-section">
            {loading ? (
              <div className="generating-state">
                <Icon name="loader" size={32} className="spinning" />
                <h3>Generating Interview Questions...</h3>
                <p>Our AI is analyzing your {selectedType === 'experience' ? 'experience' : 'project'} and creating tailored interview questions.</p>
              </div>
            ) : (
              <div className="generate-prompt">
                <p>Ready to generate interview questions based on this {selectedType === 'experience' ? 'experience' : 'project'}?</p>
                <button 
                  className="btn btn-primary btn-large"
                  onClick={handleGenerateQuestions}
                >
                  <Icon name="sparkles" size={20} />
                  Generate Questions
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Show selection UI
  return (
    <div className="interview-prep-container">
      <div className="interview-prep-header">
        {onBack && (
          <button className="btn-back" onClick={onBack}>
            <Icon name="chevronLeft" size={20} />
            Back to AI Coach
          </button>
        )}
        <h1>Interview Question Prep</h1>
        <p className="interview-prep-subtitle">
          Select an experience or project to generate personalized interview questions based on your resume bullets.
        </p>
      </div>

      <div className="selection-sections">
        {/* Experiences Section */}
        {experiences.length > 0 && (
          <div className="selection-section">
            <h2 className="section-title">
              <Icon name="briefcase" size={20} />
              Work Experiences
            </h2>
            <div className="item-grid">
              {experiences.map((exp) => (
                <div
                  key={exp.id}
                  className="selection-item-card"
                  onClick={() => handleSelect(exp, 'experience')}
                >
                  <div className="item-card-header">
                    <h3>{exp.role || 'Position'}</h3>
                    <p className="item-card-company">{exp.company || 'Company'}</p>
                    {exp.startDate && exp.endDate && (
                      <p className="item-card-meta">
                        {exp.startDate} - {exp.endDate}
                      </p>
                    )}
                  </div>
                  {Array.isArray(exp.bullets) && exp.bullets.length > 0 && (
                    <div className="item-card-bullets">
                      <span className="bullet-count">
                        {exp.bullets.length} bullet{exp.bullets.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                  <div className="item-card-action">
                    <span>Select</span>
                    <Icon name="chevronRight" size={16} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Projects Section */}
        {projects.length > 0 && (
          <div className="selection-section">
            <h2 className="section-title">
              <Icon name="folder" size={20} />
              Projects
            </h2>
            <div className="item-grid">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="selection-item-card"
                  onClick={() => handleSelect(project, 'project')}
                >
                  <div className="item-card-header">
                    <h3>{project.name || 'Project Name'}</h3>
                    {project.description && (
                      <p className="item-card-description">{project.description}</p>
                    )}
                    {project.technologies && (
                      <p className="item-card-meta">{project.technologies}</p>
                    )}
                  </div>
                  {Array.isArray(project.bullets) && project.bullets.length > 0 && (
                    <div className="item-card-bullets">
                      <span className="bullet-count">
                        {project.bullets.length} bullet{project.bullets.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                  <div className="item-card-action">
                    <span>Select</span>
                    <Icon name="chevronRight" size={16} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {experiences.length === 0 && projects.length === 0 && (
          <div className="empty-state">
            <Icon name="file" size={48} />
            <h3>No experiences or projects found</h3>
            <p>Add experiences or projects to your resume to generate interview questions.</p>
            {onBack && (
              <button className="btn btn-secondary" onClick={onBack}>
                Back to AI Coach
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default InterviewQuestionPrep;

