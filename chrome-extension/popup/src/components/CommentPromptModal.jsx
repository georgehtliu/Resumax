import React, { useState } from 'react';
import './CommentPromptModal.css';

function CommentPromptModal({ open, bulletText, onSave, onCancel }) {
  const [comment, setComment] = useState('');

  if (!open) {
    return null;
  }

  const handleSave = () => {
    if (comment.trim()) {
      onSave(comment.trim());
      setComment('');
    }
  };

  const handleCancel = () => {
    setComment('');
    onCancel();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <div className="comment-prompt-overlay">
      <div className="comment-prompt-modal">
        <div className="comment-prompt-header">
          <h3>Add Comment</h3>
          <button className="btn-icon" onClick={handleCancel} title="Cancel">
            ×
          </button>
        </div>
        <div className="comment-prompt-content">
          <div className="comment-prompt-bullet">
            <label>Selected bullet point:</label>
            <p className="bullet-text-preview">{bulletText}</p>
          </div>
          <div className="comment-prompt-input">
            <label htmlFor="comment-input">Your comment:</label>
            <textarea
              id="comment-input"
              className="comment-textarea"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter your comment about this bullet point..."
              rows={4}
              autoFocus
            />
          </div>
        </div>
        <div className="comment-prompt-actions">
          <button className="btn btn-secondary" onClick={handleCancel}>
            Cancel
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleSave}
            disabled={!comment.trim()}
          >
            Save Comment
          </button>
        </div>
      </div>
    </div>
  );
}

export default CommentPromptModal;

