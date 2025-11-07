import React, { useMemo, useEffect } from 'react';
import './LatexPreviewModal.css';

function LatexPreviewModal({ open, onClose, latexSource, onCopy, onDownloadTex, pdfBase64, onRefreshPdf, loadingPdf }) {
  const pdfUrl = useMemo(() => {
    if (!pdfBase64) {
      return null;
    }
    try {
      const binary = atob(pdfBase64);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'application/pdf' });
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('Failed to convert PDF base64 to blob:', error);
      return null;
    }
  }, [pdfBase64]);

  useEffect(() => () => {
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
    }
  }, [pdfUrl]);

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
        <div className="latex-preview-description">
          <p>Review the generated LaTeX source and rendered PDF before exporting.</p>
          <div className="latex-preview-actions">
            <div className="button-row">
              <button className="btn btn-secondary" onClick={onCopy}>
                Copy LaTeX
              </button>
              <button className="btn btn-secondary" onClick={onDownloadTex}>
                Download .tex
              </button>
            </div>
            <button className="btn btn-primary" onClick={onRefreshPdf} disabled={loadingPdf}>
              {loadingPdf ? 'Rendering…' : 'Render PDF'}
            </button>
          </div>
        </div>
        <div className="latex-preview-content">
          <div className="latex-column">
            <textarea
              className="latex-preview-textarea"
              value={latexSource}
              readOnly
              spellCheck={false}
            />
          </div>
          <div className="pdf-column">
            {loadingPdf && <div className="pdf-loading">Rendering PDF…</div>}
            {!loadingPdf && pdfUrl && (
              <iframe
                className="pdf-frame"
                src={pdfUrl}
                title="PDF Preview"
              />
            )}
            {!loadingPdf && !pdfUrl && (
              <div className="pdf-empty">Click “Render PDF” to generate a preview.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LatexPreviewModal;
