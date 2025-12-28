import React from 'react';
import { Loader2 } from 'lucide-react';
import './LoadingScreen.css';

function LoadingScreen({ title, message }) {
  return (
    <div className="loading-screen">
      <div className="loading-content">
        <div className="loading-spinner-wrapper">
          <Loader2 className="loading-spinner" size={48} />
        </div>
        <h2 className="loading-title">{title || 'Processing...'}</h2>
        <p className="loading-message">{message || 'Please wait while we process your request.'}</p>
        <div className="loading-dots">
          <span className="dot"></span>
          <span className="dot"></span>
          <span className="dot"></span>
        </div>
      </div>
    </div>
  );
}

export default LoadingScreen;

