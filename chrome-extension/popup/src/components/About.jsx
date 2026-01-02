import React from 'react';
import { Icon } from './ui/Icons';
import './About.css';

/**
 * About Page Component
 * Modern, clean design showcasing key implemented features
 */
function About({ onViewChange }) {
  const features = [
    {
      id: 'master-resume',
      title: 'Master Resume',
      description: 'Build one comprehensive resume with unlimited bullet points. Organize all your experiences, projects, and achievements in one place.',
      icon: 'edit',
      color: 'blue',
      view: 'profile',
      highlight: true
    },
    {
      id: 'generate-resume',
      title: 'AI-Powered Resume Generation',
      description: 'Automatically select and optimize the most relevant bullet points from your master resume based on job descriptions using hybrid search.',
      icon: 'sparkles',
      color: 'purple',
      view: 'generate',
      highlight: true
    },
    {
      id: 'saved-resumes',
      title: 'Save & Manage Resumes',
      description: 'Save multiple tailored resumes for different applications. Easy to update, regenerate, and manage all your resume versions.',
      icon: 'file',
      color: 'green',
      view: 'saved'
    },
    {
      id: 'ai-coach',
      title: 'AI Resume Coach',
      description: 'Get instant, intelligent feedback on your resume. Roast your bullets, get interview prep questions, and improve with AI-powered suggestions.',
      icon: 'bot',
      color: 'orange',
      view: 'coaching-ai'
    },
    {
      id: 'human-critique',
      title: 'Human Resume Critique',
      description: 'Connect with experienced reviewers for personalized feedback. Real-time collaboration with live chat and interactive comments.',
      icon: 'messageSquare',
      color: 'pink',
      view: 'coaching-human'
    },
    {
      id: 'resume-tips',
      title: 'Resume Tips & Best Practices',
      description: 'Access expert tips and best practices for resume writing. Learn how to make your resume stand out to recruiters and ATS systems.',
      icon: 'lightbulb',
      color: 'yellow',
      view: 'tips'
    }
  ];

  const handleFeatureClick = (view) => {
    if (onViewChange && view) {
      onViewChange(view);
    }
  };

  return (
    <div className="about-page-modern">
      {/* Hero Section */}
      <div className="about-hero">
        <div className="about-hero-content">
          <h1 className="about-hero-title">
            Resume Master
          </h1>
          <p className="about-hero-subtitle">
            AI-powered resume optimization for software engineers
          </p>
          <p className="about-hero-description">
            Create tailored, impactful resumes for each job application. 
            Build once, optimize infinitely.
          </p>
        </div>
      </div>

      {/* Features Grid */}
      <div className="about-features-section">
        <div className="about-section-header">
          <h2 className="about-section-title">Key Features</h2>
          <p className="about-section-description">
            Everything you need to create standout resumes
          </p>
        </div>

        <div className="features-grid-modern">
          {features.map((feature) => (
            <div
              key={feature.id}
              className={`feature-card-modern ${feature.highlight ? 'feature-highlight' : ''} feature-${feature.color}`}
              onClick={() => handleFeatureClick(feature.view)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleFeatureClick(feature.view);
                }
              }}
            >
              <div className="feature-card-header">
                <div className={`feature-icon-modern feature-icon-${feature.color}`}>
                  <Icon name={feature.icon} size={28} />
                </div>
                {feature.highlight && (
                  <span className="feature-badge">Core</span>
                )}
              </div>
              <h3 className="feature-title-modern">{feature.title}</h3>
              <p className="feature-description-modern">{feature.description}</p>
              <div className="feature-action">
                <span className="feature-action-text">Explore</span>
                <Icon name="chevronRight" size={16} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* How It Works */}
      <div className="about-how-it-works">
        <div className="about-section-header">
          <h2 className="about-section-title">How It Works</h2>
          <p className="about-section-description">
            Simple, powerful workflow to create tailored resumes
          </p>
        </div>

        <div className="how-it-works-modern">
          <div className="how-it-works-step">
            <div className="step-number">1</div>
            <div className="step-content">
              <h3 className="step-title">Build Your Master Resume</h3>
              <p className="step-description">
                Add all your work experiences, projects, education, and achievements. 
                There's no limit to how many bullet points you can include.
              </p>
            </div>
          </div>

          <div className="how-it-works-step">
            <div className="step-number">2</div>
            <div className="step-content">
              <h3 className="step-title">Provide a Job Description</h3>
              <p className="step-description">
                Extract job descriptions from job boards or paste them directly. 
                Our AI analyzes requirements using hybrid search (semantic + keyword matching).
              </p>
            </div>
          </div>

          <div className="how-it-works-step">
            <div className="step-number">3</div>
            <div className="step-content">
              <h3 className="step-title">AI Selects & Optimizes</h3>
              <p className="step-description">
                Our unified AI optimizer selects the most relevant bullet points, 
                rewrites them for better impact, and identifies skill gaps.
              </p>
            </div>
          </div>

          <div className="how-it-works-step">
            <div className="step-number">4</div>
            <div className="step-content">
              <h3 className="step-title">Get Feedback & Improve</h3>
              <p className="step-description">
                Use AI Coach for instant feedback or connect with human reviewers 
                for personalized critiques. Refine your resume with real-time collaboration.
              </p>
            </div>
          </div>

          <div className="how-it-works-step">
            <div className="step-number">5</div>
            <div className="step-content">
              <h3 className="step-title">Customize & Export</h3>
              <p className="step-description">
                Review selected points, make adjustments, and export to LaTeX format 
                for a professional, ATS-friendly resume with real-time PDF preview.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Value Proposition */}
      <div className="about-value-prop">
        <div className="value-prop-content">
          <h2 className="value-prop-title">Built for Software Engineers</h2>
          <p className="value-prop-description">
            Resume Master is specifically designed with software engineers in mind. 
            We understand the unique challenges of technical resume writing and have 
            optimized our tool to work with Jake's Resume LaTeX template, which is 
            widely recognized in the tech industry for its clean, professional format 
            that passes ATS systems while remaining human-readable.
          </p>
        </div>
      </div>
    </div>
  );
}

export default About;
