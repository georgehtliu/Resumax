import React, { useState } from 'react';

export default function CommentItem({ comment }) {
  const [showReplies, setShowReplies] = useState(false);

  return (
    <div className="comment-item">
      <div className="comment-header">
        <span className="comment-author">
          {comment.author_name || (comment.user_id ? 'User' : 'Anonymous')}
        </span>
        <span className="comment-date">
          {new Date(comment.created_at).toLocaleString()}
        </span>
      </div>
      <div className="comment-content">{comment.content}</div>
      
      {comment.replies && comment.replies.length > 0 && (
        <>
          <button 
            className="btn-show-replies"
            onClick={() => setShowReplies(!showReplies)}
          >
            {showReplies ? 'Hide' : 'Show'} {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
          </button>
          
          {showReplies && (
            <div className="comment-replies">
              {comment.replies.map(reply => (
                <CommentItem key={reply.id} comment={reply} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

