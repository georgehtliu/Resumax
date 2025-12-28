import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { storageService } from '../services/storage';
import { Icon } from './ui/Icons';
import './ShareResumeButton.css';

function ShareResumeButton({ resumeId, resumeName }) {
  const [shareLink, setShareLink] = useState(null);
  const [existingShareLink, setExistingShareLink] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Check if a string is a valid UUID
  const isValidUUID = (str) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  // Check for existing share link on mount
  useEffect(() => {
    checkExistingShareLink();
  }, [resumeId]);

  const checkExistingShareLink = async () => {
    setChecking(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setChecking(false);
        return;
      }

      let supabaseResumeId = resumeId;

      // If resumeId is not a UUID, try to find it in Supabase
      if (!isValidUUID(resumeId)) {
        const savedResume = await storageService.getSavedResume(resumeId);
        if (savedResume) {
          const { data: existingResume } = await supabase
            .from('saved_resumes')
            .select('id')
            .eq('user_id', session.user.id)
            .eq('name', savedResume.name || resumeName)
            .single();

          if (existingResume) {
            supabaseResumeId = existingResume.id;
          } else {
            // Resume not in Supabase yet, no share link exists
            setChecking(false);
            return;
          }
        } else {
          setChecking(false);
          return;
        }
      }

      // Check for existing active share link
      const { data: existingLink, error: fetchError } = await supabase
        .from('shared_resume_links')
        .select('*')
        .eq('resume_id', supabaseResumeId)
        .eq('user_id', session.user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!fetchError && existingLink) {
        // Construct share URL
        let shareUrl;
        if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
          const baseUrl = chrome.runtime.getURL('popup-build/index.html');
          shareUrl = `${baseUrl}?share=${existingLink.share_token}`;
        } else {
          const currentUrl = new URL(window.location.href);
          shareUrl = `${currentUrl.origin}${currentUrl.pathname}?share=${existingLink.share_token}`;
        }

        setExistingShareLink({
          ...existingLink,
          share_url: shareUrl
        });
      }
    } catch (err) {
      // Silently fail - just don't show existing link
      console.error('Error checking for existing share link:', err);
    } finally {
      setChecking(false);
    }
  };

  const goToShared = () => {
    if (existingShareLink?.share_url) {
      if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
        chrome.tabs.create({ url: existingShareLink.share_url });
      } else {
        window.open(existingShareLink.share_url, '_blank', 'noopener');
      }
    }
  };

  const generateShareLink = async () => {
    setLoading(true);
    setError('');
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Please sign in to share resumes');
        return;
      }

      let supabaseResumeId = resumeId;

      // If resumeId is not a UUID (e.g., "resume-123456"), it's from Chrome Storage
      // We need to save it to Supabase first
      if (!isValidUUID(resumeId)) {
        // Get the resume data from Chrome Storage
        const savedResume = await storageService.getSavedResume(resumeId);
        if (!savedResume) {
          throw new Error('Resume not found');
        }

        // Check if this resume already exists in Supabase (by name and user)
        const { data: existingResume } = await supabase
          .from('saved_resumes')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('name', savedResume.name || resumeName)
          .single();

        if (existingResume) {
          // Use existing resume
          supabaseResumeId = existingResume.id;
        } else {
          // Save to Supabase
          const { data: newResume, error: saveError } = await supabase
            .from('saved_resumes')
            .insert({
              user_id: session.user.id,
              name: savedResume.name || resumeName,
              resume_data: savedResume.data
            })
            .select()
            .single();

          if (saveError) throw saveError;
          supabaseResumeId = newResume.id;
        }
      } else {
        // ResumeId is a UUID, verify it exists in Supabase
        const { data: existingResume, error: fetchError } = await supabase
          .from('saved_resumes')
          .select('id')
          .eq('id', resumeId)
          .eq('user_id', session.user.id)
          .single();

        if (fetchError || !existingResume) {
          throw new Error('Resume not found in database');
        }
      }

      // Generate secure token (64 characters)
      const shareToken = crypto.randomUUID().replace(/-/g, '') + 
                        crypto.randomUUID().replace(/-/g, '').substring(0, 16);
      
      // Create share link in database
      const { data, error: insertError } = await supabase
        .from('shared_resume_links')
        .insert({
          resume_id: supabaseResumeId,
          user_id: session.user.id,
          share_token: shareToken,
          is_active: true,
          allow_comments: true
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Construct share URL
      // For Chrome extension, construct the URL properly
      let shareUrl;
      if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
        // In Chrome extension context
        const baseUrl = chrome.runtime.getURL('popup-build/index.html');
        shareUrl = `${baseUrl}?share=${shareToken}`;
      } else {
        // Fallback for non-extension context
        const currentUrl = new URL(window.location.href);
        shareUrl = `${currentUrl.origin}${currentUrl.pathname}?share=${shareToken}`;
      }
      
      const newShareLink = {
        ...data,
        share_url: shareUrl
      };
      
      setShareLink(newShareLink);
      setExistingShareLink(newShareLink); // Update existing link state
      setShowModal(true);
    } catch (err) {
      setError(err.message || 'Failed to create share link');
    } finally {
      setLoading(false);
    }
  };


  // Show loading state while checking
  if (checking) {
    return (
      <button 
        className="btn-share-resume"
        disabled
        title="Checking..."
      >
        ⏳ Checking...
      </button>
    );
  }

  // If share link exists, show "Go to Shared" button
  if (existingShareLink) {
    return (
      <>
        <button 
          className="btn-share-resume btn-go-to-shared"
          onClick={goToShared}
          title="Open shared resume link"
        >
          <Icon name="link" size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
          Go to Shared
        </button>
        <button 
          className="btn-share-resume btn-share-again"
          onClick={() => setShowModal(true)}
          title="View share link"
        >
          <Icon name="clipboard" size={16} />
        </button>
      </>
    );
  }

  return (
    <>
      <button 
        className="btn-share-resume"
        onClick={generateShareLink}
        disabled={loading}
        title="Generate shareable link"
      >
        {loading ? (
          <>
            <Icon name="loader" size={16} className="animate-spin" style={{ marginRight: '6px', verticalAlign: 'middle' }} />
            Generating...
          </>
        ) : (
          <>
            <Icon name="link" size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
            Share Resume
          </>
        )}
      </button>

      {error && (
        <div className="share-error">{error}</div>
      )}

      {showModal && (shareLink || existingShareLink) && (
        <div className="share-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="share-modal" onClick={(e) => e.stopPropagation()}>
            <div className="share-modal-header">
              <h3>Share Resume: {resumeName}</h3>
              <button 
                className="close-btn"
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className="share-link-container">
              <input 
                type="text" 
                value={(shareLink || existingShareLink)?.share_url} 
                readOnly 
                className="share-link-input"
              />
              <button 
                onClick={() => {
                  const linkToCopy = (shareLink || existingShareLink)?.share_url;
                  if (linkToCopy) {
                    navigator.clipboard.writeText(linkToCopy);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }
                }}
                className="btn-copy"
              >
                {copied ? (
                  <>
                    <Icon name="checkCircle" size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                    Copied!
                  </>
                ) : 'Copy'}
              </button>
            </div>
            
            <div className="share-info">
              <p>Anyone with this link can view and comment on your resume.</p>
              <p className="share-warning">
                <Icon name="warning" size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                This link is permanent. You can deactivate it from your saved resumes.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ShareResumeButton;

