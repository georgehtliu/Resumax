import React, { useState } from 'react';
import { supabase } from '../config/supabase';
import './SignUp.css';

/**
 * Sign Up Component
 * Creates a new user account with Supabase
 */
function SignUp({ onSignUp, onSwitchToSignIn }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validation
    if (!username || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      // Sign up with Supabase
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            username: username, // Store username in user metadata
          }
        }
      });

      if (signUpError) {
        setError(signUpError.message || 'Failed to create account. Please try again.');
        setIsLoading(false);
        return;
      }

      if (data.user) {
        setSuccess(true);
        // Wait a moment to show success message
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        if (onSignUp) {
          await onSignUp({ user: data.user, email: email });
        }
      }
    } catch (err) {
      console.error('Sign-up error:', err);
      setError(err.message || 'An error occurred. Please try again.');
      setIsLoading(false);
    }
  }

  return (
    <div className="sign-up-container">
      <div className="sign-up-card">
        <div className="sign-up-header">
          <h1>Create Account</h1>
          <p className="sign-up-subtitle">Sign up to start optimizing your resume</p>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {success && (
          <div className="success-message">
            ✅ Account created! Redirecting...
          </div>
        )}

        <form onSubmit={handleSubmit} className="sign-up-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose a username"
              required
              disabled={isLoading}
            />
          </div>

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
              placeholder="At least 6 characters"
              required
              disabled={isLoading}
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              required
              disabled={isLoading}
              minLength={6}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-sign-up"
            disabled={isLoading || !username || !email || !password || !confirmPassword}
          >
            {isLoading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <div className="sign-up-footer">
          <p>
            Already have an account?{' '}
            <a href="#" onClick={(e) => { e.preventDefault(); onSwitchToSignIn && onSwitchToSignIn(); }}>
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default SignUp;

