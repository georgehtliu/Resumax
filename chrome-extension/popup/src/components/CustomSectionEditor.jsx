import React, { useState } from 'react';
import { getLineCountInfo } from '../utils/latexLineCount';
import './SectionEditor.css';

/**
 * Custom Section Editor Component
 * 
 * Allows users to:
 * - Create custom resume sections (e.g., Certifications, Skills, Awards)
 * - Edit section title and subtitle
 * - Add unlimited bullet points
 * - Edit/delete bullet points
 */
function CustomSectionEditor({ section, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(!section.title);
  const [formData, setFormData] = useState({
    title: section.title || '',
    subtitle: section.subtitle || '',
    bullets: section.bullets || []
  });

  function handleFieldChange(field, value) {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }

  function handleSave() {
    onUpdate({
      ...section,
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
            <label>Section Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              placeholder="e.g., Certifications, Skills, Awards"
            />
          </div>

          <div className="form-group">
            <label>Subtitle (Optional)</label>
            <input
              type="text"
              value={formData.subtitle}
              onChange={(e) => handleFieldChange('subtitle', e.target.value)}
              placeholder="e.g., Additional information or context"
            />
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
                if (confirm('Delete this section?')) {
                  onDelete(section.id);
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
              <h3>{formData.title || 'Untitled Section'}</h3>
              {formData.subtitle && (
                <p className="section-subtitle">{formData.subtitle}</p>
              )}
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

export default CustomSectionEditor;

