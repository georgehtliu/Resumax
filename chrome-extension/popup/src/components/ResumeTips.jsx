import React from 'react';
import { Icon } from './Icons';
import './ResumeTips.css';

/**
 * Resume Tips Component
 * Important tips for SWE resumes following Jake's Resume LaTeX template
 */
function ResumeTips() {
  const tips = [
    {
      category: 'Format & Structure',
      icon: 'file',
      items: [
        {
          title: 'Use Jake\'s Resume LaTeX Template',
          description: 'This template is ATS-friendly and widely recognized in tech. It ensures consistent formatting and proper parsing by applicant tracking systems.',
          important: true
        },
        {
          title: 'Keep It to One Page',
          description: 'For most software engineers, one page is sufficient. Only use two pages if you have 10+ years of experience with significant achievements.',
        },
        {
          title: 'Use Consistent Date Formats',
          description: 'Format dates as "Month YYYY" (e.g., "Jan 2023 - Present"). Be consistent throughout the resume.',
        },
        {
          title: 'Proper Section Ordering',
          description: 'Follow this order: Personal Info → Experience → Projects → Education → Skills. Custom sections can go after Education if needed.',
        },
      ]
    },
    {
      category: 'Bullet Points',
      icon: 'edit',
      items: [
        {
          title: 'Use Action Verbs',
          description: 'Start bullets with strong action verbs: "Built", "Designed", "Optimized", "Led", "Implemented", "Architected".',
          important: true
        },
        {
          title: 'Quantify Everything',
          description: 'Include numbers: "Improved performance by 40%", "Reduced costs by $50K", "Scaled to 10M+ requests", "Led team of 5 engineers".',
          important: true
        },
        {
          title: 'Focus on Impact, Not Just Tasks',
          description: 'Don\'t just list what you did—show the impact. "Built microservices" → "Built microservices that handled 10M+ daily requests with 99.9% uptime".',
          important: true
        },
        {
          title: '2-4 Bullets Per Experience',
          description: 'For each role, include 2-4 strong bullet points. Quality over quantity. Each bullet should demonstrate a different skill or achievement.',
        },
        {
          title: 'Use Technical Keywords',
          description: 'Include relevant technologies, frameworks, and methodologies. This helps with both ATS parsing and human reviewers.',
        },
      ]
    },
    {
      category: 'Content Strategy',
      icon: 'target',
      items: [
        {
          title: 'Tailor for Each Application',
          description: 'Use Resumax to select the most relevant bullet points for each job. Highlight experiences that match the job requirements.',
          important: true
        },
        {
          title: 'Prioritize Recent & Relevant',
          description: 'Put your most recent and relevant experiences first. If you\'re applying for a backend role, emphasize backend work.',
        },
        {
          title: 'Include Side Projects',
          description: 'Personal projects demonstrate passion and initiative. Include projects that showcase relevant technologies or solve interesting problems.',
        },
        {
          title: 'Highlight Leadership & Collaboration',
          description: 'Even for IC roles, show collaboration skills. "Collaborated with cross-functional teams", "Mentored junior engineers", etc.',
        },
      ]
    },
    {
      category: 'Technical Details',
      icon: 'laptop',
      items: [
        {
          title: 'List Relevant Technologies',
          description: 'Include programming languages, frameworks, tools, and systems you\'ve worked with. Be honest—only list what you can discuss in depth.',
        },
        {
          title: 'Show System Design Skills',
          description: 'For senior roles, include bullets about architecture, scalability, performance optimization, and system design.',
        },
        {
          title: 'Demonstrate Problem-Solving',
          description: 'Include examples of challenging problems you solved, technical decisions you made, and trade-offs you considered.',
        },
      ]
    },
    {
      category: 'Common Mistakes to Avoid',
      icon: 'warning',
      items: [
        {
          title: 'Don\'t Use Pronouns',
          description: 'Avoid "I", "we", "my". Start directly with action verbs. The resume is about you, so pronouns are redundant.',
        },
        {
          title: 'Avoid Vague Descriptions',
          description: 'Don\'t say "Worked on various projects". Be specific: "Built REST API using Python/Flask for payment processing".',
        },
        {
          title: 'Don\'t List Every Technology',
          description: 'Focus on technologies relevant to the role. A laundry list of 50+ technologies looks unfocused.',
        },
        {
          title: 'Avoid Typos & Inconsistencies',
          description: 'Proofread carefully. Typos signal lack of attention to detail. Use consistent capitalization and formatting.',
        },
        {
          title: 'Don\'t Include Irrelevant Information',
          description: 'For software engineering roles, skip hobbies, personal interests, or non-technical achievements unless they\'re truly relevant.',
        },
      ]
    },
    {
      category: 'ATS Optimization',
      icon: 'bot',
      items: [
        {
          title: 'Use Standard Section Headers',
          description: 'Use "Experience", "Education", "Projects", "Skills" as section headers. Avoid creative names that ATS might not recognize.',
        },
        {
          title: 'Include Keywords from Job Description',
          description: 'Naturally incorporate keywords from the job posting. Resumax helps identify these and match your experiences.',
        },
        {
          title: 'Avoid Complex Formatting',
          description: 'Jake\'s template uses simple, clean formatting that ATS systems can parse. Avoid tables, images, or complex layouts.',
        },
        {
          title: 'Use Standard Fonts',
          description: 'The LaTeX template uses standard fonts that are ATS-friendly. Don\'t change fonts or use decorative typefaces.',
        },
      ]
    },
  ];

  return (
    <div className="resume-tips-page">
      <div className="tips-header">
        <h1>Resume Tips for Software Engineers</h1>
        <p className="tips-subtitle">
          Best practices for creating effective SWE resumes using Jake's Resume LaTeX template
        </p>
      </div>

      <div className="tips-content">
        {tips.map((category, categoryIndex) => (
          <section key={categoryIndex} className="tips-category">
            <div className="category-header">
              <span className="category-icon">
                <Icon name={category.icon} size={24} />
              </span>
              <h2>{category.category}</h2>
            </div>
            <div className="tips-list">
              {category.items.map((tip, tipIndex) => (
                <div 
                  key={tipIndex} 
                  className={`tip-item ${tip.important ? 'important' : ''}`}
                >
                  <div className="tip-header">
                    <h3>{tip.title}</h3>
                    {tip.important && <span className="important-badge">Important</span>}
                  </div>
                  <p className="tip-description">{tip.description}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="tips-footer">
        <div className="footer-note">
          <Icon name="lightbulb" size={18} style={{ marginRight: '6px', verticalAlign: 'middle', display: 'inline-block' }} />
          <strong>Pro Tip:</strong> Use Resumax to maintain a comprehensive master resume with all your achievements, 
          then automatically select the most relevant points for each job application. This ensures you never miss 
          highlighting the right experience for the right role.
        </div>
      </div>
    </div>
  );
}

export default ResumeTips;

