import React from 'react';
import { Icon } from './ui/Icons';
import './About.css';

/**
 * About Page Component
 * Describes what Resumax is about
 */
function About() {
  return (
    <div className="about-page">
      <div className="about-header">
        <h1>About Resumax</h1>
        <p className="about-subtitle">AI-Powered Resume Optimization for Software Engineers</p>
      </div>

      <div className="about-content">
        <section className="about-section">
          <h2>What is Resumax?</h2>
          <p>
            Resumax is an AI-powered Chrome extension designed to help software engineers create 
            tailored resumes for specific job applications. Instead of maintaining multiple resume 
            versions, Resumax lets you build a comprehensive master resume with all your experiences, 
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
              <p>Automatically select the most relevant bullet points from your master resume based on job descriptions.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <Icon name="target" size={32} />
              </div>
              <h3>Job Matching</h3>
              <p>Extract job descriptions directly from job boards or paste them in. Get instant matching recommendations.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <Icon name="file" size={32} />
              </div>
              <h3>LaTeX Export</h3>
              <p>Generate beautiful, ATS-friendly resumes using Jake's Resume LaTeX template. Perfect for technical roles.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <Icon name="save" size={32} />
              </div>
              <h3>Save & Manage</h3>
              <p>Save multiple tailored resumes for different applications. Easy to update and regenerate.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <Icon name="lock" size={32} />
              </div>
              <h3>Secure & Private</h3>
              <p>Your data is stored securely. Sign in with Google OAuth for seamless access across devices.</p>
            </div>
          </div>
        </section>

        <section className="about-section">
          <h2>How It Works</h2>
          <ol className="how-it-works">
            <li>
              <strong>Build Your Master Resume</strong>
              <p>Add all your work experiences, projects, education, and achievements. There's no limit to how many bullet points you can include.</p>
            </li>
            <li>
              <strong>Provide a Job Description</strong>
              <p>Extract job descriptions from job boards or paste them directly. Resumax analyzes the requirements and keywords.</p>
            </li>
            <li>
              <strong>AI Selects Best Matches</strong>
              <p>Our AI algorithm selects the most relevant bullet points from your master resume that match the job requirements.</p>
            </li>
            <li>
              <strong>Customize & Export</strong>
              <p>Review the selected points, make adjustments, and export to LaTeX format for a professional, ATS-friendly resume.</p>
            </li>
          </ol>
        </section>

        <section className="about-section">
          <h2>Built for Software Engineers</h2>
          <p>
            Resumax is specifically designed with software engineers in mind. We understand the unique 
            challenges of technical resume writing and have optimized our tool to work with Jake's Resume 
            LaTeX template, which is widely recognized in the tech industry for its clean, professional 
            format that passes ATS (Applicant Tracking Systems) while remaining human-readable.
          </p>
        </section>
      </div>
    </div>
  );
}

export default About;

