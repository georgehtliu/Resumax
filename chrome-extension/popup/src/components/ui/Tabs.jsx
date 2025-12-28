import React from 'react';
import './Tabs.css';

/**
 * Tabs Component
 * 
 * Simple tab navigation system
 */
function Tabs({ activeTab, onTabChange, tabs }) {
  return (
    <div className="tabs-container">
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`tab ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export default Tabs;

