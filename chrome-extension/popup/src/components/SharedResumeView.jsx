import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '../config/supabase';
import { renderLatex } from '../services/api';
import PdfViewerWithOverlays from './PdfViewerWithOverlays';
import './SharedResumeView.css';

// Comments Side Panel Component (Google Docs style)
function CommentsSidePanel({
  selectedBulletId,
  bulletComments,
  bulletsWithComments,
  allBullets,
  onBulletClick,
  onCommentSubmit,
  commentText,
  setCommentText,
  authorName,
  setAuthorName,
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
  setHoveredCommentId
}) {
  const [activeBulletId, setActiveBulletId] = useState(selectedBulletId);
  const [showAllBullets, setShowAllBullets] = useState(false);
  const bulletItemRefs = useRef({});

  useEffect(() => {
    setActiveBulletId(selectedBulletId);
  }, [selectedBulletId]);

  const handleBulletClick = (bulletId) => {
    setActiveBulletId(bulletId);
    onBulletClick(bulletId);
    // Scroll to bullet in Browse All Bullets section
    scrollToBulletInList(bulletId);
  };

  const scrollToBulletInList = (bulletId) => {
    // Ensure Browse All Bullets section is open
    if (!showAllBullets) {
      setShowAllBullets(true);
      // Wait for DOM to update, then scroll
      setTimeout(() => {
        const bulletElement = bulletItemRefs.current[bulletId];
        if (bulletElement) {
          bulletElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Add highlight effect
          bulletElement.classList.add('highlighted');
          setTimeout(() => {
            bulletElement.classList.remove('highlighted');
          }, 2000);
        }
      }, 100);
    } else {
      const bulletElement = bulletItemRefs.current[bulletId];
      if (bulletElement) {
        bulletElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Add highlight effect
        bulletElement.classList.add('highlighted');
        setTimeout(() => {
          bulletElement.classList.remove('highlighted');
        }, 2000);
      }
    }
  };

  return (
    <div className="comments-side-panel">
      <div className="side-panel-header">
        <h3>Comments</h3>
        <span className="comment-count">{bulletsWithComments.length} bullet{bulletsWithComments.length !== 1 ? 's' : ''} with comments</span>
      </div>

      <div className="side-panel-content">
        {/* Browse All Bullets Section */}
        {allBullets && allBullets.length > 0 && (
          <div className="browse-bullets-section">
            <button
              className="browse-bullets-toggle"
              onClick={() => setShowAllBullets(!showAllBullets)}
            >
              {showAllBullets ? '▼' : '▶'} Browse All Bullets ({allBullets.length})
            </button>
            {showAllBullets && (
              <div className="all-bullets-list">
                {allBullets.map(({ bulletId, bulletText, entryTitle }) => {
                  const bulletWithComments = bulletsWithComments.find(b => b.bulletId === bulletId);
                  const hasComments = !!bulletWithComments;
                  return (
                    <div
                      key={bulletId}
                      ref={(el) => {
                        if (el) bulletItemRefs.current[bulletId] = el;
                      }}
                      className={`all-bullet-item ${activeBulletId === bulletId ? 'active' : ''} ${hasComments ? 'has-comments' : ''}`}
                      onClick={() => handleBulletClick(bulletId)}
                    >
                      <div className="bullet-item-header">
                        <span className="bullet-entry-title">{entryTitle}</span>
                        {hasComments && bulletWithComments.comments && (
                          <span className="bullet-comment-badge">{bulletWithComments.comments.length}</span>
                        )}
                      </div>
                      <div className="bullet-item-text">
                        {bulletText.substring(0, 100)}{bulletText.length > 100 ? '...' : ''}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
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
                scrollToBulletInList(selectedBulletId);
                handleBulletClick(selectedBulletId);
              }}
              title="View this bullet in the resume"
            >
              🔗 View bullet in PDF
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
                rows={3}
              />
              
              <div className="bullet-comment-form-actions">
                <button 
                  type="submit" 
                  className="btn-submit-comment"
                  disabled={submitting}
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
            <p className="hint">Browse bullets above to add a comment.</p>
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
                        {comment.author_name || (comment.user_id ? 'User' : 'Anonymous')}
                      </strong>
                      <span className="side-comment-date">
                        {new Date(comment.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="side-comment-content">{comment.content}</p>
                    <button
                      className="view-bullet-link"
                      onClick={(e) => {
                        e.stopPropagation();
                        scrollToBulletInList(bulletId);
                        handleBulletClick(bulletId);
                        // Also scroll to bullet in PDF if anchor exists
                        if (bulletAnchors && bulletAnchors[bulletId] && pdfViewerRef && pdfViewerRef.current) {
                          pdfViewerRef.current.scrollToAnchor(bulletAnchors[bulletId]);
                        }
                      }}
                      onMouseEnter={() => {
                        if (bulletAnchors && bulletAnchors[bulletId] && pdfViewerRef && pdfViewerRef.current && setHoveredCommentId) {
                          setHoveredCommentId(comment.id);
                          pdfViewerRef.current.setHoveredComment(comment.id);
                        }
                      }}
                      onMouseLeave={() => {
                        if (setHoveredCommentId) {
                          setHoveredCommentId(null);
                        }
                        if (pdfViewerRef && pdfViewerRef.current) {
                          pdfViewerRef.current.setHoveredComment(null);
                        }
                      }}
                      title="View this bullet in the resume"
                    >
                      🔗 View bullet in PDF
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
                    rows={3}
                  />
                  
                  <div className="bullet-comment-form-actions">
                    <button 
                      type="submit" 
                      className="btn-submit-comment"
                      disabled={submitting}
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
    </div>
  );
}

// Bullet Comment Form Component
function BulletCommentForm({ 
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

function SharedResumeView({ shareToken }) {
  const [resume, setResume] = useState(null);
  const [comments, setComments] = useState([]); // General comments (no bullet_id)
  const [bulletComments, setBulletComments] = useState({}); // { bulletId: [comments] }
  const [selectedBulletId, setSelectedBulletId] = useState(null);
  const [hoveredBulletId, setHoveredBulletId] = useState(null);
  const [bulletRefs, setBulletRefs] = useState({}); // Refs for scrolling to bullets
  const [loading, setLoading] = useState(true);
  const [generalCommentText, setGeneralCommentText] = useState('');
  const [bulletCommentText, setBulletCommentText] = useState('');
  const [generalAuthorName, setGeneralAuthorName] = useState('');
  const [bulletAuthorName, setBulletAuthorName] = useState('');
  const [generalIsAnonymous, setGeneralIsAnonymous] = useState(true);
  const [bulletIsAnonymous, setBulletIsAnonymous] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [pdfBase64, setPdfBase64] = useState(null);
  const [renderingPdf, setRenderingPdf] = useState(false);
  const [bulletAnchors, setBulletAnchors] = useState({}); // { bulletId: anchor }
  const [highlightedBulletInPdf, setHighlightedBulletInPdf] = useState(null);
  const [hoveredCommentId, setHoveredCommentId] = useState(null);
  const pdfViewerRef = useRef(null);

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

      // Ensure resume_data is parsed if it's a string
      let parsedResumeData = resumeData.resume_data;
      if (typeof parsedResumeData === 'string') {
        try {
          parsedResumeData = JSON.parse(parsedResumeData);
        } catch (e) {
          console.error('Failed to parse resume_data:', e);
        }
      }

      setResume({
        ...resumeData,
        resume_data: parsedResumeData,
        shareLink: linkData
      });
    } catch (err) {
      setError(err.message || 'Failed to load shared resume');
    } finally {
      setLoading(false);
    }
  };

  // Get all bullets from resume for browsing (must be before useEffect that uses it)
  const getAllBullets = useCallback(() => {
    if (!resume?.resume_data) return [];
    const data = resume.resume_data;
    const allBullets = [];
    
    // Get bullets from experiences
    (data.experiences || []).forEach(entry => {
      const bullets = entry.selectedBullets || entry.bullets || [];
      bullets.forEach((bullet, idx) => {
        const bulletId = bullet.id || `${entry.id}-bullet-${idx}`;
        const bulletText = typeof bullet === 'string' ? bullet : (bullet.text || bullet.rewritten || '');
        if (bulletText) {
          allBullets.push({
            bulletId,
            bulletText,
            sectionType: 'experience',
            entryId: entry.id,
            entryTitle: `${entry.role || ''} ${entry.company || ''}`.trim() || 'Experience'
          });
        }
      });
    });
    
    // Get bullets from education
    (data.education || []).forEach(entry => {
      const bullets = entry.selectedBullets || entry.bullets || [];
      bullets.forEach((bullet, idx) => {
        const bulletId = bullet.id || `${entry.id}-bullet-${idx}`;
        const bulletText = typeof bullet === 'string' ? bullet : (bullet.text || bullet.rewritten || '');
        if (bulletText) {
          allBullets.push({
            bulletId,
            bulletText,
            sectionType: 'education',
            entryId: entry.id,
            entryTitle: entry.school || 'Education'
          });
        }
      });
    });
    
    // Get bullets from projects
    (data.projects || []).forEach(entry => {
      const bullets = entry.selectedBullets || entry.bullets || [];
      bullets.forEach((bullet, idx) => {
        const bulletId = bullet.id || `${entry.id}-bullet-${idx}`;
        const bulletText = typeof bullet === 'string' ? bullet : (bullet.text || bullet.rewritten || '');
        if (bulletText) {
          allBullets.push({
            bulletId,
            bulletText,
            sectionType: 'project',
            entryId: entry.id,
            entryTitle: entry.name || 'Project'
          });
        }
      });
    });
    
    return allBullets;
  }, [resume]);

  // Convert resume data to format needed for renderLatex API
  const convertResumeForRender = useCallback((resumeData) => {
    if (!resumeData) return null;

    const data = resumeData.resume_data || resumeData;
    
    // Normalize personal info
    const personalInfo = data.personalInfo || data.personal_info || {};
    
    const mapBullets = (bullets) =>
      (bullets || [])
        .filter(bullet => {
          const text = typeof bullet === 'string' ? bullet : (bullet.text || bullet.rewritten || '');
          return text.trim().length > 0;
        })
        .map(bullet => ({
          id: bullet.id || `bullet-${Math.random()}`,
          text: typeof bullet === 'string' ? bullet : (bullet.text || bullet.rewritten || ''),
          relevanceScore: typeof bullet?.relevanceScore === 'number' ? bullet.relevanceScore : 0.5
        }));

    // Normalize experiences
    const experiences = (data.experiences || [])
      .filter(entry => {
        const company = entry.company && entry.company.trim();
        const role = entry.role && entry.role.trim();
        return company && role;
      })
      .map(entry => ({
        id: entry.id || `exp-${Math.random()}`,
        company: entry.company.trim(),
        role: entry.role.trim(),
        startDate: entry.startDate || null,
        endDate: entry.endDate || null,
        selectedBullets: mapBullets(entry.selectedBullets || entry.bullets)
      }));

    // Normalize education
    const education = (data.education || [])
      .filter(entry => {
        const school = entry.school && entry.school.trim();
        const degree = entry.degree && entry.degree.trim();
        const field = entry.field && entry.field.trim();
        return school && degree && field;
      })
      .map(entry => ({
        id: entry.id || `edu-${Math.random()}`,
        school: entry.school.trim(),
        degree: entry.degree.trim(),
        field: entry.field.trim(),
        startDate: entry.startDate || null,
        endDate: entry.endDate || null,
        selectedBullets: mapBullets(entry.selectedBullets || entry.bullets)
      }));

    // Normalize projects
    const projects = (data.projects || [])
      .filter(entry => entry.name && entry.name.trim())
      .map(entry => ({
        id: entry.id || `proj-${Math.random()}`,
        name: (entry.name && entry.name.trim()) || 'Project',
        description: entry.description || null,
        technologies: Array.isArray(entry.technologies) 
          ? entry.technologies.join(', ') 
          : (entry.technologies || entry.tech || entry.skills || null),
        startDate: entry.startDate || null,
        endDate: entry.endDate || null,
        selectedBullets: mapBullets(entry.selectedBullets || entry.bullets)
      }));

    // Normalize skills
    const skills = (data.skills || []).map(group => ({
      id: group.id || `skill-${Math.random()}`,
      title: group.title || 'Skills',
      skills: Array.isArray(group.skills) ? group.skills : (group.skills ? [group.skills] : [])
    }));

    // Normalize custom sections
    const customSections = (data.customSections || [])
      .filter(section => section.title && section.title.trim())
      .map(section => ({
        id: section.id || `custom-${Math.random()}`,
        title: (section.title && section.title.trim()) || 'Additional',
        subtitle: section.subtitle || null,
        selectedBullets: mapBullets(section.selectedBullets || section.bullets)
      }));

    return {
      personalInfo: {
        firstName: personalInfo.firstName || personalInfo.first_name || '',
        lastName: personalInfo.lastName || personalInfo.last_name || '',
        phone: personalInfo.phone || '',
        email: personalInfo.email || '',
        linkedin: personalInfo.linkedin || '',
        github: personalInfo.github || ''
      },
      experiences,
      education,
      projects,
      skills,
      customSections
    };
  }, []);

  // Render PDF when resume loads
  useEffect(() => {
    if (resume && resume.resume_data) {
      renderPdfPreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resume]);

  const renderPdfPreview = async () => {
    if (!resume || !resume.resume_data) return;

    setRenderingPdf(true);
    setPdfBase64(null);
    try {
      const resumeForRender = convertResumeForRender(resume);
      if (!resumeForRender) {
        throw new Error('Could not convert resume data');
      }
      const response = await renderLatex(resumeForRender);
      if (response?.pdf_base64) {
        setPdfBase64(response.pdf_base64);
      } else {
        throw new Error('LaTeX render did not return a PDF');
      }
    } catch (error) {
      console.error('Render PDF failed:', error);
      setError(error?.message || 'Failed to render PDF preview.');
    } finally {
      setRenderingPdf(false);
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

      // Get all comments (both general and bullet-specific)
      const { data: allComments, error: commentsError } = await supabase
        .from('resume_comments')
        .select('*')
        .eq('shared_link_id', link.id)
        .order('created_at', { ascending: false });

      if (commentsError) throw commentsError;

      // Separate general comments (no bullet_id) from bullet-specific comments
      const generalComments = [];
      const bulletCommentsMap = {};

      (allComments || []).forEach(comment => {
        // Get replies for each comment
        const getReplies = async (commentId) => {
          const { data: replies } = await supabase
            .from('resume_comments')
            .select('*')
            .eq('parent_id', commentId)
            .order('created_at', { ascending: true });
          return replies || [];
        };

        if (comment.bullet_id) {
          // Bullet-specific comment
          if (!bulletCommentsMap[comment.bullet_id]) {
            bulletCommentsMap[comment.bullet_id] = [];
          }
          // Only add top-level comments (no parent_id) to bullet comments
          if (!comment.parent_id) {
            bulletCommentsMap[comment.bullet_id].push(comment);
          }
        } else {
          // General comment (no bullet_id)
          if (!comment.parent_id) {
            generalComments.push(comment);
          }
        }
      });

      // Get replies for general comments
      const generalCommentsWithReplies = await Promise.all(
        generalComments.map(async (comment) => {
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

      // Get replies for bullet comments
      const bulletCommentsWithReplies = {};
      for (const [bulletId, commentsList] of Object.entries(bulletCommentsMap)) {
        bulletCommentsWithReplies[bulletId] = await Promise.all(
          commentsList.map(async (comment) => {
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
      }

      setComments(generalCommentsWithReplies);
      setBulletComments(bulletCommentsWithReplies);
    } catch (err) {
      console.error('Failed to load comments:', err);
    }
  };

  const submitComment = async (e, bulletId = null, bulletText = null, sectionType = null, entryId = null) => {
    e.preventDefault();
    
    // Use appropriate text based on whether it's a bullet comment or general comment
    const commentText = bulletId ? bulletCommentText : generalCommentText;
    const authorName = bulletId ? bulletAuthorName : generalAuthorName;
    const isAnonymous = bulletId ? bulletIsAnonymous : generalIsAnonymous;
    
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
          is_anonymous: isAnonymous || !session,
          bullet_id: bulletId || null,
          bullet_text: bulletId ? bulletText : null,
          section_type: bulletId ? sectionType : null,
          entry_id: bulletId ? entryId : null
        });

      if (insertError) throw insertError;

      // Clear the appropriate text field
      if (bulletId) {
        setBulletCommentText('');
        setBulletAuthorName('');
        setSelectedBulletId(null);
      } else {
        setGeneralCommentText('');
        setGeneralAuthorName('');
      }
      loadComments();
    } catch (err) {
      setError(err.message || 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const renderBullet = (bullet, bulletId, sectionType, entryId, entry) => {
    const bulletText = typeof bullet === 'string' ? bullet : (bullet.text || bullet.rewritten || '');
    const bulletCommentsList = bulletComments[bulletId] || [];
    const hasComments = bulletCommentsList.length > 0;
    const isSelected = selectedBulletId === bulletId;
    const isHovered = hoveredBulletId === bulletId;

    return (
      <li 
        key={bulletId} 
        ref={(el) => {
          if (el && !bulletRefs[bulletId]) {
            setBulletRefs(prev => ({ ...prev, [bulletId]: el }));
          }
        }}
        className={`resume-bullet ${hasComments ? 'has-comments' : ''} ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''}`}
        onClick={(e) => {
          // Only toggle if clicking on the bullet text or badge, not on the comment form
          if (!e.target.closest('.bullet-comment-form') && !e.target.closest('.comment-marker')) {
            e.stopPropagation();
            setSelectedBulletId(isSelected ? null : bulletId);
          }
        }}
        onMouseEnter={() => setHoveredBulletId(bulletId)}
        onMouseLeave={() => setHoveredBulletId(null)}
      >
        <div className="bullet-content-wrapper">
          <span className="comment-marker-container">
            {hasComments && (
              <span 
                className={`comment-marker ${isSelected || isHovered ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedBulletId(isSelected ? null : bulletId);
                }}
                title={`${bulletCommentsList.length} comment(s)`}
              >
                <span className="comment-marker-dot"></span>
                <span className="comment-marker-count">{bulletCommentsList.length}</span>
              </span>
            )}
            {!hasComments && (isSelected || isHovered) && (
              <span 
                className="comment-marker add-comment-marker"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedBulletId(bulletId);
                }}
                title="Add comment"
              >
                <span className="comment-marker-dot">+</span>
              </span>
            )}
          </span>
          <span className="bullet-text">{bulletText}</span>
        </div>
      </li>
    );
  };

  const scrollToBullet = (bulletId) => {
    const bulletElement = bulletRefs[bulletId];
    if (bulletElement) {
      bulletElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setSelectedBulletId(bulletId);
      // Keep selected for a bit longer so user can see the connection
      setTimeout(() => {
        // Don't clear if user is still interacting
      }, 3000);
    }
  };

  const renderResumeSection = (title, entries, getEntryContent, sectionType) => {
    if (!entries || entries.length === 0) return null;

    return (
      <div className="resume-section">
        <h3 className="section-title">{title}</h3>
        {entries.map((entry, idx) => (
          <div key={entry.id || idx} className="resume-entry">
            {getEntryContent(entry, sectionType)}
          </div>
        ))}
      </div>
    );
  };


  const findBulletText = useCallback((bulletId) => {
    if (!resume?.resume_data) return '';
    const data = resume.resume_data;
    
    // Search through all sections
    const sections = [
      ...(data.experiences || []),
      ...(data.education || []),
      ...(data.projects || [])
    ];
    
    for (const entry of sections) {
      const bullets = entry.selectedBullets || entry.bullets || [];
      for (let idx = 0; idx < bullets.length; idx++) {
        const bullet = bullets[idx];
        const id = bullet.id || `${entry.id}-bullet-${idx}`;
        if (id === bulletId) {
          return typeof bullet === 'string' ? bullet : (bullet.text || bullet.rewritten || '');
        }
      }
    }
    return '';
  }, [resume]);

  const findBulletContext = useCallback((bulletId) => {
    if (!resume?.resume_data) return { sectionType: null, entryId: null };
    const data = resume.resume_data;
    
    // Search through experiences
    for (const entry of (data.experiences || [])) {
      const bullets = entry.selectedBullets || entry.bullets || [];
      for (let idx = 0; idx < bullets.length; idx++) {
        const bullet = bullets[idx];
        const id = bullet.id || `${entry.id}-bullet-${idx}`;
        if (id === bulletId) {
          return { sectionType: 'experience', entryId: entry.id };
        }
      }
    }
    
    // Search through education
    for (const entry of (data.education || [])) {
      const bullets = entry.selectedBullets || entry.bullets || [];
      for (let idx = 0; idx < bullets.length; idx++) {
        const bullet = bullets[idx];
        const id = bullet.id || `${entry.id}-bullet-${idx}`;
        if (id === bulletId) {
          return { sectionType: 'education', entryId: entry.id };
        }
      }
    }
    
    // Search through projects
    for (const entry of (data.projects || [])) {
      const bullets = entry.selectedBullets || entry.bullets || [];
      for (let idx = 0; idx < bullets.length; idx++) {
        const bullet = bullets[idx];
        const id = bullet.id || `${entry.id}-bullet-${idx}`;
        if (id === bulletId) {
          return { sectionType: 'project', entryId: entry.id };
        }
      }
    }
    
    return { sectionType: null, entryId: null };
  }, [resume]);

  // Get all bullets with comments for the side panel (must be before early returns)
  const getAllBulletsWithComments = useCallback(() => {
    const bullets = [];
    Object.entries(bulletComments).forEach(([bulletId, commentsList]) => {
      if (commentsList.length > 0) {
        const bulletText = findBulletText(bulletId);
        const context = findBulletContext(bulletId);
        bullets.push({
          bulletId,
          bulletText,
          sectionType: context.sectionType,
          entryId: context.entryId,
          comments: commentsList
        });
      }
    });
    return bullets;
  }, [bulletComments, findBulletText, findBulletContext]);

  // Create overlay comments from bullet comments with anchors
  const overlayComments = useMemo(() => {
    const overlays = [];
    Object.entries(bulletComments).forEach(([bulletId, commentsList]) => {
      const anchor = bulletAnchors[bulletId];
      if (anchor) {
        commentsList.forEach(comment => {
          overlays.push({
            id: comment.id,
            anchor: anchor,
            bulletId: bulletId,
            content: comment.content,
            author: comment.author_name || 'Anonymous',
            created_at: comment.created_at
          });
        });
      }
    });
    return overlays;
  }, [bulletComments, bulletAnchors]);

  // Find anchors for bullets when PDF is ready
  useEffect(() => {
    if (!pdfViewerRef.current || !pdfBase64 || Object.keys(bulletComments).length === 0) return;

    const findAnchors = async () => {
      const allBullets = getAllBullets();
      const newAnchors = {};
      
      for (const bullet of allBullets) {
        if (bulletComments[bullet.bulletId] && !bulletAnchors[bullet.bulletId]) {
          try {
            const anchor = await pdfViewerRef.current.findTextPosition(bullet.bulletText);
            if (anchor) {
              newAnchors[bullet.bulletId] = anchor;
            }
          } catch (error) {
            console.error(`Failed to find anchor for bullet ${bullet.bulletId}:`, error);
          }
        }
      }
      
      if (Object.keys(newAnchors).length > 0) {
        setBulletAnchors(prev => ({ ...prev, ...newAnchors }));
      }
    };

    // Wait a bit for PDF to fully load
    const timeoutId = setTimeout(findAnchors, 1000);
    return () => clearTimeout(timeoutId);
  }, [pdfBase64, bulletComments, getAllBullets]);

  const renderResume = () => {
    if (!resume || !resume.resume_data) return null;

    const data = resume.resume_data;
    
    // Get personal info with fallbacks for different data structures
    const personalInfo = data.personalInfo || data.personal_info || {};
    const firstName = (personalInfo.firstName || personalInfo.first_name || '').trim();
    const lastName = (personalInfo.lastName || personalInfo.last_name || '').trim();
    const name = firstName || lastName 
      ? `${firstName} ${lastName}`.trim() 
      : (personalInfo.name || '').trim();
    
    // Check if we have any personal info to display
    const hasName = name.length > 0;
    const hasContactInfo = !!(personalInfo.phone || personalInfo.email || personalInfo.linkedin || personalInfo.github);
    const shouldShowPersonalInfo = hasName || hasContactInfo;

    return (
      <>
        {/* Personal Info Header - Always at top */}
        {shouldShowPersonalInfo && (
          <div className="resume-header-section">
            {hasName && (
              <h1 className="resume-name">{name}</h1>
            )}
            {hasContactInfo && (
              <div className="resume-contact-info">
                {personalInfo.phone && (
                  <span className="contact-item">{personalInfo.phone}</span>
                )}
                {personalInfo.email && (
                  <span className="contact-item">
                    {personalInfo.email}
                  </span>
                )}
                {personalInfo.linkedin && (
                  <span className="contact-item">
                    <a href={personalInfo.linkedin} target="_blank" rel="noopener noreferrer">
                      {personalInfo.linkedin.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/^linkedin\.com\/in\//, 'linkedin.com/in/')}
                    </a>
                  </span>
                )}
                {personalInfo.github && (
                  <span className="contact-item">
                    <a href={personalInfo.github} target="_blank" rel="noopener noreferrer">
                      {personalInfo.github.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/^github\.com\//, 'github.com/')}
                    </a>
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        <div className="resume-content" id="resume-content">

        {renderResumeSection(
          'EXPERIENCE',
          data.experiences,
          (entry, sectionType) => {
            // Get bullets from selectedBullets or bullets (fallback)
            const bullets = entry.selectedBullets || entry.bullets || [];
            const location = entry.location || (entry.city && entry.state ? `${entry.city}, ${entry.state}` : entry.city || entry.state || '');
            return (
              <div className="resume-entry">
                <div className="entry-header-row">
                  <div className="entry-title">
                    <strong className="entry-role">{entry.role}</strong>
                    {entry.company && <span className="entry-company"> ({entry.company})</span>}
                    {location && <span className="entry-location"> {location}</span>}
                  </div>
                  {(entry.startDate || entry.endDate) && (
                    <span className="entry-dates">
                      {entry.startDate || ''} {entry.startDate && entry.endDate ? '–' : ''} {entry.endDate || 'Present'}
                    </span>
                  )}
                </div>
                {bullets.length > 0 && (
                  <ul className="entry-bullets">
                    {bullets.map((bullet, idx) => {
                      const bulletId = bullet.id || `${entry.id}-bullet-${idx}`;
                      return renderBullet(bullet, bulletId, sectionType, entry.id, entry);
                    })}
                  </ul>
                )}
              </div>
            );
          },
          'experience'
        )}

        {renderResumeSection(
          'Education',
          data.education,
          (entry, sectionType) => {
            // Get bullets from selectedBullets or bullets (fallback)
            const bullets = entry.selectedBullets || entry.bullets || [];
            // Check if endDate is in the future for "Expected Graduation"
            const endDate = entry.endDate;
            const isFutureDate = endDate && new Date(endDate) > new Date();
            const dateLabel = isFutureDate ? 'Expected Graduation: ' : '';
            return (
              <div className="resume-entry">
                <div className="entry-header-row">
                  <div className="entry-title">
                    <strong className="entry-school">{entry.school}</strong>
                    {(entry.startDate || entry.endDate) && (
                      <span className="entry-dates-inline">
                        {' '}{dateLabel}{entry.endDate || entry.startDate || ''}
                      </span>
                    )}
                    {entry.degree && <span className="entry-degree">, {entry.degree}</span>}
                    {entry.field && <span className="entry-field">, {entry.field}</span>}
                  </div>
                </div>
                {bullets.length > 0 && (
                  <ul className="entry-bullets">
                    {bullets.map((bullet, idx) => {
                      const bulletId = bullet.id || `${entry.id}-bullet-${idx}`;
                      return renderBullet(bullet, bulletId, sectionType, entry.id, entry);
                    })}
                  </ul>
                )}
              </div>
            );
          },
          'education'
        )}

        {renderResumeSection(
          'PROJECTS',
          data.projects,
          (entry, sectionType) => {
            // Get bullets from selectedBullets or bullets (fallback)
            const bullets = entry.selectedBullets || entry.bullets || [];
            // Ensure technologies is always an array
            const technologiesRaw = entry.technologies || entry.tech || entry.skills;
            const technologies = Array.isArray(technologiesRaw) ? technologiesRaw : (technologiesRaw ? [technologiesRaw] : []);
            return (
              <div className="resume-entry">
                <div className="entry-header-row">
                  <div className="entry-title">
                    <strong className="entry-project-name">{entry.name}</strong>
                    {technologies.length > 0 && (
                      <span className="entry-technologies">— {technologies.join(', ')}</span>
                    )}
                  </div>
                </div>
                {bullets.length > 0 && (
                  <ul className="entry-bullets">
                    {bullets.map((bullet, idx) => {
                      const bulletId = bullet.id || `${entry.id}-bullet-${idx}`;
                      return renderBullet(bullet, bulletId, sectionType, entry.id, entry);
                    })}
                  </ul>
                )}
              </div>
            );
          },
          'project'
        )}

        {data.skills && data.skills.length > 0 && (
          <div className="resume-section">
            <h3 className="section-title">SKILLS</h3>
            <div className="skills-list">
              {data.skills.map((group, idx) => {
                // Ensure skills is always an array
                const skillsArray = Array.isArray(group.skills) ? group.skills : (group.skills ? [group.skills] : []);
                return (
                  <div key={group.id || idx} className="skill-group">
                    {group.title && <strong className="skill-category">{group.title}: </strong>}
                    <span className="skill-items">{skillsArray.length > 0 ? skillsArray.join(', ') : ''}</span>
                  </div>
                );
              })}
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

      <div className="resume-layout">
        <div className="resume-main-content">
          <div className="resume-preview">
            {renderingPdf && (
              <div className="pdf-loading">Rendering PDF…</div>
            )}
            {!renderingPdf && pdfBase64 && (
              <PdfViewerWithOverlays
                ref={pdfViewerRef}
                pdfBase64={pdfBase64}
                comments={overlayComments}
                highlightedBulletId={highlightedBulletInPdf}
                onTextSelect={(anchor) => {
                  console.log('Text selected:', anchor);
                }}
                scale={1.0}
              />
            )}
            {!renderingPdf && !pdfBase64 && error && (
              <div className="pdf-error">
                <p>Failed to load PDF preview: {error}</p>
                <button onClick={renderPdfPreview} className="btn btn-primary">
                  Retry PDF Rendering
                </button>
              </div>
            )}
            {!renderingPdf && !pdfBase64 && !error && (
              <div className="pdf-empty">Loading PDF preview...</div>
            )}
          </div>

          {resume.shareLink.allow_comments && (
            <div className="general-comments-section">
              <h2>General Comments ({comments.length})</h2>
              
              <form onSubmit={(e) => submitComment(e)} className="comment-form">
                {error && !selectedBulletId && <div className="comment-error">{error}</div>}
                
                <div className="comment-form-header">
                  <label>
                    <input
                      type="checkbox"
                      checked={generalIsAnonymous}
                      onChange={(e) => setGeneralIsAnonymous(e.target.checked)}
                    />
                    Post as anonymous
                  </label>
                </div>

                {generalIsAnonymous && (
                  <input
                    type="text"
                    placeholder="Your name"
                    value={generalAuthorName}
                    onChange={(e) => setGeneralAuthorName(e.target.value)}
                    className="comment-author-input"
                    required
                  />
                )}

                <textarea
                  placeholder="Add a general comment about the resume..."
                  value={generalCommentText}
                  onChange={(e) => setGeneralCommentText(e.target.value)}
                  className="comment-textarea"
                  required
                  rows={4}
                />
                
                <button 
                  type="submit" 
                  className="btn-submit-comment"
                  disabled={submitting}
                >
                  {submitting ? 'Posting...' : 'Post General Comment'}
                </button>
              </form>

              <div className="comments-list">
                {comments.length === 0 ? (
                  <p className="no-comments">No general comments yet.</p>
                ) : (
                  comments.map(comment => (
                    <CommentItem key={comment.id} comment={comment} />
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {resume.shareLink.allow_comments && (
          <CommentsSidePanel
            selectedBulletId={selectedBulletId}
            bulletComments={bulletComments}
            bulletsWithComments={getAllBulletsWithComments()}
            allBullets={getAllBullets()}
            onBulletClick={(bulletId) => {
              setSelectedBulletId(bulletId);
              // Scroll to bullet in PDF
              const anchor = bulletAnchors[bulletId];
              if (anchor && pdfViewerRef.current) {
                pdfViewerRef.current.scrollToAnchor(anchor);
                setHighlightedBulletInPdf(bulletId);
                setTimeout(() => setHighlightedBulletInPdf(null), 3000);
              }
            }}
            onCommentSubmit={(e, bulletId, bulletText, sectionType, entryId) => 
              submitComment(e, bulletId, bulletText, sectionType, entryId)
            }
            commentText={bulletCommentText}
            setCommentText={setBulletCommentText}
            authorName={bulletAuthorName}
            setAuthorName={setBulletAuthorName}
            isAnonymous={bulletIsAnonymous}
            setIsAnonymous={setBulletIsAnonymous}
            submitting={submitting}
            error={error}
            onCancel={() => {
              setSelectedBulletId(null);
              setBulletCommentText('');
              setBulletAuthorName('');
            }}
            findBulletText={findBulletText}
            findBulletContext={findBulletContext}
            bulletAnchors={bulletAnchors}
            pdfViewerRef={pdfViewerRef}
            hoveredCommentId={hoveredCommentId}
            setHoveredCommentId={setHoveredCommentId}
          />
        )}
      </div>
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

