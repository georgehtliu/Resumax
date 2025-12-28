import React, { useState } from 'react';
import { ArrowLeft, FileText, CheckCircle, Users } from 'lucide-react';
import { Icon } from '../ui/Icons';
import LoadingScreen from './LoadingScreen';
import './ReviewResume.css';

function ReviewResume({ onBack }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleConnect = () => {
    setIsLoading(true);
  };

  if (isLoading) {
    return (
      <div className="review-resume-page">
        <div className="review-resume-header">
          <button className="back-button" onClick={() => setIsLoading(false)}>
            <ArrowLeft size={18} />
            <span>Back</span>
          </button>
        </div>
        <LoadingScreen 
          title="Connecting you with a review seeker"
          message="We're finding the perfect resume for you to review. This may take a moment..."
        />
      </div>
    );
  }

  return (
    <div className="review-resume-page">
      <div className="review-resume-header">
        <button className="back-button" onClick={onBack}>
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>
        <h1>Review Resume</h1>
        <p className="page-subtitle">Provide feedback on resumes submitted by other users</p>
      </div>

      <div className="review-resume-content">
        <div className="review-resume-card">
          <div className="card-icon">
            <FileText size={32} />
          </div>
          <h2>Review Resumes</h2>
          <p className="card-description">
            Browse and review resumes from the community. Help others improve their resumes 
            while building your reputation as a reviewer.
          </p>

          <div className="feature-list">
            <div className="feature-item">
              <CheckCircle size={18} className="feature-icon" />
              <span>Browse submitted resumes</span>
            </div>
            <div className="feature-item">
              <CheckCircle size={18} className="feature-icon" />
              <span>Provide detailed feedback</span>
            </div>
            <div className="feature-item">
              <CheckCircle size={18} className="feature-icon" />
              <span>Build your reviewer profile</span>
            </div>
            <div className="feature-item">
              <CheckCircle size={18} className="feature-icon" />
              <span>Earn recognition badges</span>
            </div>
          </div>

          <button 
            className="connect-button"
            onClick={handleConnect}
          >
            <Users size={18} />
            <span>Connect me with a review seeker</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReviewResume;

