import React from 'react';
import PdfViewerWithOverlays from '../pdf/PdfViewerWithOverlays';
import './LatexPreviewModal.css';

function LatexPreviewModal({ open, onClose, latexSource, onCopy, onDownloadTex, pdfBase64, onRefreshPdf, loadingPdf }) {

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
            {!loadingPdf && pdfBase64 && (
              <PdfViewerWithOverlays
                pdfBase64={pdfBase64}
                comments={[]}
                onTextSelect={(anchor) => {
                  console.log('Text selected:', anchor);
                }}
                scale={1.0}
              />
            )}
            {!loadingPdf && !pdfBase64 && (
              <div className="pdf-empty">Click "Render PDF" to generate a preview.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LatexPreviewModal;
