import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';
import { Icon } from '../ui/Icons';
import './SignIn.css';

/**
 * Sign In Component
 * Sign in with email/password or OAuth providers
 */
function SignIn({ onSignIn, onSwitchToSignUp }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Listen for OAuth callbacks from background script
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      const messageListener = (message) => {
        if (message.type === 'OAUTH_CALLBACK') {
          handleOAuthCallback(message.accessToken, message.refreshToken);
        } else if (message.type === 'OAUTH_CALLBACK_ERROR') {
          setError(`OAuth failed: ${message.error}`);
          setIsLoading(false);
        }
      };
      
      chrome.runtime.onMessage.addListener(messageListener);
      
      return () => {
        chrome.runtime.onMessage.removeListener(messageListener);
      };
    }
  }, []);

  // Handle OAuth callback with tokens
  async function handleOAuthCallback(accessToken, refreshToken) {
    try {
      if (!accessToken) {
        setError('No access token received');
        setIsLoading(false);
        return;
      }

      // Set the session using the tokens
      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken || '',
      });

      if (sessionError) {
        setError(`Session error: ${sessionError.message}`);
        setIsLoading(false);
        return;
      }

      if (sessionData.session && onSignIn) {
        await onSignIn({
          user: sessionData.user,
          email: sessionData.user.email,
          session: sessionData.session
        });
      } else {
        setError('Failed to create session. Please try again.');
      }
    } catch (error) {
      setError('Failed to process OAuth callback. Please try again.');
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (signInError) {
        setError(signInError.message || 'Sign-in failed. Please try again.');
        setIsLoading(false);
        return;
      }

      if (data.user && onSignIn) {
        await onSignIn({ 
          user: data.user, 
          email: data.user.email,
          session: data.session 
        });
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
      setIsLoading(false);
    }
  }

  async function handleSocialSignIn(provider) {
    setIsLoading(true);
    setError('');
    
    try {
      // For Chrome extensions, use background script for OAuth
      // Background script has chrome.identity even if popup doesn't
      if (provider === 'google') {
        // Get redirect URL (use fallback - background script will use chrome.identity)
        let redirectUrl = '';
        if (typeof chrome !== 'undefined' && chrome.runtime?.id) {
          // Construct from extension ID (same format as chrome.identity.getRedirectURL())
          const extensionId = chrome.runtime.id;
          redirectUrl = `https://${extensionId}.chromiumapp.org/`;
        } else {
          setError('Cannot determine redirect URL. Please reload the extension.');
          setIsLoading(false);
          return;
        }
        
        // Get the OAuth URL from Supabase with explicit redirect
        const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUrl,
            skipBrowserRedirect: true, // We'll handle the redirect manually via background script
            queryParams: {
              redirect_to: redirectUrl, // Explicitly set redirect in query params
            }
          }
        });

        if (oauthError) {
          setError(`Google sign-in failed: ${oauthError.message}`);
          setIsLoading(false);
          return;
        }

        if (data?.url) {
          // Set up message listener FIRST (before sending message)
          const messageListener = (message) => {
            if (message.type === 'OAUTH_CALLBACK') {
              handleOAuthCallback(message.accessToken, message.refreshToken);
              chrome.runtime.onMessage.removeListener(messageListener);
            } else if (message.type === 'OAUTH_CALLBACK_ERROR') {
              setError(message.error);
              setIsLoading(false);
              chrome.runtime.onMessage.removeListener(messageListener);
            }
          };
          
          chrome.runtime.onMessage.addListener(messageListener);
          
          // Send OAuth URL to background script for handling
          // Background script persists longer and won't lose context
          const messageToSend = {
            type: 'LAUNCH_OAUTH',
            oauthUrl: data.url,
            redirectUrl: redirectUrl
          };
          
          // Check if background script is available
          if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
            setError('Extension runtime not available. Please reload the extension.');
            setIsLoading(false);
            return;
          }
          
          // Add a timeout to detect if background script isn't responding
          const messageTimeout = setTimeout(() => {
            setError('Background script not responding. Please reload the extension.');
            setIsLoading(false);
            chrome.runtime.onMessage.removeListener(messageListener);
          }, 2000);
          
          chrome.runtime.sendMessage(messageToSend, (response) => {
            clearTimeout(messageTimeout);
            
            if (chrome.runtime.lastError) {
              setError('Failed to communicate with background script. Please reload the extension.');
              setIsLoading(false);
              chrome.runtime.onMessage.removeListener(messageListener);
              return;
            }
            
            // Check if we got a response (might be undefined if background uses async messages)
            if (response) {
              if (response.success) {
                handleOAuthCallback(response.accessToken, response.refreshToken);
                chrome.runtime.onMessage.removeListener(messageListener);
              } else {
                if (response.error && response.error.includes('Unknown message type')) {
                  setError('Background script error. Please reload the extension and try again.');
                } else {
                  setError(response?.error || 'OAuth flow failed');
                }
                setIsLoading(false);
                chrome.runtime.onMessage.removeListener(messageListener);
              }
            }
            // If no response, background will send async message via messageListener
          });
        } else {
          setError('Failed to start OAuth flow. Please try again.');
          setIsLoading(false);
        }
      } else {
        // Fallback for non-Chrome or other providers
        const redirectUrl = typeof chrome !== 'undefined' && chrome.runtime?.getURL
          ? chrome.runtime.getURL('popup-build/index.html?view=manager')
          : `${window.location.origin}${window.location.pathname}?view=manager`;

        const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
          provider: provider,
          options: {
            redirectTo: redirectUrl,
          }
        });

        if (oauthError) {
          setError(`${provider} sign-in failed: ${oauthError.message}`);
          setIsLoading(false);
        }
      }
    } catch (error) {
      setError(`${provider} sign-in failed. Please try again.`);
      setIsLoading(false);
    }
  }

  return (
    <div className="sign-in-container">
      <div className="sign-in-card">
        <div className="sign-in-header">
          <h1>Welcome to Resume Master</h1>
          <p className="sign-in-subtitle">Sign in to manage your resumes</p>
        </div>

        {error && (
          <div className="error-message" style={{
            background: '#fee',
            border: '1px solid #fcc',
            color: '#c33',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '14px',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}


        <form onSubmit={handleSubmit} className="sign-in-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-options">
            <label className="checkbox-label">
              <input type="checkbox" />
              <span>Remember me</span>
            </label>
            <a href="#" className="forgot-password">Forgot password?</a>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-sign-in"
            disabled={isLoading || !email || !password}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="sign-in-divider">
          <span>OR</span>
        </div>

        <div className="sign-in-social">
          <button 
            className="btn btn-social btn-google" 
            disabled={isLoading}
            onClick={() => handleSocialSignIn('google')}
            type="button"
          >
            <Icon name="search" size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Continue with Google
          </button>
          <button 
            className="btn btn-social btn-github" 
            disabled={isLoading}
            onClick={() => handleSocialSignIn('github')}
            type="button"
          >
            <Icon name="laptop" size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Continue with GitHub
          </button>
        </div>

        <div className="sign-in-footer">
          <p>
            Don't have an account?{' '}
            <a href="#" onClick={(e) => { e.preventDefault(); onSwitchToSignUp && onSwitchToSignUp(); }}>
              Sign up
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default SignIn;
