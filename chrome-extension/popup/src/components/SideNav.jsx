import React, { useState, useEffect } from 'react';
import './SideNav.css';

/**
 * Side Navigation Component
 * Modern side nav similar to Hello Interview
 */
function SideNav({ activeView, onViewChange, userEmail, onSignOut }) {
  const [expandedItems, setExpandedItems] = useState({});

  // Auto-expand coaching if on a coaching sub-item
  useEffect(() => {
    if (activeView === 'coaching-ai' || activeView === 'coaching-human') {
      setExpandedItems(prev => ({ ...prev, coaching: true }));
    }
  }, [activeView]);

  const navItems = [
    { id: 'about', label: 'About', icon: 'ℹ️' },
    { id: 'tips', label: 'Resume Tips', icon: '💡' },
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'generate', label: 'Generate Resume', icon: '✨' },
    { id: 'saved', label: 'Saved Resumes', icon: '📄' },
    { id: 'community', label: 'Community', icon: '👥' },
    { 
      id: 'coaching', 
      label: 'Resume Coaching', 
      icon: '🎓',
      subItems: [
        { id: 'coaching-ai', label: 'AI Coach', icon: '🤖' },
        { id: 'coaching-human', label: 'Critique with Human', icon: '👥' },
      ]
    },
  ];

  const toggleExpanded = (itemId) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const isItemActive = (item) => {
    if (item.subItems) {
      return item.subItems.some(subItem => activeView === subItem.id) || activeView === item.id;
    }
    return activeView === item.id;
  };

  const isSubItemActive = (subItemId) => {
    return activeView === subItemId;
  };

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
          <div key={item.id} className="nav-item-wrapper">
            <button
              className={`side-nav-item ${isItemActive(item) ? 'active' : ''} ${item.subItems ? 'has-submenu' : ''}`}
              onClick={() => {
                if (item.subItems) {
                  const isExpanded = expandedItems[item.id];
                  toggleExpanded(item.id);
                  // If clicking parent, go to first sub-item if not already on a sub-item
                  if (!item.subItems.some(subItem => activeView === subItem.id)) {
                    onViewChange(item.subItems[0].id);
                  }
                  // If collapsing, go to parent view
                  if (isExpanded && item.subItems.some(subItem => activeView === subItem.id)) {
                    onViewChange(item.id);
                  }
                } else {
                  onViewChange(item.id);
                }
              }}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
              {item.subItems && (
                <span className={`nav-chevron ${expandedItems[item.id] ? 'expanded' : ''}`}>
                  ▼
                </span>
              )}
            </button>
            
            {item.subItems && expandedItems[item.id] && (
              <div className="nav-submenu">
                {item.subItems.map((subItem) => (
                  <button
                    key={subItem.id}
                    className={`side-nav-subitem ${isSubItemActive(subItem.id) ? 'active' : ''}`}
                    onClick={() => onViewChange(subItem.id)}
                  >
                    <span className="nav-icon">{subItem.icon}</span>
                    <span className="nav-label">{subItem.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
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

