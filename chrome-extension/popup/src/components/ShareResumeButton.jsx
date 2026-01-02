import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../config/supabase';
import { storageService } from '../services/storage';
import { Icon } from './ui/Icons';
import { useToast } from '../hooks/useToast';
import './ShareResumeButton.css';

function ShareResumeButton({ resumeId, resumeName }) {
  const [shareLink, setShareLink] = useState(null);
  const [existingShareLink, setExistingShareLink] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const { success, error: showError } = useToast();

  // Check if user has accepted the disclaimer
  const hasAcceptedDisclaimer = () => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('resumax_share_disclaimer_accepted') === 'true';
    }
    return false;
  };

  // Accept disclaimer and store in localStorage
  const acceptDisclaimer = () => {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('resumax_share_disclaimer_accepted', 'true');
    }
    setShowDisclaimer(false);
  };

  // Check if a string is a valid UUID
  const isValidUUID = (str) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  // Check for existing share link on mount
  useEffect(() => {
    checkExistingShareLink();
  }, [resumeId]);

  // Calculate dropdown position and close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          buttonRef.current && !buttonRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }

    function updateDropdownPosition() {
      if (buttonRef.current && showDropdown) {
        const rect = buttonRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + 8,
          right: window.innerWidth - rect.right
        });
      }
    }

    if (showDropdown) {
      updateDropdownPosition();
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('resize', updateDropdownPosition);
      window.addEventListener('scroll', updateDropdownPosition, true);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        window.removeEventListener('resize', updateDropdownPosition);
        window.removeEventListener('scroll', updateDropdownPosition, true);
      };
    }
  }, [showDropdown]);

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
      setShowDropdown(false);
    }
  };

  const handleCopyLink = () => {
    const linkToCopy = (shareLink || existingShareLink)?.share_url;
    if (linkToCopy) {
      navigator.clipboard.writeText(linkToCopy);
      setCopied(true);
      success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
      setShowDropdown(false);
    }
  };

  const handleRevokeShare = async () => {
    if (!window.confirm('Are you sure you want to revoke access to this shared resume? The link will no longer work.')) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        showError('Please sign in to manage share links');
        return;
      }

      const { error } = await supabase
        .from('shared_resume_links')
        .update({ is_active: false })
        .eq('id', existingShareLink.id)
        .eq('user_id', session.user.id);

      if (error) throw error;

      setExistingShareLink(null);
      setShareLink(null);
      setShowDropdown(false);
      success('Share link revoked successfully');
    } catch (err) {
      showError(err.message || 'Failed to revoke share link');
    }
  };

  const handleShareClick = () => {
    // Check if user has accepted disclaimer
    if (!hasAcceptedDisclaimer()) {
      setShowDisclaimer(true);
      return;
    }
    // If already accepted, proceed to generate
    generateShareLink();
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
      success('Share link created successfully!');
    } catch (err) {
      const errorMsg = err.message || 'Failed to create share link';
      setError(errorMsg);
      showError(errorMsg);
    } finally {
      setLoading(false);
    }
  };


  // Show loading state while checking
  if (checking) {
    return (
      <button 
        className="btn-share-resume btn-share-resume-loading"
        disabled
        title="Checking for existing share link..."
      >
        <Icon name="loader" size={16} className="spinner" />
        <span>Checking...</span>
      </button>
    );
  }

  const currentShareLink = shareLink || existingShareLink;

  return (
    <>
      <div className="share-button-container">
        {existingShareLink ? (
          <div className="share-button-group" ref={buttonRef}>
            <button 
              className="btn-share-resume btn-share-resume-success"
              onClick={goToShared}
              title="Open shared resume link"
            >
              <Icon name="checkCircle" size={16} />
              <span>Shared</span>
            </button>
            <button 
              className="btn-share-resume-dropdown"
              onClick={() => setShowDropdown(!showDropdown)}
              title="Share options"
              aria-label="Share options"
            >
              <Icon name="chevronDown" size={14} />
            </button>
          </div>
        ) : (
          <button 
            ref={buttonRef}
            className="btn-share-resume btn-share-resume-primary"
            onClick={handleShareClick}
            disabled={loading}
            title="Generate shareable link"
          >
            {loading ? (
              <>
                <Icon name="loader" size={16} className="spinner" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Icon name="share" size={16} />
                <span>Share Resume</span>
              </>
            )}
          </button>
        )}
        
        {showDropdown && createPortal(
          <div 
            className="share-dropdown-menu share-dropdown-menu-fixed"
            ref={dropdownRef}
            style={{
              top: `${dropdownPosition.top}px`,
              right: `${dropdownPosition.right}px`
            }}
          >
            <button 
              className="share-dropdown-item"
              onClick={() => {
                setShowModal(true);
                setShowDropdown(false);
              }}
            >
              <Icon name="clipboard" size={16} />
              <span>Copy Link</span>
            </button>
            <button 
              className="share-dropdown-item"
              onClick={goToShared}
            >
              <Icon name="link" size={16} />
              <span>View Shared</span>
            </button>
            <div className="share-dropdown-divider" />
            <button 
              className="share-dropdown-item share-dropdown-item-danger"
              onClick={handleRevokeShare}
            >
              <Icon name="x" size={16} />
              <span>Revoke Access</span>
            </button>
          </div>,
          document.body
        )}
      </div>

      {/* Disclaimer Modal */}
      {showDisclaimer && createPortal(
        <div 
          className="share-modal-overlay" 
          onClick={(e) => {
            // Don't close on overlay click - user must accept or decline
            e.stopPropagation();
          }}
        >
          <div 
            className="share-modal share-disclaimer-modal" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="share-modal-header">
              <div className="share-modal-header-content">
                <div className="share-modal-icon" style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning)' }}>
                  <Icon name="warning" size={24} />
                </div>
                <div>
                  <h3>Before You Share</h3>
                  <p className="share-modal-subtitle">Important information about sharing your resume</p>
                </div>
              </div>
            </div>
            
            <div className="share-disclaimer-content">
              <div className="share-disclaimer-section">
                <Icon name="globe" size={20} />
                <div>
                  <h4>Public Access</h4>
                  <p>Anyone with the share link can view your resume, even without signing in. The link is permanent until you revoke it.</p>
                </div>
              </div>

              <div className="share-disclaimer-section">
                <Icon name="messageSquare" size={20} />
                <div>
                  <h4>Comments & Feedback</h4>
                  <p>People with the link can leave comments and feedback on your resume. You'll be able to see and manage these comments.</p>
                </div>
              </div>

              <div className="share-disclaimer-section">
                <Icon name="lock" size={20} />
                <div>
                  <h4>Privacy & Security</h4>
                  <p>Only share the link with people you trust. You can revoke access at any time from your saved resumes page.</p>
                </div>
              </div>

              <div className="share-disclaimer-warning-box">
                <Icon name="alert" size={18} />
                <p>
                  <strong>Important:</strong> Once you share the link, anyone who has it can access your resume. 
                  Make sure you're comfortable sharing this information before proceeding.
                </p>
              </div>
            </div>

            <div className="share-disclaimer-actions">
              <button 
                className="btn-disclaimer-cancel"
                onClick={() => setShowDisclaimer(false)}
              >
                Cancel
              </button>
              <button 
                className="btn-disclaimer-accept"
                onClick={() => {
                  acceptDisclaimer();
                  generateShareLink();
                }}
              >
                <Icon name="check" size={16} />
                I Understand, Continue
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Share Link Modal */}
      {showModal && currentShareLink && createPortal(
        <div 
          className="share-modal-overlay" 
          onClick={() => setShowModal(false)}
          onMouseDown={(e) => {
            // Only close if clicking directly on overlay, not during drag
            if (e.target === e.currentTarget) {
              setShowModal(false);
            }
          }}
        >
          <div 
            className="share-modal" 
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="share-modal-header">
              <div className="share-modal-header-content">
                <div className="share-modal-icon">
                  <Icon name="share" size={24} />
                </div>
                <div>
                  <h3>Share Resume</h3>
                  <p className="share-modal-subtitle">{resumeName}</p>
                </div>
              </div>
              <button 
                className="share-modal-close"
                onClick={() => setShowModal(false)}
                aria-label="Close modal"
              >
                <Icon name="x" size={20} />
              </button>
            </div>
            
            <div className="share-link-section">
              <label className="share-link-label">Share Link</label>
              <div className="share-link-input-group">
                <input 
                  type="text" 
                  value={currentShareLink.share_url} 
                  readOnly 
                  className="share-link-input"
                  onClick={(e) => e.target.select()}
                />
                <button 
                  onClick={handleCopyLink}
                  className="btn-copy-link"
                >
                  {copied ? (
                    <>
                      <Icon name="check" size={16} />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Icon name="clipboard" size={16} />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="share-info-box">
              <Icon name="info" size={16} />
              <div>
                <p className="share-info-text">
                  Anyone with this link can view and comment on your resume.
                </p>
                <p className="share-info-warning">
                  <Icon name="warning" size={14} />
                  This link is permanent until you revoke access.
                </p>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

export default ShareResumeButton;

