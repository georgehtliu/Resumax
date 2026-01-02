import React from 'react';
import { Icon } from './ui/Icons';
import './Community.css';

/**
 * Community Component
 * Modern design matching the About and Resume Tips pages
 */
function Community() {
  return (
    <div className="community-page-modern">
      {/* Hero Section */}
      <div className="community-hero">
        <div className="community-hero-content">
          <h1 className="community-hero-title">
            Community
          </h1>
          <p className="community-hero-subtitle">
            Connect with other software engineers and share resume insights
          </p>
        </div>
      </div>

      {/* Coming Soon Section */}
      <div className="community-content-modern">
        <div className="community-placeholder-modern">
          <div className="placeholder-icon-modern">
            <Icon name="users" size={64} />
          </div>
          <h2 className="placeholder-title-modern">Coming Soon</h2>
          <p className="placeholder-description-modern">
            Community features will be available here soon.
          </p>
          <p className="placeholder-subtext-modern">
            Share resume tips, get feedback from peers, and learn from the community's 
            collective experience in landing software engineering roles.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Community;
