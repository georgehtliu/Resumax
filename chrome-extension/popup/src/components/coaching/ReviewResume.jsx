import React, { useState } from 'react';
import { ArrowLeft, FileText, CheckCircle, Users } from 'lucide-react';
import { Icon } from '../ui/Icons';
import ReviewerView from './ReviewerView';
import QueueMatching from './QueueMatching';
import './ReviewResume.css';

function ReviewResume({ onBack }) {
  const [showQueue, setShowQueue] = useState(false);
  const [showReviewer, setShowReviewer] = useState(false);
  const [matchData, setMatchData] = useState(null);

  const handleMatch = (matchInfo) => {
    console.log('Match received:', matchInfo);
    setMatchData(matchInfo);
    setShowQueue(false);
    setShowReviewer(true);
  };

  if (showReviewer && matchData) {
    return (
      <ReviewerView 
        onBack={() => {
          setShowReviewer(false);
          setMatchData(null);
        }}
        roomId={matchData.roomId}
        partnerId={matchData.partnerId}
        resumeId={matchData.resumeId}
      />
    );
  }

  if (showQueue) {
    return (
      <div className="review-resume-page">
        <div className="review-resume-header">
          <button className="back-button" onClick={() => setShowQueue(false)}>
            <ArrowLeft size={18} />
            <span>Back</span>
          </button>
        </div>
        <QueueMatching
          role="reviewer"
          onMatch={handleMatch}
          onCancel={() => setShowQueue(false)}
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
            onClick={() => setShowQueue(true)}
          >
            <Users size={18} />
            <span>Connect me with a review seeker</span>
          </button>
        </div>
      </div>
    </div>
  );

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

