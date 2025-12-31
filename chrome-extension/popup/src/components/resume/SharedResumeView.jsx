import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../config/supabase';
import HighlightOverlay, { createOverlayHighlight } from '../pdf/HighlightOverlay';
import CommentsSidePanel from '../comments/CommentsSidePanel';
import CommentItem from '../comments/CommentItem';
import { findBulletText as findBulletTextUtil, findBulletContext as findBulletContextUtil } from '../../utils/resumeUtils';
import { generateAnonymousUsername } from '../../utils/anonymousUsernames';
import { renderLatexHtml } from '../../services/api';
import './SharedResumeView.css';

function SharedResumeView({ shareToken }) {
  const [resume, setResume] = useState(null);
  const [comments, setComments] = useState([]); // General comments (no bullet_id)
  const [bulletComments, setBulletComments] = useState({}); // { bulletId: [comments] }
  const [selectedBulletId, setSelectedBulletId] = useState(null);
  const [hoveredBulletId, setHoveredBulletId] = useState(null);
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
  const [resumeHtml, setResumeHtml] = useState(null); // HTML content from pdf2htmlEX
  const [loadingHtml, setLoadingHtml] = useState(false);
  const [htmlError, setHtmlError] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
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


  // Convert resume_data to API format for HTML rendering
  const convertResumeDataToApiFormat = (resumeData) => {
    if (!resumeData) return null;

    // Helper to normalize bullets
    const normalizeBullets = (bullets) => {
      if (!Array.isArray(bullets)) return [];
      return bullets.map((bullet, idx) => {
        const text = typeof bullet === 'string' ? bullet : (bullet.text || bullet.rewritten || '');
        const id = bullet.id || `bullet-${idx}`;
        return {
          id,
          text,
          relevanceScore: bullet.relevanceScore || 0.0,
          lineCount: bullet.lineCount,
          original: bullet.original,
          rewritten: bullet.rewritten
        };
      });
    };

    return {
      personalInfo: resumeData.personalInfo || null,
      skills: (resumeData.skills || []).map((group, idx) => ({
        id: group.id || `skill-${idx}`,
        title: group.title || '',
        skills: Array.isArray(group.skills) ? group.skills : []
      })),
      experiences: (resumeData.experiences || []).map((entry, idx) => ({
        id: entry.id || `experience-${idx}`,
        company: entry.company || '',
        role: entry.role || '',
        location: entry.location || null,
        startDate: entry.startDate || null,
        endDate: entry.endDate || null,
        selectedBullets: normalizeBullets(entry.selectedBullets || entry.bullets || [])
      })),
      education: (resumeData.education || []).map((entry, idx) => ({
        id: entry.id || `education-${idx}`,
        school: entry.school || '',
        degree: entry.degree || '',
        field: entry.field || null,
        startDate: entry.startDate || null,
        endDate: entry.endDate || null,
        selectedBullets: normalizeBullets(entry.selectedBullets || entry.bullets || [])
      })),
      projects: (resumeData.projects || []).map((entry, idx) => ({
        id: entry.id || `project-${idx}`,
        name: entry.name || '',
        url: entry.url || null,
        technologies: entry.technologies || entry.tech || null,
        selectedBullets: normalizeBullets(entry.selectedBullets || entry.bullets || [])
      })),
      customSections: (resumeData.customSections || []).map((section, idx) => ({
        id: section.id || `custom-${idx}`,
        title: section.title || '',
        selectedBullets: normalizeBullets(section.selectedBullets || section.bullets || [])
      }))
    };
  };

  // Load HTML resume from pdf2htmlEX (required - no fallback)
  const loadResumeHtml = async () => {
    if (!resume || !resume.resume_data) {
      return;
    }

    setLoadingHtml(true);
    setHtmlError(null);
    
    try {
      const apiFormat = convertResumeDataToApiFormat(resume.resume_data);
      if (!apiFormat) {
        throw new Error('Failed to convert resume data');
      }

      const response = await renderLatexHtml(apiFormat);
      if (response?.html_content) {
        setResumeHtml(response.html_content);
      } else {
        throw new Error('No HTML content in response - pdf2htmlEX may not be configured');
      }
    } catch (err) {
      console.error('Error loading HTML resume:', err);
      setHtmlError(err.message || 'Failed to load HTML resume. pdf2htmlEX is required.');
    } finally {
      setLoadingHtml(false);
    }
  };

  // Load HTML when resume is loaded
  useEffect(() => {
    if (resume && resume.resume_data && !loading) {
      loadResumeHtml();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resume?.id, loading]);

  // Remove markers when HTML changes (markers will be added on-demand if needed)
  useEffect(() => {
    if (resumePageRef.current) {
      resumePageRef.current.querySelectorAll('.bullet-comment-marker').forEach(marker => marker.remove());
    }
  }, [resumeHtml]);

  // Add click handlers to bullet text elements for commenting
  useEffect(() => {
    if (!resumeHtml || !resume || !resumePageRef.current || !resume.resume_data) return;

    const resumePage = resumePageRef.current;
    
    // Helper to normalize text for comparison
    const normalizeText = (text) => {
      return text
        .replace(/\s+/g, ' ')
        .replace(/[•\u2022\u2023\u25E6\u2043\u2219]/g, '') // Remove bullet characters
        .trim()
        .toLowerCase();
    };

    // Build a map of bullet text to bullet IDs from resume data
    const bulletTextMap = new Map();
    const data = resume.resume_data;
    const sections = [
      ...(data.experiences || []),
      ...(data.education || []),
      ...(data.projects || []),
      ...(data.customSections || [])
    ];

    sections.forEach((entry) => {
      const bullets = entry.selectedBullets || entry.bullets || [];
      bullets.forEach((bullet, idx) => {
        const bulletId = bullet.id || `${entry.id}-bullet-${idx}`;
        const bulletText = typeof bullet === 'string' ? bullet : (bullet.text || bullet.rewritten || '');
        
        if (!bulletText.trim()) return;
        
        // Remove leading bullet character if present
        const cleanText = bulletText.replace(/^[•\u2022\u2023\u25E6\u2043\u2219\s]+/, '').trim();
        if (!cleanText) return;
        
        const normalizedText = normalizeText(cleanText);
        bulletTextMap.set(normalizedText, bulletId);
      });
    });

    // Function to find bullet ID from an element - handles bullets that span multiple elements
    const findBulletIdForElement = (element) => {
      const elementText = element.textContent || '';
      const normalizedElement = normalizeText(elementText);
      
      // Try exact match
      if (bulletTextMap.has(normalizedElement)) {
        return bulletTextMap.get(normalizedElement);
      }
      
      // Try substring match - check if element text contains bullet text
      for (const [normalizedBulletText, bulletId] of bulletTextMap.entries()) {
        if (normalizedElement.includes(normalizedBulletText) || normalizedBulletText.includes(normalizedElement)) {
          return bulletId;
        }
      }
      
      // If no direct match, try finding text that starts with the first few words of a bullet
      // This handles cases where bullets are split across multiple .t elements
      const elementWords = normalizedElement.split(/\s+/).filter(w => w.length > 3);
      if (elementWords.length > 0) {
        // Try matching first 3-5 words
        for (let wordCount = Math.min(5, elementWords.length); wordCount >= 3; wordCount--) {
          const prefix = elementWords.slice(0, wordCount).join(' ');
          for (const [normalizedBulletText, bulletId] of bulletTextMap.entries()) {
            if (normalizedBulletText.startsWith(prefix)) {
              return bulletId;
            }
          }
        }
      }
      
      // Also try checking surrounding elements (bullets might be split)
      // Get parent container and check all text within it
      const parent = element.closest('.pc') || element.closest('.pf');
      if (parent) {
        // Get all text elements in the same container
        const siblings = parent.querySelectorAll('.t');
        let combinedText = '';
        let foundIndex = -1;
        
        // Find where our element is in the sequence
        siblings.forEach((sibling, idx) => {
          if (sibling === element || sibling.contains(element)) {
            foundIndex = idx;
          }
        });
        
        // Build combined text from nearby elements (check 5 elements before and after)
        if (foundIndex >= 0) {
          const startIdx = Math.max(0, foundIndex - 2);
          const endIdx = Math.min(siblings.length, foundIndex + 8);
          
          for (let i = startIdx; i < endIdx; i++) {
            combinedText += (siblings[i].textContent || '') + ' ';
          }
          
          const normalizedCombined = normalizeText(combinedText);
          
          // Check if combined text matches any bullet
          for (const [normalizedBulletText, bulletId] of bulletTextMap.entries()) {
            if (normalizedCombined.includes(normalizedBulletText)) {
              return bulletId;
            }
          }
        }
      }
      
      return null;
    };

    // Add click handler to text elements
    const handleTextClick = (e) => {
      const element = e.target;
      // Make sure we're clicking on a .t element (pdf2htmlEX text elements)
      const textElement = element.closest('.t') || (element.classList.contains('t') ? element : null);
      if (!textElement) return;

      const bulletId = findBulletIdForElement(textElement);
      if (bulletId) {
        e.preventDefault();
        e.stopPropagation();
        setSelectedBulletId(bulletId);
        // Scroll to the element
        textElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    // Add hover handler for visual feedback
    const handleTextHover = (e) => {
      const element = e.target;
      const textElement = element.closest('.t') || (element.classList.contains('t') ? element : null);
      if (!textElement) return;

      const bulletId = findBulletIdForElement(textElement);
      if (bulletId) {
        textElement.style.cursor = 'pointer';
        textElement.title = 'Click to comment on this bullet';
      }
    };

    // Add event listeners to all text elements
    const textElements = resumePage.querySelectorAll('.t');
    textElements.forEach((element) => {
      element.addEventListener('click', handleTextClick);
      element.addEventListener('mouseenter', handleTextHover);
    });

    // Cleanup
    return () => {
      textElements.forEach((element) => {
        element.removeEventListener('click', handleTextClick);
        element.removeEventListener('mouseenter', handleTextHover);
      });
    };
  }, [resumeHtml, resume]);

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

  // Scroll to bullet in HTML view and highlight it - fuzzy matching (90% similarity)
  const scrollToBulletInHtml = useCallback((bulletId) => {
    if (!resumePageRef.current || !resume) return;
    
    // Get the bullet text we're looking for
    const bulletText = findBulletTextUtil(resume, bulletId);
    if (!bulletText) return;
    
    // Normalize text for comparison
    const normalizeText = (text) => {
      return text
        .replace(/\s+/g, ' ')
        .replace(/[•\u2022\u2023\u25E6\u2043\u2219]/g, '') // Remove bullet characters
        .trim()
        .toLowerCase();
    };
    
    // Calculate similarity between two strings (0-1)
    const calculateSimilarity = (str1, str2) => {
      const longer = str1.length > str2.length ? str1 : str2;
      const shorter = str1.length > str2.length ? str2 : str1;
      
      if (longer.length === 0) return 1.0;
      
      // Simple character-by-character comparison
      let matches = 0;
      const minLength = Math.min(longer.length, shorter.length);
      const maxLength = Math.max(longer.length, shorter.length);
      
      for (let i = 0; i < minLength; i++) {
        if (longer[i] === shorter[i]) {
          matches++;
        }
      }
      
      // Also check for substring matches
      if (longer.includes(shorter) || shorter.includes(longer)) {
        matches += Math.abs(maxLength - minLength) * 0.5; // Partial credit for length difference
      }
      
      // Calculate similarity score
      const baseScore = matches / maxLength;
      
      // Bonus for length similarity
      const lengthRatio = minLength / maxLength;
      
      return (baseScore * 0.7 + lengthRatio * 0.3);
    };
    
    // Remove leading bullet character if present
    const cleanText = bulletText.replace(/^[•\u2022\u2023\u25E6\u2043\u2219\s]+/, '').trim();
    if (!cleanText) return;
    
    const normalizedSearch = normalizeText(cleanText);
    
    // Remove previous highlights
    if (resumePageRef.current) {
      resumePageRef.current.querySelectorAll('.bullet-highlighted').forEach(el => {
        el.classList.remove('bullet-highlighted');
      });
    }
    
    // Linear search through all text elements with fuzzy matching
    const textElements = resumePageRef.current.querySelectorAll('.t');
    let foundElement = null;
    let bestSimilarity = 0;
    const SIMILARITY_THRESHOLD = 0.9; // 90% similarity
    
    for (const element of textElements) {
      const elementText = element.textContent || '';
      const normalizedElement = normalizeText(elementText);
      
      // Calculate similarity
      const similarity = calculateSimilarity(normalizedSearch, normalizedElement);
      
      if (similarity >= SIMILARITY_THRESHOLD && similarity > bestSimilarity) {
        bestSimilarity = similarity;
        foundElement = element;
      }
    }
    
    // If no single element matches well enough, try combining nearby elements
    if (!foundElement) {
      // Try to find a sequence of elements that together match the bullet
      const elementsArray = Array.from(textElements);
      
      for (let i = 0; i < elementsArray.length; i++) {
        let combinedText = '';
        // Try combining up to 5 consecutive elements
        for (let j = i; j < Math.min(i + 5, elementsArray.length); j++) {
          combinedText += (elementsArray[j].textContent || '') + ' ';
          const normalizedCombined = normalizeText(combinedText);
          const similarity = calculateSimilarity(normalizedSearch, normalizedCombined);
          
          if (similarity >= SIMILARITY_THRESHOLD && similarity > bestSimilarity) {
            bestSimilarity = similarity;
            foundElement = elementsArray[i]; // Use first element of the sequence
            break;
          }
        }
      }
    }
    
    if (foundElement) {
      // Highlight the found element
      foundElement.classList.add('bullet-highlighted');
      
      // Scroll to it
      foundElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      setSelectedBulletId(bulletId);
      setHighlightedBulletInPdf(bulletId);
      
      // Remove highlight after 3 seconds
      setTimeout(() => {
        if (foundElement) {
          foundElement.classList.remove('bullet-highlighted');
        }
        setHighlightedBulletInPdf(null);
      }, 3000);
    }
  }, [resume]);


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
            {loadingHtml ? (
              <div className="resume-html-loading">Loading high-fidelity resume...</div>
            ) : htmlError ? (
              <div className="resume-html-error">
                <h3>Failed to load high-fidelity resume</h3>
                <p>{htmlError}</p>
                <p className="resume-html-error-note">
                  pdf2htmlEX is required for high-fidelity HTML rendering. 
                  Please ensure pdf2htmlEX is installed and configured correctly.
                </p>
              </div>
            ) : resumeHtml ? (
              <div 
                className="resume-page resume-html-content" 
                ref={resumePageRef}
                dangerouslySetInnerHTML={{ __html: resumeHtml }}
                contentEditable="false"
                suppressContentEditableWarning={true}
              />
            ) : (
              <div className="resume-html-loading">Preparing resume...</div>
            )}
            {/* Highlight overlay container - positioned to match resume-page */}
            <HighlightOverlay 
              containerRef={resumePageRef}
              highlights={highlights}
              onRemoveHighlight={(highlightId) => {
                setHighlights(prev => prev.filter(h => h.id !== highlightId));
              }}
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
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        )}
      </div>
    </div>
  );
}

export default SharedResumeView;

