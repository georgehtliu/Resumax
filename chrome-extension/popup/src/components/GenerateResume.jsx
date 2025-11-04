import React, { useState } from 'react';
import JobMatcher from './JobMatcher';
import OptimizationPanel from './OptimizationPanel';
import { storageService } from '../services/storage';
import './GenerateResume.css';

/**
 * Generate New Resume Component
 * 
 * Tab 2: Generate optimized resume from job description
 */
function GenerateResume({ masterResume, onSave }) {
  const [currentJob, setCurrentJob] = useState(null);
  const [optimizationResult, setOptimizationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resumeName, setResumeName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [customizedBullets, setCustomizedBullets] = useState(null);

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
   * Handle optimization request (mock data for now)
   */
  async function handleOptimize(jobDescription) {
    setLoading(true);
    try {
      // Mock optimization - will connect to backend later
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Collect bullets from all sections
      const allBullets = [
        ...(Array.isArray(masterResume.experiences) ? masterResume.experiences.flatMap(exp => Array.isArray(exp?.bullets) ? exp.bullets : []) : []),
        ...(Array.isArray(masterResume.education) ? masterResume.education.flatMap(edu => Array.isArray(edu?.bullets) ? edu.bullets : []) : []),
        ...(Array.isArray(masterResume.projects) ? masterResume.projects.flatMap(proj => Array.isArray(proj?.bullets) ? proj.bullets : []) : []),
        ...(Array.isArray(masterResume.customSections) ? masterResume.customSections.flatMap(section => Array.isArray(section?.bullets) ? section.bullets : []) : [])
      ];

      const mockResult = {
        selectedBullets: allBullets
          .slice(0, 12)
          .map(bullet => ({
            ...bullet,
            relevanceScore: Math.random() * 0.3 + 0.7,
            rewritten: bullet.text // Mock - would be optimized by LLM
          })),
        gaps: ['Cloud deployment', 'Machine learning'],
        mode: 'strict',
        jobDescription: jobDescription
      };

      setOptimizationResult(mockResult);
    } catch (error) {
      console.error('Error optimizing:', error);
      alert('Error optimizing resume');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Handle bullet customization updates
   */
  function handleBulletsUpdate(updatedBullets) {
    setCustomizedBullets(updatedBullets);
  }

  /**
   * Handle save with name
   */
  async function handleSave() {
    if (!optimizationResult) {
      alert('Please generate a resume first');
      return;
    }

    if (!resumeName.trim()) {
      alert('Please enter a name for this resume');
      return;
    }

    setSaving(true);
    try {
      // Use customized bullets if available, otherwise use original
      const bulletsToSave = customizedBullets || optimizationResult.selectedBullets;
      
      const savedResume = {
        selectedBullets: bulletsToSave,
        gaps: optimizationResult.gaps,
        mode: optimizationResult.mode,
        jobDescription: optimizationResult.jobDescription
      };

      await storageService.saveGeneratedResume(resumeName.trim(), savedResume);
      
      // Reset state
      setShowSaveDialog(false);
      setResumeName('');
      setOptimizationResult(null);
      setCurrentJob(null);
      
      // Notify parent to refresh saved resumes
      if (onSave) {
        onSave();
      }

      alert('Resume saved successfully!');
    } catch (error) {
      console.error('Error saving resume:', error);
      alert('Error saving resume');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="generate-resume">
      <div className="section">
        <h2>Match to Job Description</h2>
        <p className="section-description">
          Extract or paste a job description, then select the best resume points.
        </p>
        
        <JobMatcher
          jobDescription={currentJob?.description || ''}
          onExtract={handleExtractJobDescription}
          onOptimize={handleOptimize}
          loading={loading}
        />
      </div>

      {/* Optimization Results */}
      {optimizationResult && (
        <div className="section">
          <div className="section-header-with-action">
            <h2>Optimized Resume</h2>
            <button
              className="btn btn-primary"
              onClick={() => setShowSaveDialog(true)}
              disabled={saving}
            >
              💾 Save Resume
            </button>
          </div>
          
          <OptimizationPanel
            result={optimizationResult}
            onClose={() => {
              setOptimizationResult(null);
              setCustomizedBullets(null);
            }}
            onBulletsUpdate={handleBulletsUpdate}
          />
        </div>
      )}

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="save-dialog-overlay">
          <div className="save-dialog">
            <h3>Save Resume</h3>
            <p className="dialog-description">
              Enter a name for this resume (e.g., "Google SWE", "Meta Frontend")
            </p>
            <input
              type="text"
              className="resume-name-input"
              value={resumeName}
              onChange={(e) => setResumeName(e.target.value)}
              placeholder="Resume name..."
              autoFocus
              onKeyPress={(e) => {
                if (e.key === 'Enter' && resumeName.trim()) {
                  handleSave();
                }
              }}
            />
            <div className="dialog-actions">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowSaveDialog(false);
                  setResumeName('');
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={!resumeName.trim() || saving}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GenerateResume;

