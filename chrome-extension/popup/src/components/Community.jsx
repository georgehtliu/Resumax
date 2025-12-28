import React from 'react';
import { Icon } from './ui/Icons';
import './Community.css';

/**
 * Community Component
 * Barebones placeholder for community features
 */
function Community() {
  return (
    <div className="community-page">
      <div className="community-header">
        <h1>Community</h1>
        <p className="community-subtitle">Connect with other software engineers and share resume insights</p>
      </div>

      <div className="community-content">
        <div className="community-placeholder">
          <div className="placeholder-icon">
            <Icon name="users" size={48} />
          </div>
          <h2>Coming Soon</h2>
          <p>Community features will be available here soon.</p>
          <p className="placeholder-subtext">
            Share resume tips, get feedback from peers, and learn from the community's 
            collective experience in landing software engineering roles.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Community;

