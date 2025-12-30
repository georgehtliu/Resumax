import React from 'react';
import { Icon } from './ui/Icons';
import './About.css';

/**
 * About Page Component
 * Describes what Resume Master is about
 */
function About() {
  return (
    <div className="about-page">
      <div className="about-header">
        <h1>About Resume Master</h1>
        <p className="about-subtitle">AI-Powered Resume Optimization for Software Engineers</p>
      </div>

      <div className="about-content">
        <section className="about-section">
          <h2>What is Resume Master?</h2>
          <p>
            Resume Master is an AI-powered Chrome extension designed to help software engineers create 
            tailored resumes for specific job applications. Instead of maintaining multiple resume 
            versions, Resume Master lets you build a comprehensive master resume with all your experiences, 
            projects, and achievements, then intelligently selects and optimizes the most relevant 
            points for each job description.
          </p>
        </section>

        <section className="about-section">
          <h2>Key Features</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <Icon name="edit" size={32} />
              </div>
              <h3>Master Resume</h3>
              <p>Build one comprehensive resume with unlimited bullet points per experience. Never lose track of your achievements.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <Icon name="sparkles" size={32} />
              </div>
              <h3>AI-Powered Selection</h3>
              <p>Automatically select the most relevant bullet points from your master resume based on job descriptions using hybrid search (semantic + keyword matching).</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <Icon name="target" size={32} />
              </div>
              <h3>Smart Job Matching</h3>
              <p>Extract job descriptions directly from job boards or paste them in. Get instant matching recommendations with 300+ tech keyword patterns.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <Icon name="bot" size={32} />
              </div>
              <h3>AI Resume Coach</h3>
              <p>Get instant AI-powered feedback on your resume. Improve your bullet points with intelligent suggestions and gap analysis.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <Icon name="messageSquare" size={32} />
              </div>
              <h3>Human Resume Critique</h3>
              <p>Connect with experienced reviewers for personalized feedback. Real-time collaboration with live chat, highlighting, and comments.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <Icon name="wifi" size={32} />
              </div>
              <h3>Real-Time Collaboration</h3>
              <p>Queue-based matching system connects reviewers and reviewees instantly. Live highlighting, commenting, and messaging for seamless resume reviews.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <Icon name="file" size={32} />
              </div>
              <h3>LaTeX Export</h3>
              <p>Generate beautiful, ATS-friendly resumes using Jake's Resume LaTeX template. Perfect for technical roles with real-time PDF preview.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <Icon name="share" size={32} />
              </div>
              <h3>Resume Sharing</h3>
              <p>Share your resumes with permanent links. Interactive PDF viewer with visual markers and comment system for collaborative feedback.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <Icon name="users" size={32} />
              </div>
              <h3>Community</h3>
              <p>Join a community of software engineers. Share tips, browse shared resumes, and learn from others' experiences.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <Icon name="save" size={32} />
              </div>
              <h3>Save & Manage</h3>
              <p>Save multiple tailored resumes for different applications. Easy to update and regenerate with carousel-style editing.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <Icon name="lightbulb" size={32} />
              </div>
              <h3>Resume Tips</h3>
              <p>Access expert tips and best practices for resume writing. Learn how to make your resume stand out to recruiters.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <Icon name="lock" size={32} />
              </div>
              <h3>Secure & Private</h3>
              <p>Your data is stored securely. Sign in with Google OAuth for seamless access across devices with encrypted storage.</p>
            </div>
          </div>
        </section>

        <section className="about-section">
          <h2>How It Works</h2>
          <ol className="how-it-works">
            <li>
              <strong>Build Your Master Resume</strong>
              <p>Add all your work experiences, projects, education, and achievements. There's no limit to how many bullet points you can include. Organize everything in one place.</p>
            </li>
            <li>
              <strong>Provide a Job Description</strong>
              <p>Extract job descriptions from job boards or paste them directly. Resume Master uses hybrid search (semantic + keyword matching) to analyze requirements and match 300+ tech patterns.</p>
            </li>
            <li>
              <strong>AI Selects & Optimizes</strong>
              <p>Our unified AI optimizer selects the most relevant bullet points, rewrites them for better impact, and identifies skill gaps—all in a single efficient call.</p>
            </li>
            <li>
              <strong>Get Feedback & Improve</strong>
              <p>Use AI Coach for instant feedback or connect with human reviewers for personalized critiques. Real-time collaboration helps you refine your resume.</p>
            </li>
            <li>
              <strong>Customize & Export</strong>
              <p>Review selected points, make adjustments using the carousel editor, and export to LaTeX format for a professional, ATS-friendly resume with real-time PDF preview.</p>
            </li>
            <li>
              <strong>Share & Collaborate</strong>
              <p>Generate shareable links for your resumes. Reviewers can add comments and highlights, helping you iterate and improve your resume continuously.</p>
            </li>
          </ol>
        </section>

        <section className="about-section">
          <h2>Built for Software Engineers</h2>
          <p>
            Resume Master is specifically designed with software engineers in mind. We understand the unique 
            challenges of technical resume writing and have optimized our tool to work with Jake's Resume 
            LaTeX template, which is widely recognized in the tech industry for its clean, professional 
            format that passes ATS (Applicant Tracking Systems) while remaining human-readable.
          </p>
        </section>

        <section className="about-section">
          <h2>Resume Coaching</h2>
          <div className="coaching-features">
            <div className="coaching-feature">
              <div className="coaching-icon">
                <Icon name="bot" size={24} />
              </div>
              <div>
                <h3>AI Coach</h3>
                <p>Get instant, intelligent feedback on your resume. Our AI analyzes your bullet points, suggests improvements, identifies gaps, and helps you craft more impactful descriptions—all in real-time.</p>
              </div>
            </div>
            <div className="coaching-feature">
              <div className="coaching-icon">
                <Icon name="messageSquare" size={24} />
              </div>
              <div>
                <h3>Human Critique</h3>
                <p>Connect with experienced professionals for personalized resume reviews. Join our queue-based matching system to get paired with reviewers. Collaborate in real-time with live chat, interactive highlighting, and contextual comments on specific bullet points.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default About;

