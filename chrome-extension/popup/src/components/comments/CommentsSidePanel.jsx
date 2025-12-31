import React, { useState, useEffect } from 'react';

export default function CommentsSidePanel({
  selectedBulletId,
  bulletComments,
  bulletsWithComments,
  onBulletClick,
  onCommentSubmit,
  commentText,
  setCommentText,
  isAnonymous,
  setIsAnonymous,
  submitting,
  error,
  onCancel,
  findBulletText,
  findBulletContext,
  bulletAnchors,
  pdfViewerRef,
  hoveredCommentId,
  setHoveredCommentId,
  scrollToBulletInHtml,
  collapsed = false,
  onToggleCollapse
}) {
  const [activeBulletId, setActiveBulletId] = useState(selectedBulletId);

  useEffect(() => {
    setActiveBulletId(selectedBulletId);
  }, [selectedBulletId]);

  const handleBulletClick = (bulletId) => {
    setActiveBulletId(bulletId);
    onBulletClick(bulletId);
    // Scroll to bullet in HTML resume if function is provided
    if (scrollToBulletInHtml) {
      scrollToBulletInHtml(bulletId);
    }
  };

  return (
    <div className={`comments-side-panel ${collapsed ? 'collapsed' : ''}`}>
      <div className="side-panel-header">
        <div className="side-panel-header-content">
          <h3>Comments</h3>
          {!collapsed && <span className="comment-count">{bulletsWithComments.length} bullet{bulletsWithComments.length !== 1 ? 's' : ''} with comments</span>}
        </div>
        <button 
          className="sidebar-toggle-btn"
          onClick={onToggleCollapse}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? '▶' : '◀'}
        </button>
      </div>

      {!collapsed && (
      <div className="side-panel-content">
        {selectedBulletId && !bulletsWithComments.find(b => b.bulletId === selectedBulletId) && (
          <div className="side-panel-new-comment">
            <div className="new-comment-header">
              <div className="comment-marker-side">
                <span className="comment-marker-dot-side"></span>
              </div>
              <div className="new-comment-bullet-text">
                {findBulletText(selectedBulletId).substring(0, 80)}
                {findBulletText(selectedBulletId).length > 80 ? '...' : ''}
              </div>
            </div>
            <button
              className="view-bullet-link"
              onClick={(e) => {
                e.stopPropagation();
                handleBulletClick(selectedBulletId);
              }}
              title="View this bullet in the resume"
            >
              🔗 View bullet
            </button>
            <form 
              onSubmit={(e) => {
                const context = findBulletContext(selectedBulletId);
                const bulletText = findBulletText(selectedBulletId);
                onCommentSubmit(e, selectedBulletId, bulletText, context.sectionType, context.entryId);
              }}
              className="side-panel-comment-form"
              onClick={(e) => e.stopPropagation()}
            >
              {error && <div className="comment-error">{error}</div>}
              
              <div className="comment-form-header">
                <label className="comment-checkbox-label">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="comment-checkbox"
                  />
                  <span>Post as anonymous</span>
                </label>
              </div>

              <textarea
                placeholder="Add a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="comment-textarea"
                required
                rows={3}
              />
              
              <div className="bullet-comment-form-actions">
                <button 
                  type="submit" 
                  className="btn-submit-comment"
                  disabled={submitting || !commentText.trim()}
                >
                  {submitting ? 'Posting...' : 'Post'}
                </button>
                <button 
                  type="button"
                  className="btn-cancel-comment"
                  onClick={onCancel}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
        
        {bulletsWithComments.length === 0 && !selectedBulletId ? (
          <div className="no-bullet-comments">
            <p>No comments on bullets yet.</p>
            <p className="hint">Click on a bullet in the resume to add a comment.</p>
          </div>
        ) : (
          bulletsWithComments.map(({ bulletId, bulletText, sectionType, entryId, comments }) => (
            <div 
              key={bulletId} 
              className={`side-panel-comment-group ${activeBulletId === bulletId ? 'active' : ''}`}
            >
              <div 
                className="comment-group-header"
                onClick={() => handleBulletClick(bulletId)}
              >
                <div className="comment-marker-side">
                  <span className="comment-marker-dot-side"></span>
                </div>
                <div className="comment-group-bullet-text">
                  {bulletText.substring(0, 80)}{bulletText.length > 80 ? '...' : ''}
                </div>
              </div>

              <div className="comment-group-comments">
                {comments.map(comment => (
                  <div 
                    key={comment.id} 
                    className="side-panel-comment"
                  >
                    <div className="side-comment-header">
                      <strong className="side-comment-author">
                        {comment.author_name || 'Anonymous'}
                      </strong>
                      <span className="side-comment-date">
                        {new Date(comment.created_at).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <p className="side-comment-content">{comment.content}</p>
                    <button
                      className="view-bullet-link"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBulletClick(bulletId);
                      }}
                      onMouseEnter={() => {
                        if (setHoveredCommentId) {
                          setHoveredCommentId(comment.id);
                        }
                      }}
                      onMouseLeave={() => {
                        if (setHoveredCommentId) {
                          setHoveredCommentId(null);
                        }
                      }}
                      title="View this bullet in the resume"
                    >
                      🔗 View bullet
                    </button>
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="side-comment-replies">
                        {comment.replies.map(reply => (
                          <div key={reply.id} className="side-comment-reply">
                            <strong>{reply.author_name || 'Anonymous'}</strong>: {reply.content}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {activeBulletId === bulletId && (
                <form 
                  onSubmit={(e) => {
                    onCommentSubmit(e, bulletId, bulletText, sectionType, entryId);
                  }}
                  className="side-panel-comment-form"
                  onClick={(e) => e.stopPropagation()}
                >
                  {error && <div className="comment-error">{error}</div>}
                  
                  <div className="comment-form-header">
                    <label className="comment-checkbox-label">
                      <input
                        type="checkbox"
                        checked={isAnonymous}
                        onChange={(e) => setIsAnonymous(e.target.checked)}
                        className="comment-checkbox"
                      />
                      <span>Post as anonymous</span>
                    </label>
                  </div>

                  <textarea
                    placeholder="Add a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="comment-textarea"
                    required
                    rows={3}
                  />
                  
                  <div className="bullet-comment-form-actions">
                    <button 
                      type="submit" 
                      className="btn-submit-comment"
                      disabled={submitting || !commentText.trim()}
                    >
                      {submitting ? 'Posting...' : 'Post'}
                    </button>
                    <button 
                      type="button"
                      className="btn-cancel-comment"
                      onClick={onCancel}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          ))
        )}
      </div>
      )}
    </div>
  );
}

