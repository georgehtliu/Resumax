import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import './SharedResumeView.css';

function SharedResumeView({ shareToken }) {
  const [resume, setResume] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (shareToken) {
      loadSharedResume();
      loadComments();
      subscribeToComments();
    }

    return () => {
      // Cleanup subscription on unmount
    };
  }, [shareToken]);

  const subscribeToComments = () => {
    // Get share link ID first
    supabase
      .from('shared_resume_links')
      .select('id')
      .eq('share_token', shareToken)
      .single()
      .then(({ data: link, error }) => {
        if (error || !link) return;

        // Subscribe to new comments
        const subscription = supabase
          .channel(`comments:${link.id}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'resume_comments',
              filter: `shared_link_id=eq.${link.id}`
            },
            () => {
              loadComments(); // Reload on new comment
            }
          )
          .subscribe();

        return () => {
          subscription.unsubscribe();
        };
      });
  };

  const loadSharedResume = async () => {
    try {
      // First, get the share link
      const { data: linkData, error: linkError } = await supabase
        .from('shared_resume_links')
        .select('*')
        .eq('share_token', shareToken)
        .eq('is_active', true)
        .single();

      if (linkError) throw linkError;
      if (!linkData) {
        setError('Share link not found or expired');
        setLoading(false);
        return;
      }

      // Check expiration
      if (linkData.expires_at && new Date(linkData.expires_at) < new Date()) {
        setError('This share link has expired');
        setLoading(false);
        return;
      }

      // Increment access count
      await supabase
        .from('shared_resume_links')
        .update({
          access_count: (linkData.access_count || 0) + 1,
          last_accessed_at: new Date().toISOString()
        })
        .eq('id', linkData.id);

      // Get the resume data
      const { data: resumeData, error: resumeError } = await supabase
        .from('saved_resumes')
        .select('*')
        .eq('id', linkData.resume_id)
        .single();

      if (resumeError) throw resumeError;

      setResume({
        ...resumeData,
        shareLink: linkData
      });
    } catch (err) {
      setError(err.message || 'Failed to load shared resume');
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      // Get share link ID
      const { data: link } = await supabase
        .from('shared_resume_links')
        .select('id')
        .eq('share_token', shareToken)
        .single();

      if (!link) return;

      // Get top-level comments
      const { data: topLevelComments, error: commentsError } = await supabase
        .from('resume_comments')
        .select('*')
        .eq('shared_link_id', link.id)
        .is('parent_id', null)
        .order('created_at', { ascending: false });

      if (commentsError) throw commentsError;

      // Get replies for each comment
      const commentsWithReplies = await Promise.all(
        (topLevelComments || []).map(async (comment) => {
          const { data: replies } = await supabase
            .from('resume_comments')
            .select('*')
            .eq('parent_id', comment.id)
            .order('created_at', { ascending: true });

          return {
            ...comment,
            replies: replies || []
          };
        })
      );

      setComments(commentsWithReplies);
    } catch (err) {
      console.error('Failed to load comments:', err);
    }
  };

  const submitComment = async (e) => {
    e.preventDefault();
    
    if (!commentText.trim()) return;
    if (isAnonymous && !authorName.trim()) {
      setError('Please enter your name');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Get share link ID
      const { data: link } = await supabase
        .from('shared_resume_links')
        .select('id')
        .eq('share_token', shareToken)
        .single();

      if (!link) {
        throw new Error('Share link not found');
      }

      const { error: insertError } = await supabase
        .from('resume_comments')
        .insert({
          shared_link_id: link.id,
          user_id: session?.user?.id || null,
          author_name: isAnonymous ? authorName : null,
          content: commentText,
          is_anonymous: isAnonymous || !session
        });

      if (insertError) throw insertError;

      setCommentText('');
      setAuthorName('');
      loadComments();
    } catch (err) {
      setError(err.message || 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const renderResumeSection = (title, entries, getEntryContent) => {
    if (!entries || entries.length === 0) return null;

    return (
      <div className="resume-section">
        <h3>{title}</h3>
        {entries.map((entry, idx) => (
          <div key={entry.id || idx} className="resume-entry">
            {getEntryContent(entry)}
          </div>
        ))}
      </div>
    );
  };

  const renderResume = () => {
    if (!resume || !resume.resume_data) return null;

    const data = resume.resume_data;

    return (
      <>
        {/* Personal Info Header - Always at top */}
        {data.personalInfo && (
          <div className="resume-header-section">
            <h1 className="resume-name">
              {data.personalInfo.firstName} {data.personalInfo.lastName}
            </h1>
            <div className="resume-contact-info">
              {data.personalInfo.email && (
                <span className="contact-item">{data.personalInfo.email}</span>
              )}
              {data.personalInfo.phone && (
                <span className="contact-item">{data.personalInfo.phone}</span>
              )}
              {data.personalInfo.linkedin && (
                <span className="contact-item">
                  <a href={data.personalInfo.linkedin} target="_blank" rel="noopener noreferrer">
                    LinkedIn
                  </a>
                </span>
              )}
              {data.personalInfo.github && (
                <span className="contact-item">
                  <a href={data.personalInfo.github} target="_blank" rel="noopener noreferrer">
                    GitHub
                  </a>
                </span>
              )}
            </div>
          </div>
        )}

        <div className="resume-content">

        {renderResumeSection(
          'Experience',
          data.experiences,
          (entry) => {
            // Get bullets from selectedBullets or bullets (fallback)
            const bullets = entry.selectedBullets || entry.bullets || [];
            return (
              <div className="resume-entry">
                <div className="entry-header-row">
                  <div className="entry-title">
                    <strong className="entry-role">{entry.role}</strong>
                    {entry.company && <span className="entry-company">, {entry.company}</span>}
                  </div>
                  {(entry.startDate || entry.endDate) && (
                    <span className="entry-dates">
                      {entry.startDate || ''} {entry.startDate && entry.endDate ? '–' : ''} {entry.endDate || 'Present'}
                    </span>
                  )}
                </div>
                {bullets.length > 0 && (
                  <ul className="entry-bullets">
                    {bullets.map((bullet, idx) => (
                      <li key={bullet.id || idx}>
                        {typeof bullet === 'string' ? bullet : (bullet.text || bullet.rewritten || '')}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          }
        )}

        {renderResumeSection(
          'Education',
          data.education,
          (entry) => {
            // Get bullets from selectedBullets or bullets (fallback)
            const bullets = entry.selectedBullets || entry.bullets || [];
            return (
              <div className="resume-entry">
                <div className="entry-header-row">
                  <div className="entry-title">
                    <strong className="entry-school">{entry.school}</strong>
                    {entry.degree && <span className="entry-degree">, {entry.degree}</span>}
                    {entry.field && <span className="entry-field"> in {entry.field}</span>}
                  </div>
                  {(entry.startDate || entry.endDate) && (
                    <span className="entry-dates">
                      {entry.startDate || ''} {entry.startDate && entry.endDate ? '–' : ''} {entry.endDate || 'Present'}
                    </span>
                  )}
                </div>
                {bullets.length > 0 && (
                  <ul className="entry-bullets">
                    {bullets.map((bullet, idx) => (
                      <li key={bullet.id || idx}>
                        {typeof bullet === 'string' ? bullet : (bullet.text || bullet.rewritten || '')}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          }
        )}

        {renderResumeSection(
          'Projects',
          data.projects,
          (entry) => {
            // Get bullets from selectedBullets or bullets (fallback)
            const bullets = entry.selectedBullets || entry.bullets || [];
            return (
              <div className="resume-entry">
                <div className="entry-header-row">
                  <div className="entry-title">
                    <strong className="entry-project-name">{entry.name}</strong>
                  </div>
                  {(entry.startDate || entry.endDate) && (
                    <span className="entry-dates">
                      {entry.startDate || ''} {entry.startDate && entry.endDate ? '–' : ''} {entry.endDate || 'Present'}
                    </span>
                  )}
                </div>
                {entry.description && <p className="entry-description">{entry.description}</p>}
                {bullets.length > 0 && (
                  <ul className="entry-bullets">
                    {bullets.map((bullet, idx) => (
                      <li key={bullet.id || idx}>
                        {typeof bullet === 'string' ? bullet : (bullet.text || bullet.rewritten || '')}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          }
        )}

        {data.skills && data.skills.length > 0 && (
          <div className="resume-section">
            <h3 className="section-title">Skills</h3>
            <div className="skills-list">
              {data.skills.map((group, idx) => (
                <div key={group.id || idx} className="skill-group">
                  {group.title && <strong className="skill-category">{group.title}: </strong>}
                  <span className="skill-items">{group.skills?.join(', ') || ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        </div>
      </>
    );
  };

  if (loading) {
    return <div className="shared-resume-view loading">Loading...</div>;
  }

  if (error && !resume) {
    return <div className="shared-resume-view error">{error}</div>;
  }

  if (!resume) {
    return <div className="shared-resume-view error">Resume not found</div>;
  }

  return (
    <div className="shared-resume-view">
      <div className="resume-meta-header">
        <p className="resume-meta">
          Resume: {resume.name} • Shared on {new Date(resume.shareLink.created_at).toLocaleDateString()}
        </p>
      </div>

      <div className="resume-preview">
        {renderResume()}
      </div>

      {resume.shareLink.allow_comments && (
        <div className="comments-section">
          <h2>Comments ({comments.length})</h2>
          
          <form onSubmit={submitComment} className="comment-form">
            {error && <div className="comment-error">{error}</div>}
            
            <div className="comment-form-header">
              <label>
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
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
                className="comment-author-input"
                required
              />
            )}

            <textarea
              placeholder="Add a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="comment-textarea"
              required
              rows={4}
            />
            
            <button 
              type="submit" 
              className="btn-submit-comment"
              disabled={submitting}
            >
              {submitting ? 'Posting...' : 'Post Comment'}
            </button>
          </form>

          <div className="comments-list">
            {comments.length === 0 ? (
              <p className="no-comments">No comments yet. Be the first to comment!</p>
            ) : (
              comments.map(comment => (
                <CommentItem key={comment.id} comment={comment} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CommentItem({ comment }) {
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

export default SharedResumeView;

