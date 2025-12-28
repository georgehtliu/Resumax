import React from 'react';
import PdfViewerWithOverlays from '../pdf/PdfViewerWithOverlays';
import './LatexPreviewModal.css';

function LatexPreviewModal({ open, onClose, latexSource, onCopy, onDownloadTex, pdfBase64, onRefreshPdf, loadingPdf, resumeData }) {

  if (!open) {
    return null;
  }

  // Extract candidate name and personal info
  const personalInfo = resumeData?.personalInfo || resumeData?.personal_info || {};
  const firstName = (personalInfo.firstName || personalInfo.first_name || '').trim();
  const lastName = (personalInfo.lastName || personalInfo.last_name || '').trim();
  const fullName = firstName || lastName 
    ? `${firstName} ${lastName}`.trim() 
    : (personalInfo.name || 'Candidate').trim();
  
  const email = personalInfo.email || '';
  const phone = personalInfo.phone || '';
  const linkedin = personalInfo.linkedin || '';
  const github = personalInfo.github || '';

  // Build contact info array
  const contactInfo = [];
  if (email) contactInfo.push({ type: 'email', value: email, label: email });
  if (phone) contactInfo.push({ type: 'phone', value: phone, label: phone });
  if (linkedin) {
    const linkedinLabel = linkedin.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/^linkedin\.com\/in\//, 'linkedin.com/in/');
    contactInfo.push({ type: 'linkedin', value: linkedin, label: linkedinLabel });
  }
  if (github) {
    const githubLabel = github.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/^github\.com\//, 'github.com/');
    contactInfo.push({ type: 'github', value: github, label: githubLabel });
  }

  return (
    <div className="latex-preview-overlay">
      <div className="latex-preview-modal">
        <div className="latex-preview-header">
          <div className="latex-preview-header-content">
            <h3>LaTeX Preview</h3>
            <div className="latex-preview-candidate-info">
              <div className="candidate-name">{fullName}</div>
              {contactInfo.length > 0 && (
                <div className="candidate-contact">
                  {contactInfo.map((contact, idx) => (
                    <span key={idx} className="contact-item">
                      {contact.type === 'email' && '📧 '}
                      {contact.type === 'phone' && '📞 '}
                      {contact.type === 'linkedin' && '💼 '}
                      {contact.type === 'github' && '💻 '}
                      {contact.type === 'linkedin' || contact.type === 'github' ? (
                        <a href={contact.value} target="_blank" rel="noopener noreferrer" className="contact-link">
                          {contact.label}
                        </a>
                      ) : (
                        <span>{contact.label}</span>
                      )}
                      {idx < contactInfo.length - 1 && <span className="contact-separator"> • </span>}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
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
