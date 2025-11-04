import React, { useState } from 'react';
import { getLineCountInfo } from '../utils/latexLineCount';
import './SectionEditor.css';

/**
 * Education Editor Component
 * 
 * Allows users to:
 * - Edit education details (school, degree, field, dates)
 * - Add unlimited bullet points
 * - Edit/delete bullet points
 */
function EducationEditor({ education, onUpdate, onDelete, onAddBulletFromMaster }) {
  const [isEditing, setIsEditing] = useState(!education.school);
  const [formData, setFormData] = useState({
    school: education.school || '',
    degree: education.degree || '',
    field: education.field || '',
    startDate: education.startDate || '',
    endDate: education.endDate || '',
    bullets: education.bullets || []
  });

  function handleFieldChange(field, value) {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }

  function handleSave() {
    onUpdate({
      ...education,
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
    <div className="section-editor">
      {isEditing ? (
        <div className="section-form">
          <div className="form-group">
            <label>School/University</label>
            <input
              type="text"
              value={formData.school}
              onChange={(e) => handleFieldChange('school', e.target.value)}
              placeholder="e.g., Stanford University"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Degree</label>
              <input
                type="text"
                value={formData.degree}
                onChange={(e) => handleFieldChange('degree', e.target.value)}
                placeholder="e.g., B.S., M.S."
              />
            </div>

            <div className="form-group">
              <label>Field of Study</label>
              <input
                type="text"
                value={formData.field}
                onChange={(e) => handleFieldChange('field', e.target.value)}
                placeholder="e.g., Computer Science"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Start Date</label>
              <input
                type="text"
                value={formData.startDate}
                onChange={(e) => handleFieldChange('startDate', e.target.value)}
                placeholder="e.g., 2018"
              />
            </div>

            <div className="form-group">
              <label>End Date</label>
              <input
                type="text"
                value={formData.endDate}
                onChange={(e) => handleFieldChange('endDate', e.target.value)}
                placeholder="e.g., 2022 or Present"
              />
            </div>
          </div>

          <div className="bullets-section">
            <div className="bullets-header">
              <label>Bullet Points ({formData.bullets.length})</label>
              <div className="bullets-header-actions">
                {onAddBulletFromMaster && (
                  <button
                    className="btn btn-small btn-secondary"
                    onClick={onAddBulletFromMaster}
                    title="Add bullet from master resume"
                  >
                    + From Master
                  </button>
                )}
                <button
                  className="btn btn-small"
                  onClick={handleAddBullet}
                >
                  + Add Bullet
                </button>
              </div>
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
                if (confirm('Delete this education entry?')) {
                  onDelete(education.id);
                }
              }}
            >
              Delete
            </button>
          </div>
        </div>
      ) : (
        <div className="section-view">
          <div className="section-header">
            <div>
              <h3>{formData.school || 'Untitled School'}</h3>
              <p className="section-subtitle">
                {formData.degree && formData.field
                  ? `${formData.degree} in ${formData.field}`
                  : formData.degree || formData.field || 'No degree/field'}
              </p>
              <p className="section-dates">
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

export default EducationEditor;

