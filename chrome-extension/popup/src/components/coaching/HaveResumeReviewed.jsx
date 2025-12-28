import React, { useState, useEffect } from 'react';
import { ArrowLeft, MessageSquare, CheckCircle, FileText, Calendar } from 'lucide-react';
import { supabase } from '../../config/supabase';
import LoadingScreen from './LoadingScreen';
import './HaveResumeReviewed.css';

function HaveResumeReviewed({ onBack }) {
  const [savedResumes, setSavedResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedResumeId, setSelectedResumeId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadSavedResumes();
  }, []);

  async function loadSavedResumes() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setSavedResumes([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('saved_resumes')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformedResumes = (data || []).map(resume => ({
        id: resume.id,
        name: resume.name,
        createdAt: resume.created_at ? new Date(resume.created_at).getTime() : Date.now()
      }));

      setSavedResumes(transformedResumes);
    } catch (error) {
      console.error('Error loading saved resumes:', error);
      setSavedResumes([]);
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = () => {
    if (!selectedResumeId) return;
    setIsSubmitting(true);
  };

  if (isSubmitting) {
    return (
      <div className="have-resume-reviewed-page">
        <div className="have-resume-reviewed-header">
          <button className="back-button" onClick={() => setIsSubmitting(false)}>
            <ArrowLeft size={18} />
            <span>Back</span>
          </button>
        </div>
        <LoadingScreen 
          title="Submitting your resume for review"
          message="We're connecting you with experienced professionals. This may take a moment..."
        />
      </div>
    );
  }

  return (
    <div className="have-resume-reviewed-page">
      <div className="have-resume-reviewed-header">
        <button className="back-button" onClick={onBack}>
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>
        <h1>Have My Resume Reviewed</h1>
        <p className="page-subtitle">Get personalized feedback from experienced professionals</p>
      </div>

      <div className="have-resume-reviewed-content">
        <div className="have-resume-reviewed-card">
          <div className="card-icon">
            <MessageSquare size={32} />
          </div>
          <h2>Get Professional Feedback</h2>
          <p className="card-description">
            Submit your resume for review by experienced recruiters, hiring managers, and career coaches. 
            Receive detailed, actionable feedback to improve your resume.
          </p>

          <div className="feature-list">
            <div className="feature-item">
              <CheckCircle size={18} className="feature-icon" />
              <span>Submit your resume for review</span>
            </div>
            <div className="feature-item">
              <CheckCircle size={18} className="feature-icon" />
              <span>Get feedback from verified professionals</span>
            </div>
            <div className="feature-item">
              <CheckCircle size={18} className="feature-icon" />
              <span>Receive detailed improvement suggestions</span>
            </div>
            <div className="feature-item">
              <CheckCircle size={18} className="feature-icon" />
              <span>Track your review history</span>
            </div>
          </div>

          <div className="resume-selection-section">
            <h3 className="selection-title">Select a Resume</h3>
            {loading ? (
              <div className="loading-resumes">Loading resumes...</div>
            ) : savedResumes.length === 0 ? (
              <div className="no-resumes">
                <FileText size={24} />
                <p>No saved resumes found. Please create a resume first.</p>
              </div>
            ) : (
              <div className="resume-list">
                {savedResumes.map((resume) => (
                  <div
                    key={resume.id}
                    className={`resume-option ${selectedResumeId === resume.id ? 'selected' : ''}`}
                    onClick={() => setSelectedResumeId(resume.id)}
                  >
                    <div className="resume-option-icon">
                      <FileText size={20} />
                    </div>
                    <div className="resume-option-content">
                      <div className="resume-option-name">{resume.name}</div>
                      <div className="resume-option-date">
                        <Calendar size={14} />
                        <span>{new Date(resume.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    {selectedResumeId === resume.id && (
                      <div className="resume-option-check">
                        <CheckCircle size={20} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <button 
              className="submit-button"
              onClick={handleSubmit}
              disabled={!selectedResumeId || loading}
            >
              <MessageSquare size={18} />
              <span>Submit for Review</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HaveResumeReviewed;

