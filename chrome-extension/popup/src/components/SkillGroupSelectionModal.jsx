import React, { useState } from 'react';
import { Icon } from './ui/Icons';
import './SkillGroupSelectionModal.css';

function SkillGroupSelectionModal({ keyword, skillGroups, onSelect, onCreateNew, onClose }) {
  const [showNewGroupInput, setShowNewGroupInput] = useState(false);
  const [newGroupTitle, setNewGroupTitle] = useState('');

  const handleCreateNew = () => {
    if (newGroupTitle.trim()) {
      onCreateNew(newGroupTitle.trim());
      setNewGroupTitle('');
      setShowNewGroupInput(false);
    }
  };

  return (
    <div className="skill-group-modal-overlay" onClick={onClose}>
      <div className="skill-group-modal" onClick={(e) => e.stopPropagation()}>
        <div className="skill-group-modal-header">
          <h3>Add "{keyword}" to Skills</h3>
          <button className="skill-group-modal-close" onClick={onClose}>
            <Icon name="x" size={20} />
          </button>
        </div>

        <div className="skill-group-modal-content">
          <p className="skill-group-modal-description">
            Select a skill group to add this keyword to, or create a new group.
          </p>

          {skillGroups.length > 0 ? (
            <>
              <div className="skill-group-modal-section">
                <h4>Select Existing Group</h4>
                <div className="skill-group-list">
                  {skillGroups.map((group) => (
                    <div
                      key={group.id}
                      className="skill-group-item"
                      onClick={() => onSelect(group.id)}
                    >
                      <div className="skill-group-item-content">
                        <div className="skill-group-item-title">
                          {group.title || 'Untitled Group'}
                        </div>
                        <div className="skill-group-item-skills">
                          {group.skills?.length || 0} skill{(group.skills?.length || 0) !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <Icon name="chevronRight" size={16} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="skill-group-modal-divider">
                <span>OR</span>
              </div>
            </>
          ) : (
            <div className="skill-group-modal-section">
              <p className="skill-group-modal-description">
                No skill groups found. Create a new one below.
              </p>
            </div>
          )}

          <div className="skill-group-modal-section">
            {!showNewGroupInput ? (
              <button
                className="btn btn-primary btn-large"
                onClick={() => setShowNewGroupInput(true)}
              >
                <Icon name="plus" size={16} />
                Create New Skill Group
              </button>
            ) : (
              <div className="new-group-input">
                <input
                  type="text"
                  className="new-group-title-input"
                  placeholder="Enter group name (e.g., Languages, Frameworks)"
                  value={newGroupTitle}
                  onChange={(e) => setNewGroupTitle(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && newGroupTitle.trim()) {
                      handleCreateNew();
                    }
                  }}
                  autoFocus
                />
                <div className="new-group-actions">
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowNewGroupInput(false);
                      setNewGroupTitle('');
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleCreateNew}
                    disabled={!newGroupTitle.trim()}
                  >
                    Create
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SkillGroupSelectionModal;

