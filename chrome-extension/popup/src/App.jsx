import React, { useState, useEffect } from 'react';
import ExperienceEditor from './components/ExperienceEditor';
import JobMatcher from './components/JobMatcher';
import OptimizationPanel from './components/OptimizationPanel';
import { storageService } from './services/storage';
import './App.css';

/**
 * Main App Component
 * 
 * State Management:
 * - Resume data (experiences, bullets)
 * - Current job description
 * - Optimization results
 */
function App() {
  const [resume, setResume] = useState({
    experiences: [],
    totalBullets: 0
  });
  const [currentJob, setCurrentJob] = useState(null);
  const [optimizationResult, setOptimizationResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // Load resume data on mount
  useEffect(() => {
    loadResumeData();
  }, []);

  /**
   * Load resume from Chrome storage
   */
  async function loadResumeData() {
    try {
      const data = await storageService.getResume();
      setResume(data);
    } catch (error) {
      console.error('Error loading resume:', error);
    }
  }

  /**
   * Save resume to Chrome storage
   */
  async function saveResumeData(updatedResume) {
    try {
      await storageService.saveResume(updatedResume);
      setResume(updatedResume);
    } catch (error) {
      console.error('Error saving resume:', error);
    }
  }

  /**
   * Extract job description from current tab
   */
  async function handleExtractJobDescription() {
    setLoading(true);
    try {
      const result = await chrome.runtime.sendMessage({
        type: 'EXTRACT_JOB_DESCRIPTION'
      });

      if (result.success) {
        setCurrentJob({
          description: result.jobDescription,
          source: result.source || 'manual'
        });
      } else {
        alert('Could not extract job description: ' + result.error);
      }
    } catch (error) {
      console.error('Error extracting job description:', error);
      alert('Error extracting job description');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Handle optimization request
   * For now, this is a mock - backend connection comes later
   */
  async function handleOptimize(jobDescription) {
    setLoading(true);
    try {
      // TODO: Connect to backend API later
      // For now, return mock data
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
      
      const mockResult = {
        selectedBullets: resume.experiences
          .flatMap(exp => exp.bullets)
          .slice(0, 12)
          .map(bullet => ({
            ...bullet,
            relevanceScore: Math.random() * 0.3 + 0.7,
            rewritten: bullet.text // Mock - would be optimized by LLM
          })),
        gaps: ['Cloud deployment', 'Machine learning'],
        mode: 'strict'
      };

      setOptimizationResult(mockResult);
    } catch (error) {
      console.error('Error optimizing:', error);
      alert('Error optimizing resume');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>AI Resume Optimizer</h1>
        <p className="subtitle">Match your resume to any job description</p>
      </header>

      <main className="app-main">
        {/* Resume Builder Section */}
        <section className="section">
          <h2>Your Resume</h2>
          <p className="section-subtitle">
            Total Bullets: {resume.totalBullets}
          </p>
          
          {resume.experiences.length === 0 ? (
            <div className="empty-state">
              <p>No experiences yet. Add your first work experience!</p>
            </div>
          ) : (
            resume.experiences.map(experience => (
              <ExperienceEditor
                key={experience.id}
                experience={experience}
                onUpdate={(updatedExp) => {
                  const updated = resume.experiences.map(exp =>
                    exp.id === updatedExp.id ? updatedExp : exp
                  );
                  saveResumeData({
                    ...resume,
                    experiences: updated,
                    totalBullets: updated.reduce((sum, exp) => sum + exp.bullets.length, 0)
                  });
                }}
                onDelete={(expId) => {
                  const updated = resume.experiences.filter(exp => exp.id !== expId);
                  saveResumeData({
                    ...resume,
                    experiences: updated,
                    totalBullets: updated.reduce((sum, exp) => sum + exp.bullets.length, 0)
                  });
                }}
              />
            ))
          )}
          
          <button
            className="btn btn-primary"
            onClick={() => {
              const newExp = {
                id: `exp-${Date.now()}`,
                company: '',
                role: '',
                startDate: '',
                endDate: '',
                bullets: []
              };
              saveResumeData({
                ...resume,
                experiences: [...resume.experiences, newExp]
              });
            }}
          >
            + Add Experience
          </button>
        </section>

        {/* Job Matching Section */}
        <section className="section">
          <h2>Match to Job Description</h2>
          
          <JobMatcher
            jobDescription={currentJob?.description || ''}
            onExtract={handleExtractJobDescription}
            onOptimize={handleOptimize}
            loading={loading}
          />
        </section>

        {/* Optimization Results */}
        {optimizationResult && (
          <section className="section">
            <h2>Optimization Results</h2>
            
            <OptimizationPanel
              result={optimizationResult}
              onClose={() => setOptimizationResult(null)}
            />
          </section>
        )}
      </main>
    </div>
  );
}

export default App;


