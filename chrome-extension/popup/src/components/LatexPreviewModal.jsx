import React from 'react';
import './LatexPreviewModal.css';

function LatexPreviewModal({ open, onClose, latexSource, onCopy, onDownload }) {
  if (!open) {
    return null;
  }

  return (
    <div className="latex-preview-overlay">
      <div className="latex-preview-modal">
        <div className="latex-preview-header">
          <h3>LaTeX Preview</h3>
          <button className="btn-icon" onClick={onClose} title="Close preview">
            ×
          </button>
        </div>
        <p className="latex-preview-description">
          Review the generated LaTeX source before exporting. Copy or download the file to compile locally.
        </p>
        <div className="latex-preview-actions">
          <button className="btn btn-secondary" onClick={onCopy}>
            Copy to Clipboard
          </button>
          <button className="btn btn-primary" onClick={onDownload}>
            Download .tex
          </button>
        </div>
        <div className="latex-preview-body">
          <textarea
            className="latex-preview-textarea"
            value={latexSource}
            readOnly
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
}

export default LatexPreviewModal;
