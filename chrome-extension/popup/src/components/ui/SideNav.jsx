import React, { useState, useEffect } from 'react';
import { 
  Info, Lightbulb, User, Sparkles, FileText, Users, GraduationCap, 
  Bot, MessageSquare, Rocket, ChevronLeft, ChevronRight
} from 'lucide-react';
import './SideNav.css';

/**
 * Side Navigation Component
 * Modern side nav similar to Hello Interview
 */
function SideNav({ activeView, onViewChange, userEmail, onSignOut }) {
  const [expandedItems, setExpandedItems] = useState({});
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Auto-expand coaching if on a coaching sub-item
  useEffect(() => {
    if (activeView === 'coaching-ai' || activeView === 'coaching-human') {
      setExpandedItems(prev => ({ ...prev, coaching: true }));
    }
  }, [activeView]);

  const navItems = [
    { id: 'about', label: 'About', icon: Info },
    { id: 'tips', label: 'Resume Tips', icon: Lightbulb },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'generate', label: 'Generate Resume', icon: Sparkles },
    { id: 'saved', label: 'Saved Resumes', icon: FileText },
    { 
      id: 'coaching', 
      label: 'Resume Coaching', 
      icon: GraduationCap,
      subItems: [
        { id: 'coaching-ai', label: 'AI Coach', icon: Bot },
        { id: 'coaching-human', label: 'Critique with Human', icon: MessageSquare },
      ]
    },
    { id: 'community', label: 'Community', icon: Users },
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

  // Update CSS variable for sidebar width
  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', isCollapsed ? '72px' : '260px');
  }, [isCollapsed]);

  return (
    <nav className={`side-nav ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="side-nav-header">
        <div className="side-nav-logo">
          <Rocket className="logo-icon" size={24} />
          {!isCollapsed && <span className="logo-text">Resume Master</span>}
        </div>
        <button
          className="side-nav-toggle"
          onClick={(e) => {
            e.stopPropagation();
            setIsCollapsed(!isCollapsed);
          }}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight size={18} />
          ) : (
            <ChevronLeft size={18} />
          )}
        </button>
      </div>
      
      <div className="side-nav-menu">
        {navItems.map((item) => (
          <div key={item.id} className="nav-item-wrapper">
            <button
              className={`side-nav-item ${isItemActive(item) ? 'active' : ''} ${item.subItems ? 'has-submenu' : ''}`}
              onClick={() => {
                if (item.subItems) {
                  if (isCollapsed) {
                    // If collapsed, just change view to first sub-item
                    onViewChange(item.subItems[0].id);
                    return;
                  }
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
              title={isCollapsed ? item.label : undefined}
            >
              {React.createElement(item.icon, { className: 'nav-icon', size: 18 })}
              {!isCollapsed && <span className="nav-label">{item.label}</span>}
              {!isCollapsed && item.subItems && (
                <span className={`nav-chevron ${expandedItems[item.id] ? 'expanded' : ''}`}>
                  ▼
                </span>
              )}
            </button>
            
            {!isCollapsed && item.subItems && expandedItems[item.id] && (
              <div className="nav-submenu">
                {item.subItems.map((subItem) => (
                  <button
                    key={subItem.id}
                    className={`side-nav-subitem ${isSubItemActive(subItem.id) ? 'active' : ''}`}
                    onClick={() => onViewChange(subItem.id)}
                  >
                    {React.createElement(subItem.icon, { className: 'nav-icon', size: 16 })}
                    <span className="nav-label">{subItem.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {!isCollapsed && (
        <div className="side-nav-footer">
          <div className="user-info">
            <div className="user-email">{userEmail || 'User'}</div>
          </div>
          <button className="sign-out-btn" onClick={onSignOut}>
            Sign Out
          </button>
        </div>
      )}
      {isCollapsed && (
        <div className="side-nav-footer">
          <button 
            className="sign-out-btn-icon" 
            onClick={onSignOut}
            title="Sign Out"
          >
            <User size={18} />
          </button>
        </div>
      )}
    </nav>
  );
}

export default SideNav;

