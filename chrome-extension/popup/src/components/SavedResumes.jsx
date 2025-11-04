import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storage';
import OptimizationPanel from './OptimizationPanel';
import './SavedResumes.css';

/**
 * Saved Resumes Component
 * 
 * Tab 3: List of saved resumes with ability to view and delete
 */
function SavedResumes({ onLoadResume, refreshTrigger }) {
  const [savedResumes, setSavedResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedResume, setSelectedResume] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  useEffect(() => {
    loadSavedResumes();
  }, [refreshTrigger]);

  async function loadSavedResumes() {
    setLoading(true);
    try {
      const resumes = await storageService.getSavedResumes();
      setSavedResumes(resumes);
    } catch (error) {
      console.error('Error loading saved resumes:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(resumeId) {
    try {
      await storageService.deleteSavedResume(resumeId);
      await loadSavedResumes();
      if (selectedResume?.id === resumeId) {
        setSelectedResume(null);
      }
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting resume:', error);
      alert('Error deleting resume');
    }
  }

  function formatDate(timestamp) {
    if (!timestamp) return 'Unknown date';
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  if (loading) {
    return (
      <div className="saved-resumes">
        <div className="section">
          <p>Loading saved resumes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="saved-resumes">
      {savedResumes.length === 0 ? (
        <div className="section">
          <div className="empty-state">
            <p>No saved resumes yet.</p>
            <p className="empty-hint">Generate and save a resume to see it here.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="section">
            <h2>Saved Resumes ({savedResumes.length})</h2>
            <p className="section-description">
              Click on a resume to view it. Resumes are sorted by newest first.
            </p>

            <div className="resume-list">
              {savedResumes.map(resume => (
                <div
                  key={resume.id}
                  className={`resume-item ${selectedResume?.id === resume.id ? 'selected' : ''}`}
                  onClick={() => setSelectedResume(resume)}
                >
                  <div className="resume-item-content">
                    <h3 className="resume-name">{resume.name}</h3>
                    <p className="resume-meta">
                      {formatDate(resume.createdAt)} • {resume.data?.selectedBullets?.length || 0} bullets
                    </p>
                  </div>
                  <div className="resume-item-actions">
                    <button
                      className="btn-icon-small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteConfirm(resume.id);
                      }}
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedResume && (
            <div className="section">
              <div className="section-header-with-action">
                <h2>{selectedResume.name}</h2>
                <button
                  className="btn btn-secondary"
                  onClick={() => setSelectedResume(null)}
                >
                  Close
                </button>
              </div>
              
              <div className="resume-details">
                <div className="detail-row">
                  <span className="detail-label">Created:</span>
                  <span className="detail-value">{formatDate(selectedResume.createdAt)}</span>
                </div>
                {selectedResume.data?.jobDescription && (
                  <div className="detail-row">
                    <span className="detail-label">Job Description:</span>
                    <span className="detail-value">
                      {selectedResume.data.jobDescription.substring(0, 100)}...
                    </span>
                  </div>
                )}
              </div>

              <OptimizationPanel
                result={{
                  selectedBullets: selectedResume.data?.selectedBullets || [],
                  gaps: selectedResume.data?.gaps || [],
                  mode: selectedResume.data?.mode || 'strict'
                }}
                onClose={() => setSelectedResume(null)}
              />
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="save-dialog-overlay">
          <div className="save-dialog">
            <h3>Delete Resume?</h3>
            <p className="dialog-description">
              Are you sure you want to delete this resume? This action cannot be undone.
            </p>
            <div className="dialog-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowDeleteConfirm(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={() => handleDelete(showDeleteConfirm)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SavedResumes;

