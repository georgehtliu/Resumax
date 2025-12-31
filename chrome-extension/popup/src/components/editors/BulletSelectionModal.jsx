import React from 'react';
import { Icon } from '../ui/Icons';
import './BulletSelectionModal.css';

function BulletSelectionModal({ sectionKey, availableBullets, onSelectBullet, onCreateNew, onClose }) {
  const sectionTitle = {
    'experiences': 'Work Experience',
    'education': 'Education',
    'projects': 'Projects',
    'customSections': 'Custom Sections'
  }[sectionKey] || 'Section';

  return (
    <div className="bullet-modal-overlay" onClick={onClose}>
      <div className="bullet-modal" onClick={(e) => e.stopPropagation()}>
        <div className="bullet-modal-header">
          <h3>Add Bullet - {sectionTitle}</h3>
          <button className="bullet-modal-close" onClick={onClose}>
            <Icon name="x" size={20} />
          </button>
        </div>

        <div className="bullet-modal-content">
          {availableBullets.length > 0 ? (
            <>
              <div className="bullet-modal-section">
                <h4>Select from Profile</h4>
                <p className="bullet-modal-description">
                  Choose an existing bullet from your master resume
                </p>
                <div className="bullet-list">
                  {availableBullets.map((bullet) => (
                    <div
                      key={bullet.id}
                      className="bullet-item"
                      onClick={() => onSelectBullet(bullet)}
                    >
                      <div className="bullet-item-content">
                        <div className="bullet-item-text">{bullet.text}</div>
                        {bullet.parentEntry && (
                          <div className="bullet-item-meta">
                            {bullet.parentEntry.company && (
                              <span className="bullet-item-source">
                                {bullet.parentEntry.company}
                                {bullet.parentEntry.role && ` - ${bullet.parentEntry.role}`}
                              </span>
                            )}
                            {bullet.parentEntry.school && (
                              <span className="bullet-item-source">
                                {bullet.parentEntry.school}
                                {bullet.parentEntry.degree && ` - ${bullet.parentEntry.degree}`}
                              </span>
                            )}
                            {bullet.parentEntry.name && (
                              <span className="bullet-item-source">{bullet.parentEntry.name}</span>
                            )}
                            {bullet.parentEntry.title && (
                              <span className="bullet-item-source">{bullet.parentEntry.title}</span>
                            )}
                          </div>
                        )}
                      </div>
                      <Icon name="chevronRight" size={16} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="bullet-modal-divider">
                <span>OR</span>
              </div>
            </>
          ) : (
            <div className="bullet-modal-section">
              <p className="bullet-modal-description">
                No existing bullets found in your profile for this section.
              </p>
            </div>
          )}

          <div className="bullet-modal-section">
            <button className="btn btn-primary btn-large" onClick={onCreateNew}>
              <Icon name="plus" size={16} />
              Create New Bullet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BulletSelectionModal;

