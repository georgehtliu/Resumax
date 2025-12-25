import React, { useState } from 'react';
import { supabase } from '../config/supabase';
import { storageService } from '../services/storage';
import './ShareResumeButton.css';

function ShareResumeButton({ resumeId, resumeName }) {
  const [shareLink, setShareLink] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Check if a string is a valid UUID
  const isValidUUID = (str) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
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
      
      setShareLink({
        ...data,
        share_url: shareUrl
      });
      setShowModal(true);
    } catch (err) {
      setError(err.message || 'Failed to create share link');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareLink.share_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError('Failed to copy link');
    }
  };

  return (
    <>
      <button 
        className="btn-share-resume"
        onClick={generateShareLink}
        disabled={loading}
        title="Generate shareable link"
      >
        {loading ? '⏳ Generating...' : '🔗 Share Resume'}
      </button>

      {error && (
        <div className="share-error">{error}</div>
      )}

      {showModal && shareLink && (
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
                value={shareLink.share_url} 
                readOnly 
                className="share-link-input"
              />
              <button 
                onClick={copyToClipboard}
                className="btn-copy"
              >
                {copied ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
            
            <div className="share-info">
              <p>Anyone with this link can view and comment on your resume.</p>
              <p className="share-warning">
                ⚠️ This link is permanent. You can deactivate it from your saved resumes.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ShareResumeButton;

