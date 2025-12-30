import React, { useState, useEffect } from 'react';
import { Icon } from '../ui/Icons';
import './PersonalInfoEditor.css';

const DEFAULT_INFO = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  linkedin: '',
  github: ''
};

function PersonalInfoEditor({ value, onChange, variant = 'default' }) {
  const initialInfo = { ...DEFAULT_INFO, ...(value || {}) };
  const [localInfo, setLocalInfo] = useState(initialInfo);
  const [hasChanges, setHasChanges] = useState(false);

  // Update local state when value prop changes (e.g., from external updates)
  useEffect(() => {
    const newInfo = { ...DEFAULT_INFO, ...(value || {}) };
    setLocalInfo(newInfo);
    setHasChanges(false);
  }, [value]);

  function handleFieldChange(field, newValue) {
    const updated = {
      ...localInfo,
      [field]: newValue
    };
    setLocalInfo(updated);
    
    // Check if there are changes compared to initial value
    const initialInfo = { ...DEFAULT_INFO, ...(value || {}) };
    const hasChanges = JSON.stringify(updated) !== JSON.stringify(initialInfo);
    setHasChanges(hasChanges);
  }

  function handleSave() {
    if (!onChange) return;
    onChange(localInfo);
    setHasChanges(false);
  }

  return (
    <div className={`personal-info-editor personal-info-editor--${variant}`}>
      <div className="personal-info-row">
        <div className="personal-info-field">
          <label>First Name</label>
          <input
            type="text"
            value={localInfo.firstName}
            onChange={(e) => handleFieldChange('firstName', e.target.value)}
            placeholder="e.g., Jane"
          />
        </div>
        <div className="personal-info-field">
          <label>Last Name</label>
          <input
            type="text"
            value={localInfo.lastName}
            onChange={(e) => handleFieldChange('lastName', e.target.value)}
            placeholder="e.g., Doe"
          />
        </div>
      </div>

      <div className="personal-info-row">
        <div className="personal-info-field">
          <label>Phone</label>
          <input
            type="text"
            value={localInfo.phone}
            onChange={(e) => handleFieldChange('phone', e.target.value)}
            placeholder="e.g., (555) 555-1234"
          />
        </div>
        <div className="personal-info-field">
          <label>Email</label>
          <input
            type="text"
            value={localInfo.email}
            onChange={(e) => handleFieldChange('email', e.target.value)}
            placeholder="e.g., jane.doe@email.com"
          />
        </div>
      </div>

      <div className="personal-info-row">
        <div className="personal-info-field">
          <label>LinkedIn</label>
          <input
            type="text"
            value={localInfo.linkedin}
            onChange={(e) => handleFieldChange('linkedin', e.target.value)}
            placeholder="linkedin.com/in/janedoe"
          />
        </div>
        <div className="personal-info-field">
          <label>GitHub</label>
          <input
            type="text"
            value={localInfo.github}
            onChange={(e) => handleFieldChange('github', e.target.value)}
            placeholder="github.com/janedoe"
          />
        </div>
      </div>

      {hasChanges && (
        <div className="personal-info-save-section">
          <button
            className="btn btn-primary"
            onClick={handleSave}
          >
            <Icon name="save" size={18} />
            Save Personal Info
          </button>
        </div>
      )}
    </div>
  );
}

export default PersonalInfoEditor;


