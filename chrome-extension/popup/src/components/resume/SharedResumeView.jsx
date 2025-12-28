import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../config/supabase';
import HighlightOverlay, { createOverlayHighlight } from '../pdf/HighlightOverlay';
import CommentsSidePanel from '../comments/CommentsSidePanel';
import CommentItem from '../comments/CommentItem';
import ResumeRenderer from './ResumeRenderer';
import { findBulletText as findBulletTextUtil, findBulletContext as findBulletContextUtil } from '../../utils/resumeUtils';
import { generateAnonymousUsername } from '../../utils/anonymousUsernames';
import './SharedResumeView.css';

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
  const [generalIsAnonymous, setGeneralIsAnonymous] = useState(false);
  const [bulletIsAnonymous, setBulletIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  // PDF-related state removed - using HTML rendering for shared resumes
  const [highlightedBulletInPdf, setHighlightedBulletInPdf] = useState(null);
  const [hoveredCommentId, setHoveredCommentId] = useState(null);
  const [highlightColor, setHighlightColor] = useState('#fef08a'); // Default yellow highlight
  const highlightColorRef = useRef('#fef08a');
  const resumePageRef = useRef(null);
  const highlightHandlerRef = useRef(null);
  const isResumeLoadedRef = useRef(false);
  const [highlights, setHighlights] = useState([]); // Store overlay highlight data
  
  // Keep ref in sync with state
  useEffect(() => {
    highlightColorRef.current = highlightColor;
  }, [highlightColor]);

  // Set up highlighting handler - use resume ID to track if already set up
  useEffect(() => {
    if (!resume || !resume.resume_data) return;
    
    // Check if we've already set up for this resume
    const resumeId = resume.id;
    if (isResumeLoadedRef.current === resumeId) return;
    
    const handleMouseUp = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || !selection.toString().trim()) {
        return;
      }

      const range = selection.getRangeAt(0);
      const resumePage = resumePageRef.current;
      
      if (!resumePage || !resumePage.contains(range.commonAncestorContainer)) {
        return;
      }

      // Create overlay highlight (doesn't modify DOM)
      const highlightData = createOverlayHighlight(range, resumePage, highlightColorRef.current);
      if (highlightData) {
        setHighlights(prev => [...prev, highlightData]);
      }
      
      // Clear selection
      selection.removeAllRanges();
    };

    // Wait for DOM to be ready
    const timeoutId = setTimeout(() => {
      const resumePage = resumePageRef.current;
      if (resumePage && isResumeLoadedRef.current !== resumeId) {
        resumePage.addEventListener('mouseup', handleMouseUp);
        highlightHandlerRef.current = handleMouseUp;
        isResumeLoadedRef.current = resumeId;
      }
    }, 300);

    return () => {
      clearTimeout(timeoutId);
      const resumePage = resumePageRef.current;
      if (resumePage && highlightHandlerRef.current) {
        resumePage.removeEventListener('mouseup', highlightHandlerRef.current);
        highlightHandlerRef.current = null;
      }
      if (isResumeLoadedRef.current === resumeId) {
        isResumeLoadedRef.current = false;
      }
    };
  }, [resume?.id]);

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


  // PDF rendering removed - using HTML rendering for shared resumes

  // PDF rendering removed - using HTML rendering for shared resumes

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
    const isAnonymous = bulletId ? bulletIsAnonymous : generalIsAnonymous;
    
    if (!commentText.trim()) return;

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

      // Determine author name
      let authorName = null;
      if (isAnonymous || !session) {
        // Generate random anonymous username
        authorName = generateAnonymousUsername();
      } else if (session?.user) {
        // Use user's email or metadata name
        authorName = session.user.user_metadata?.full_name || 
                    session.user.user_metadata?.name || 
                    session.user.email?.split('@')[0] || 
                    'User';
      }

      const { error: insertError } = await supabase
        .from('resume_comments')
        .insert({
          shared_link_id: link.id,
          user_id: session?.user?.id || null,
          author_name: authorName,
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
        setSelectedBulletId(null);
      } else {
        setGeneralCommentText('');
      }
      loadComments();
    } catch (err) {
      setError(err.message || 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  // Scroll to bullet in HTML view
  const scrollToBulletInHtml = (bulletId) => {
    const bulletElement = bulletRefs[bulletId];
    if (bulletElement) {
      bulletElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setSelectedBulletId(bulletId);
      setHighlightedBulletInPdf(bulletId);
      setTimeout(() => setHighlightedBulletInPdf(null), 3000);
    }
  };

  const findBulletText = useCallback((bulletId) => {
    return findBulletTextUtil(resume, bulletId);
  }, [resume]);

  const findBulletContext = useCallback((bulletId) => {
    return findBulletContextUtil(resume, bulletId);
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



  // Early returns must come after all hooks
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
        <div className="highlight-controls">
          <label htmlFor="highlight-color-picker" className="highlight-label">
            Highlight Color:
          </label>
          <input
            id="highlight-color-picker"
            type="color"
            value={highlightColor}
            onChange={(e) => setHighlightColor(e.target.value)}
            className="highlight-color-picker"
            title="Select highlight color"
          />
          <span className="highlight-hint">Select text and it will be highlighted</span>
        </div>
      </div>

      <div className="resume-layout">
        <div className="resume-main-content">
          <div className="resume-html-wrapper" style={{ position: 'relative' }}>
            <div 
              className="resume-page" 
              ref={resumePageRef}
              contentEditable="false"
              suppressContentEditableWarning={true}
            >
              <ResumeRenderer
                resume={resume}
                bulletComments={bulletComments}
                selectedBulletId={selectedBulletId}
                hoveredBulletId={hoveredBulletId}
                setSelectedBulletId={setSelectedBulletId}
                setHoveredBulletId={setHoveredBulletId}
                bulletRefs={bulletRefs}
                setBulletRefs={setBulletRefs}
              />
            </div>
            {/* Highlight overlay container - positioned to match resume-page */}
            <HighlightOverlay 
              containerRef={resumePageRef}
              highlights={highlights}
            />
          </div>

          {resume.shareLink.allow_comments && (
            <div className="general-comments-section">
              <h2>General Comments ({comments.length})</h2>
              
              <form onSubmit={(e) => submitComment(e)} className="comment-form">
                {error && !selectedBulletId && <div className="comment-error">{error}</div>}
                
                <div className="comment-form-header">
                  <label className="comment-checkbox-label">
                    <input
                      type="checkbox"
                      checked={generalIsAnonymous}
                      onChange={(e) => setGeneralIsAnonymous(e.target.checked)}
                      className="comment-checkbox"
                    />
                    <span>Post as anonymous</span>
                  </label>
                </div>

                <textarea
                  placeholder="Add a general comment about the resume..."
                  value={generalCommentText}
                  onChange={(e) => setGeneralCommentText(e.target.value)}
                  className="comment-textarea"
                  required
                  rows={4}
                />
                
                <div className="comment-form-actions">
                  <button 
                    type="submit" 
                    className="btn-submit-comment"
                    disabled={submitting || !generalCommentText.trim()}
                  >
                    {submitting ? 'Posting...' : 'Post Comment'}
                  </button>
                </div>
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
            onBulletClick={(bulletId) => {
              scrollToBulletInHtml(bulletId);
            }}
            onCommentSubmit={(e, bulletId, bulletText, sectionType, entryId) => 
              submitComment(e, bulletId, bulletText, sectionType, entryId)
            }
            commentText={bulletCommentText}
            setCommentText={setBulletCommentText}
            isAnonymous={bulletIsAnonymous}
            setIsAnonymous={setBulletIsAnonymous}
            submitting={submitting}
            error={error}
            onCancel={() => {
              setSelectedBulletId(null);
              setBulletCommentText('');
            }}
            findBulletText={findBulletText}
            findBulletContext={findBulletContext}
            bulletAnchors={{}}
            pdfViewerRef={null}
            hoveredCommentId={hoveredCommentId}
            setHoveredCommentId={setHoveredCommentId}
            scrollToBulletInHtml={scrollToBulletInHtml}
          />
        )}
      </div>
    </div>
  );
}

export default SharedResumeView;

