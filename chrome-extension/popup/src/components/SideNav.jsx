import React from 'react';
import './SideNav.css';

/**
 * Side Navigation Component
 * Modern side nav similar to Hello Interview
 */
function SideNav({ activeView, onViewChange, userEmail, onSignOut }) {
  const navItems = [
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'generate', label: 'Generate Resume', icon: '✨' },
    { id: 'saved', label: 'Saved Resumes', icon: '📄' },
    { id: 'coaching', label: 'Resume Coaching', icon: '🎓' },
  ];

  return (
    <nav className="side-nav">
      <div className="side-nav-header">
        <div className="side-nav-logo">
          <span className="logo-icon">🚀</span>
          <span className="logo-text">Resumax</span>
        </div>
      </div>
      
      <div className="side-nav-menu">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`side-nav-item ${activeView === item.id ? 'active' : ''}`}
            onClick={() => onViewChange(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </div>

      <div className="side-nav-footer">
        <div className="user-info">
          <div className="user-email">{userEmail || 'User'}</div>
        </div>
        <button className="sign-out-btn" onClick={onSignOut}>
          Sign Out
        </button>
      </div>
    </nav>
  );
}

export default SideNav;

