import React, { useState } from 'react';
import './SignIn.css';

/**
 * Sign In Component
 * Simple UI-only sign-in page for the Resume Manager
 */
function SignIn({ onSignIn }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password) {
      return;
    }
    
    setIsLoading(true);
    
    // Simulate sign-in (UI only - no actual auth)
    try {
      // Small delay for UX
      await new Promise(resolve => setTimeout(resolve, 600));
      if (onSignIn) {
        await onSignIn({ email, password });
      }
    } catch (error) {
      console.error('Sign-in error:', error);
      alert('Sign-in failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSocialSignIn(provider) {
    setIsLoading(true);
    try {
      // Simulate social sign-in
      await new Promise(resolve => setTimeout(resolve, 600));
      const mockEmail = provider === 'google' 
        ? 'user@gmail.com' 
        : 'user@github.com';
      if (onSignIn) {
        await onSignIn({ email: mockEmail, provider });
      }
    } catch (error) {
      console.error('Social sign-in error:', error);
      alert(`${provider} sign-in failed. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="sign-in-container">
      <div className="sign-in-card">
        <div className="sign-in-header">
          <h1>Welcome to Resumax</h1>
          <p className="sign-in-subtitle">Sign in to manage your resumes</p>
        </div>

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
            <span className="social-icon">🔍</span>
            Continue with Google
          </button>
          <button 
            className="btn btn-social btn-github" 
            disabled={isLoading}
            onClick={() => handleSocialSignIn('github')}
            type="button"
          >
            <span className="social-icon">💻</span>
            Continue with GitHub
          </button>
        </div>

        <div className="sign-in-footer">
          <p>
            Don't have an account? <a href="#">Sign up</a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default SignIn;

