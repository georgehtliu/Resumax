import React from 'react';
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
  const personalInfo = { ...DEFAULT_INFO, ...(value || {}) };

  function handleFieldChange(field, newValue) {
    if (!onChange) return;
    onChange({
      ...personalInfo,
      [field]: newValue
    });
  }

  return (
    <div className={`personal-info-editor personal-info-editor--${variant}`}>
      <div className="personal-info-row">
        <div className="personal-info-field">
          <label>First Name</label>
          <input
            type="text"
            value={personalInfo.firstName}
            onChange={(e) => handleFieldChange('firstName', e.target.value)}
            placeholder="e.g., Jane"
          />
        </div>
        <div className="personal-info-field">
          <label>Last Name</label>
          <input
            type="text"
            value={personalInfo.lastName}
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
            value={personalInfo.phone}
            onChange={(e) => handleFieldChange('phone', e.target.value)}
            placeholder="e.g., (555) 555-1234"
          />
        </div>
        <div className="personal-info-field">
          <label>Email</label>
          <input
            type="text"
            value={personalInfo.email}
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
            value={personalInfo.linkedin}
            onChange={(e) => handleFieldChange('linkedin', e.target.value)}
            placeholder="linkedin.com/in/janedoe"
          />
        </div>
        <div className="personal-info-field">
          <label>GitHub</label>
          <input
            type="text"
            value={personalInfo.github}
            onChange={(e) => handleFieldChange('github', e.target.value)}
            placeholder="github.com/janedoe"
          />
        </div>
      </div>
    </div>
  );
}

export default PersonalInfoEditor;


