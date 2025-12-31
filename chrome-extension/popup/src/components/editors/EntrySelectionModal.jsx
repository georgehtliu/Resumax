import React from 'react';
import { Icon } from '../ui/Icons';
import './EntrySelectionModal.css';

function EntrySelectionModal({ sectionKey, availableEntries, onSelectEntry, onCreateNew, onClose }) {
  const sectionTitle = {
    'experiences': 'Work Experience',
    'education': 'Education',
    'projects': 'Projects',
    'customSections': 'Custom Sections'
  }[sectionKey] || 'Section';

  const getEntryDisplayText = (entry) => {
    if (sectionKey === 'experiences') {
      return `${entry.company || 'Company'} - ${entry.role || 'Role'}`;
    } else if (sectionKey === 'education') {
      return `${entry.school || 'School'} - ${entry.degree || 'Degree'} in ${entry.field || 'Field'}`;
    } else if (sectionKey === 'projects') {
      return entry.name || 'Project Name';
    } else if (sectionKey === 'customSections') {
      return entry.title || 'Section Title';
    }
    return 'Entry';
  };

  const getEntryDetails = (entry) => {
    if (sectionKey === 'experiences') {
      const dates = [entry.startDate, entry.endDate].filter(Boolean).join(' - ');
      return dates || 'No dates';
    } else if (sectionKey === 'education') {
      const dates = [entry.startDate, entry.endDate].filter(Boolean).join(' - ');
      return dates || 'No dates';
    } else if (sectionKey === 'projects') {
      return entry.technologies || entry.description || 'No details';
    } else if (sectionKey === 'customSections') {
      return entry.subtitle || 'No subtitle';
    }
    return '';
  };

  const getBulletCount = (entry) => {
    return (entry.bullets || []).length;
  };

  return (
    <div className="entry-modal-overlay" onClick={onClose}>
      <div className="entry-modal" onClick={(e) => e.stopPropagation()}>
        <div className="entry-modal-header">
          <h3>Add {sectionTitle} Entry</h3>
          <button className="entry-modal-close" onClick={onClose}>
            <Icon name="x" size={20} />
          </button>
        </div>

        <div className="entry-modal-content">
          {availableEntries.length > 0 ? (
            <>
              <div className="entry-modal-section">
                <h4>Select from Profile</h4>
                <p className="entry-modal-description">
                  Choose an existing entry from your master resume
                </p>
                <div className="entry-list">
                  {availableEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="entry-item"
                      onClick={() => onSelectEntry(entry)}
                    >
                      <div className="entry-item-content">
                        <div className="entry-item-title">{getEntryDisplayText(entry)}</div>
                        <div className="entry-item-details">{getEntryDetails(entry)}</div>
                        {getBulletCount(entry) > 0 && (
                          <div className="entry-item-bullets">
                            {getBulletCount(entry)} bullet{getBulletCount(entry) !== 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                      <Icon name="chevronRight" size={16} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="entry-modal-divider">
                <span>OR</span>
              </div>
            </>
          ) : (
            <div className="entry-modal-section">
              <p className="entry-modal-description">
                No existing entries found in your profile for this section.
              </p>
            </div>
          )}

          <div className="entry-modal-section">
            <button className="btn btn-primary btn-large" onClick={onCreateNew}>
              <Icon name="plus" size={16} />
              Create New Entry
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EntrySelectionModal;

