import React, { useState } from 'react';
import { getLineCountInfo } from '../utils/latexLineCount';
import './ExperienceEditor.css';

/**
 * Experience Editor Component
 * 
 * Allows users to:
 * - Edit experience details (company, role, dates)
 * - Add unlimited bullet points
 * - Edit/delete bullet points
 * - Reorder bullets (drag & drop - TODO)
 */
function ExperienceEditor({ experience, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(!experience.company);
  const [formData, setFormData] = useState({
    company: experience.company || '',
    role: experience.role || '',
    startDate: experience.startDate || '',
    endDate: experience.endDate || '',
    bullets: experience.bullets || []
  });

  function handleFieldChange(field, value) {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }

  function handleSave() {
    onUpdate({
      ...experience,
      ...formData
    });
    setIsEditing(false);
  }

  function handleAddBullet() {
    const newBullet = {
      id: `bullet-${Date.now()}`,
      text: ''
    };
    setFormData(prev => ({
      ...prev,
      bullets: [...prev.bullets, newBullet]
    }));
  }

  function handleUpdateBullet(bulletId, text) {
    setFormData(prev => ({
      ...prev,
      bullets: prev.bullets.map(b =>
        b.id === bulletId ? { ...b, text } : b
      )
    }));
  }

  function handleDeleteBullet(bulletId) {
    setFormData(prev => ({
      ...prev,
      bullets: prev.bullets.filter(b => b.id !== bulletId)
    }));
  }

  return (
    <div className="experience-editor">
      {isEditing ? (
        <div className="experience-form">
          <div className="form-group">
            <label>Company</label>
            <input
              type="text"
              value={formData.company}
              onChange={(e) => handleFieldChange('company', e.target.value)}
              placeholder="e.g., Google"
            />
          </div>

          <div className="form-group">
            <label>Role</label>
            <input
              type="text"
              value={formData.role}
              onChange={(e) => handleFieldChange('role', e.target.value)}
              placeholder="e.g., Software Engineer"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Start Date</label>
              <input
                type="text"
                value={formData.startDate}
                onChange={(e) => handleFieldChange('startDate', e.target.value)}
                placeholder="e.g., 2020"
              />
            </div>

            <div className="form-group">
              <label>End Date</label>
              <input
                type="text"
                value={formData.endDate}
                onChange={(e) => handleFieldChange('endDate', e.target.value)}
                placeholder="e.g., 2023 or Present"
              />
            </div>
          </div>

          <div className="bullets-section">
            <div className="bullets-header">
              <label>Bullet Points ({formData.bullets.length})</label>
              <button
                className="btn btn-small"
                onClick={handleAddBullet}
              >
                + Add Bullet
              </button>
            </div>

            <div className="bullets-list">
              {formData.bullets.map((bullet, index) => {
                const lineInfo = getLineCountInfo(bullet.text);
                return (
                  <div key={bullet.id} className="bullet-item">
                    <span className="bullet-number">{index + 1}.</span>
                    <div className="bullet-text-wrapper">
                      <textarea
                        className={`bullet-text ${lineInfo.warning ? 'bullet-warning' : ''}`}
                        value={bullet.text}
                        onChange={(e) => handleUpdateBullet(bullet.id, e.target.value)}
                        placeholder="Enter bullet point..."
                        rows={2}
                      />
                      <span className={`latex-line-indicator ${lineInfo.category}`} title={`Estimated LaTeX lines: ${lineInfo.count}`}>
                        {lineInfo.count === 0 ? '' : lineInfo.count === 1 ? '1 line' : lineInfo.count === 2 ? '2 lines' : `${lineInfo.count} lines ⚠️`}
                      </span>
                    </div>
                    <button
                      className="btn-icon"
                      onClick={() => handleDeleteBullet(bullet.id)}
                      title="Delete bullet"
                    >
                      ×
                    </button>
                  </div>
                );
              })}

              {formData.bullets.length === 0 && (
                <div className="empty-bullets">
                  <p>No bullet points yet. Click "+ Add Bullet" to add one!</p>
                </div>
              )}
            </div>
          </div>

          <div className="form-actions">
            <button className="btn btn-primary" onClick={handleSave}>
              Save
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => {
                if (confirm('Delete this experience?')) {
                  onDelete(experience.id);
                }
              }}
            >
              Delete
            </button>
          </div>
        </div>
      ) : (
        <div className="experience-view">
          <div className="experience-header">
            <div>
              <h3>{formData.company || 'Untitled Company'}</h3>
              <p className="experience-role">{formData.role || 'Untitled Role'}</p>
              <p className="experience-dates">
                {formData.startDate && formData.endDate
                  ? `${formData.startDate} - ${formData.endDate}`
                  : formData.startDate || 'No dates'}
              </p>
            </div>
            <button
              className="btn btn-small"
              onClick={() => setIsEditing(true)}
            >
              Edit
            </button>
          </div>

          <div className="bullets-preview">
            <p className="bullets-count">
              {formData.bullets.length} bullet{formData.bullets.length !== 1 ? 's' : ''}
            </p>
            {formData.bullets.length > 0 && (
              <ul>
                {formData.bullets.slice(0, 3).map((bullet, index) => (
                  <li key={bullet.id}>{bullet.text || '(empty)'}</li>
                ))}
                {formData.bullets.length > 3 && (
                  <li className="more-bullets">
                    +{formData.bullets.length - 3} more...
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ExperienceEditor;


