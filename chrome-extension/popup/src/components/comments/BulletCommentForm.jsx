import React from 'react';

export default function BulletCommentForm({ 
  bulletId, 
  bulletText, 
  sectionType, 
  entryId, 
  comments,
  onSubmit,
  onCancel,
  commentText,
  setCommentText,
  authorName,
  setAuthorName,
  isAnonymous,
  setIsAnonymous,
  submitting,
  error
}) {
  return (
    <div className="bullet-comment-form">
      {comments.length > 0 && (
        <div 
          className="bullet-comments-inline"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="bullet-comments-header">
            <strong>Comments on this bullet ({comments.length}):</strong>
          </div>
          {comments.map(comment => (
            <div 
              key={comment.id} 
              className="bullet-comment"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bullet-comment-header">
                <strong className="bullet-comment-author">
                  {comment.author_name || (comment.user_id ? 'User' : 'Anonymous')}
                </strong>
                <span className="bullet-comment-date">
                  {new Date(comment.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="bullet-comment-content">{comment.content}</p>
              {comment.replies && comment.replies.length > 0 && (
                <div className="bullet-comment-replies">
                  {comment.replies.map(reply => (
                    <div key={reply.id} className="bullet-comment-reply">
                      <strong>{reply.author_name || 'Anonymous'}</strong>: {reply.content}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      <form 
        onSubmit={onSubmit} 
        className="bullet-comment-form-input"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {error && <div className="comment-error">{error}</div>}
        
        <div className="comment-form-header">
          <label onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              onClick={(e) => e.stopPropagation()}
            />
            Post as anonymous
          </label>
        </div>

        {isAnonymous && (
          <input
            type="text"
            placeholder="Your name"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onFocus={(e) => e.stopPropagation()}
            className="comment-author-input"
            required
          />
        )}

        <textarea
          placeholder="Add a comment on this bullet..."
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onFocus={(e) => e.stopPropagation()}
          className="comment-textarea"
          required
          rows={3}
        />
        
        <div className="bullet-comment-form-actions">
          <button 
            type="submit" 
            className="btn-submit-comment"
            disabled={submitting}
            onClick={(e) => e.stopPropagation()}
          >
            {submitting ? 'Posting...' : 'Post Comment'}
          </button>
          <button 
            type="button"
            className="btn-cancel-comment"
            onClick={(e) => {
              e.stopPropagation();
              onCancel();
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

