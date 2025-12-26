import React from 'react';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import './AutoSaveIndicator.css';

function AutoSaveIndicator({ status = 'idle' }) {
  if (status === 'idle') return null;

  return (
    <div className={`auto-save-indicator auto-save-${status}`}>
      {status === 'saving' && (
        <>
          <Loader2 className="auto-save-icon" size={14} />
          <span>Saving...</span>
        </>
      )}
      {status === 'saved' && (
        <>
          <CheckCircle2 className="auto-save-icon" size={14} />
          <span>Saved</span>
        </>
      )}
      {status === 'error' && (
        <>
          <AlertCircle className="auto-save-icon" size={14} />
          <span>Save failed</span>
        </>
      )}
    </div>
  );
}

export default AutoSaveIndicator;

