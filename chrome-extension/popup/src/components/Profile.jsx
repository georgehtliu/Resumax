import React, { useState, useEffect, useRef } from 'react';
import ExperienceEditor from './ExperienceEditor';
import EducationEditor from './EducationEditor';
import ProjectEditor from './ProjectEditor';
import CustomSectionEditor from './CustomSectionEditor';
import PersonalInfoEditor from './PersonalInfoEditor';
import SkillsEditor from './SkillsEditor';
import Tabs from './Tabs';
import AutoSaveIndicator from './AutoSaveIndicator';
import { storageService } from '../services/storage';
import { Icon } from './Icons';
import './Profile.css';

/**
 * Profile Component
 * Contains master resume points and editing
 */
function Profile({ resume, onResumeUpdate, calculateTotalBullets }) {
  // onResumeUpdate signature: (updatedResume, showNotification = true)
  const tabs = [
    { id: 'personal', label: 'Personal Info' },
    { id: 'experiences', label: 'Experiences' },
    { id: 'education', label: 'Education' },
    { id: 'projects', label: 'Projects' },
    { id: 'skills', label: 'Skills' },
    { id: 'custom', label: 'Custom Sections' },
  ];

  const [activeTab, setActiveTab] = React.useState('personal');
  const [saveStatus, setSaveStatus] = useState('idle');
  const saveTimeoutRef = useRef(null);
  const isInitialMount = useRef(true);
  const previousResumeRef = useRef(resume);

  // Auto-save on resume update (skip on initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      previousResumeRef.current = JSON.stringify(resume);
      return;
    }

    const currentResumeStr = JSON.stringify(resume);
    
    // Check if resume actually changed
    if (previousResumeRef.current === currentResumeStr) {
      return;
    }

    previousResumeRef.current = currentResumeStr;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Only auto-save if resume has actual content
    const hasContent = resume.experiences?.length > 0 || 
                      resume.education?.length > 0 || 
                      resume.projects?.length > 0 ||
                      (resume.personalInfo?.firstName && resume.personalInfo?.lastName);

    if (hasContent) {
      setSaveStatus('saving');
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          // Save directly to storage without triggering state update
          const totalBullets = calculateTotalBullets(resume);
          const normalized = {
            personalInfo: resume.personalInfo || {
              firstName: '',
              lastName: '',
              email: '',
              phone: '',
              linkedin: '',
              github: ''
            },
            skills: Array.isArray(resume.skills) ? resume.skills : [],
            experiences: Array.isArray(resume.experiences) ? resume.experiences : [],
            education: Array.isArray(resume.education) ? resume.education : [],
            projects: Array.isArray(resume.projects) ? resume.projects : [],
            customSections: Array.isArray(resume.customSections) ? resume.customSections : [],
            totalBullets
          };
          await storageService.saveResume(normalized);
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (error) {
          console.error('Auto-save error:', error);
          setSaveStatus('error');
          setTimeout(() => setSaveStatus('idle'), 3000);
        }
      }, 1000); // Debounce: save 1 second after last change
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [resume, calculateTotalBullets]);

  const handleImportResume = async () => {
    // Load Waterloo student mock data with 8 internships and 3 projects
    const mockMasterResume = {
      personalInfo: {
        firstName: 'Alex',
        lastName: 'Chen',
        email: 'alex.chen@uwaterloo.ca',
        phone: '+1 (519) 888-4567',
        linkedin: 'linkedin.com/in/alexchen',
        github: 'github.com/alexchen'
      },
      skills: [
        {
          id: 'skill-1',
          title: 'Languages',
          skills: ['Python', 'JavaScript', 'TypeScript', 'Go', 'Java', 'C++', 'SQL', 'Bash', 'Ruby']
        },
        {
          id: 'skill-2',
          title: 'Frontend',
          skills: ['React', 'Redux', 'Next.js', 'HTML5', 'CSS3', 'WebSocket', 'WebRTC', 'D3.js']
        },
        {
          id: 'skill-3',
          title: 'Backend',
          skills: ['Node.js', 'Express', 'Django', 'Spring Boot', 'Ruby on Rails', 'GraphQL', 'gRPC', 'REST APIs']
        },
        {
          id: 'skill-4',
          title: 'Databases',
          skills: ['PostgreSQL', 'MongoDB', 'Redis', 'DynamoDB', 'Elasticsearch']
        },
        {
          id: 'skill-5',
          title: 'Cloud & DevOps',
          skills: ['Docker', 'Kubernetes', 'Jenkins', 'AWS', 'CI/CD', 'Terraform']
        },
        {
          id: 'skill-6',
          title: 'Tools',
          skills: ['Git', 'GitHub', 'Jira', 'Confluence', 'Prometheus', 'Grafana', 'Splunk', 'Datadog']
        }
      ],
      experiences: [
        {
          id: 'exp-1',
          company: 'Google',
          role: 'Software Engineering Intern',
          startDate: 'Sep 2023',
          endDate: 'Dec 2023',
          bullets: [
            { id: 'bullet-1', text: 'Scaled Go/Python microservices for 10M+ daily requests while keeping uptime at 99.9%' },
            { id: 'bullet-2', text: 'Optimized database queries and caching strategies, reducing API response time by 40% and saving $50K annually in infrastructure costs through smarter resource allocation' },
            { id: 'bullet-3', text: 'Built CI/CD pipelines using Jenkins, Docker, and Kubernetes, cutting deploy time 60%' },
            { id: 'bullet-4', text: 'Designed RESTful and gRPC APIs serving 5M+ requests daily with sub-100ms latency, improving mobile app performance by 30% and reducing user-reported errors' },
            { id: 'bullet-5', text: 'Led code reviews and mentored two interns, improving code quality and team velocity' },
            { id: 'bullet-6', text: 'Implemented distributed tracing and monitoring using Prometheus and Grafana, enabling faster debugging and reducing incident resolution time by 45% across all microservices' }
          ]
        },
        {
          id: 'exp-2',
          company: 'Meta',
          role: 'Software Engineering Intern',
          startDate: 'May 2023',
          endDate: 'Aug 2023',
          bullets: [
            { id: 'bullet-5', text: 'Built React components for Facebook Marketplace improving accessibility and mobile responsiveness' },
            { id: 'bullet-6', text: 'Implemented real-time notification system using WebSocket connections and Redis, reducing latency by 30% and improving user engagement metrics by 25% through faster updates' },
            { id: 'bullet-7', text: 'Optimized GraphQL API endpoints and data fetching strategies, reducing server load by 25%' },
            { id: 'bullet-8', text: 'Developed A/B testing framework for feature rollouts, enabling data-driven product decisions and reducing risk of regressions while increasing experiment velocity by 40%' },
            { id: 'bullet-9', text: 'Shipped WCAG AA compliant UI components that increased conversion rate by 15%' },
            { id: 'bullet-10', text: 'Created automated screenshot testing suite reducing regression bugs by 50% and improving release confidence' }
          ]
        },
        {
          id: 'exp-3',
          company: 'Amazon Web Services',
          role: 'Software Development Engineer Intern',
          startDate: 'Sep 2022',
          endDate: 'Dec 2022',
          bullets: [
            { id: 'bullet-11', text: 'Developed internal tools using Java and Spring Boot to automate deployment processes' },
            { id: 'bullet-12', text: 'Built monitoring and alerting system for AWS services using CloudWatch and Lambda, improving incident detection time by 50% and reducing on-call burden through smarter alert routing' },
            { id: 'bullet-13', text: 'Optimized database queries and implemented caching layer using DynamoDB and ElastiCache' },
            { id: 'bullet-14', text: 'Reduced query latency by 35% through query optimization and strategic cache placement, saving $20K monthly in database costs and improving user experience' },
            { id: 'bullet-15', text: 'Containerized legacy batch jobs onto Fargate, lowering ops overhead by 60%' },
            { id: 'bullet-16', text: 'Implemented blue/green deployment strategy eliminating release downtime and reducing rollback time from 30 minutes to under 5 minutes' }
          ]
        },
        {
          id: 'exp-4',
          company: 'Shopify',
          role: 'Backend Developer Intern',
          startDate: 'Jan 2022',
          endDate: 'Apr 2022',
          bullets: [
            { id: 'bullet-17', text: 'Built scalable payment processing system using Ruby on Rails and PostgreSQL' },
            { id: 'bullet-18', text: 'Handled 1M+ transactions daily with 99.99% reliability through robust error handling and transaction retry logic, ensuring merchant payment success rates exceeded industry standards' },
            { id: 'bullet-19', text: 'Implemented distributed caching solution using Redis Cluster, reducing database load by 60%' },
            { id: 'bullet-20', text: 'Improved response times by 45% through strategic cache placement and smart invalidation strategies, directly improving merchant dashboard load times and user satisfaction' },
            { id: 'bullet-21', text: 'Developed RESTful APIs for merchant dashboard enabling real-time analytics for 100K+ merchants' },
            { id: 'bullet-22', text: 'Built fraud detection integration reducing fraudulent transactions by 30% and saving merchants $500K in chargebacks' }
          ]
        },
        {
          id: 'exp-5',
          company: 'Microsoft',
          role: 'Software Engineering Intern',
          startDate: 'May 2021',
          endDate: 'Aug 2021',
          bullets: [
            { id: 'bullet-23', text: 'Contributed to Azure cloud services development using C# and .NET' },
            { id: 'bullet-24', text: 'Implemented features used by millions of enterprise customers, improving service reliability by 20% and reducing support tickets through better error handling and user feedback loops' },
            { id: 'bullet-25', text: 'Built automated testing framework reducing manual QA time by 50%' },
            { id: 'bullet-26', text: 'Increased test coverage from 60% to 85% through comprehensive unit and integration tests, catching 40% more bugs before production and reducing hotfix deployments' },
            { id: 'bullet-27', text: 'Optimized SQL queries and database schema design, improving query performance by 40%' },
            { id: 'bullet-28', text: 'Reduced storage costs by 25% through intelligent data partitioning and archival strategies, saving the team $100K annually in infrastructure expenses' }
          ]
        },
        {
          id: 'exp-6',
          company: 'Stripe',
          role: 'Software Engineering Intern',
          startDate: 'Sep 2020',
          endDate: 'Dec 2020',
          bullets: [
            { id: 'bullet-29', text: 'Developed fraud detection algorithms using machine learning models' },
            { id: 'bullet-30', text: 'Reduced false positives by 30% and improved detection accuracy through feature engineering and model tuning, preventing $2M in fraudulent transactions while maintaining low false positive rates' },
            { id: 'bullet-31', text: 'Built real-time payment processing pipeline using Kafka and microservices architecture' },
            { id: 'bullet-32', text: 'Handled 10K+ transactions per second with sub-100ms latency through optimized message queuing and parallel processing, ensuring seamless payment experiences during peak traffic' },
            { id: 'bullet-33', text: 'Implemented comprehensive logging and monitoring using Datadog and ELK stack' },
            { id: 'bullet-34', text: 'Improved debugging efficiency by 50% through structured logging and custom dashboards, reducing incident resolution time and enabling faster feature development' }
          ]
        },
        {
          id: 'exp-7',
          company: 'Palantir',
          role: 'Software Engineering Intern',
          startDate: 'Jan 2020',
          endDate: 'Apr 2020',
          bullets: [
            { id: 'bullet-35', text: 'Built data visualization dashboard using React and D3.js' },
            { id: 'bullet-36', text: 'Enabled analysts to process and visualize large-scale datasets efficiently, reducing analysis time from hours to minutes and improving decision-making through interactive visualizations' },
            { id: 'bullet-37', text: 'Developed ETL pipelines using Python and Apache Spark, processing terabytes of data daily' },
            { id: 'bullet-38', text: 'Achieved 99.9% reliability through robust error handling and automated retry mechanisms, ensuring data consistency and minimizing manual intervention in data processing workflows' },
            { id: 'bullet-39', text: 'Implemented distributed data processing system using Kubernetes' },
            { id: 'bullet-40', text: 'Scaled to handle 100x data volume increases through horizontal scaling and optimized resource allocation, supporting business growth without proportional infrastructure costs' }
          ]
        },
        {
          id: 'exp-8',
          company: 'RBC',
          role: 'Software Developer Intern',
          startDate: 'May 2019',
          endDate: 'Aug 2019',
          bullets: [
            { id: 'bullet-41', text: 'Developed banking APIs using Java and Spring Framework, ensuring PCI-DSS compliance' },
            { id: 'bullet-42', text: 'Handled sensitive financial data with zero security breaches through encryption, access controls, and comprehensive audit logging, passing all security audits with full compliance' },
            { id: 'bullet-43', text: 'Built automated testing suite using JUnit and Mockito, increasing code coverage from 45% to 80%' },
            { id: 'bullet-44', text: 'Reduced production bugs by 60% through comprehensive test coverage and integration testing, improving system stability and reducing emergency hotfix deployments' },
            { id: 'bullet-45', text: 'Collaborated with cross-functional teams to deliver mobile banking features' },
            { id: 'bullet-46', text: 'Improved user satisfaction scores by 25% through iterative design improvements and faster feature delivery, directly impacting customer retention and app store ratings' }
          ]
        }
      ],
      education: [
        {
          id: 'edu-1',
          school: 'University of Waterloo',
          degree: 'B.S.',
          field: 'Computer Science',
          startDate: 'Sep 2018',
          endDate: 'Apr 2024',
          bullets: [
            { id: 'bullet-27', text: 'GPA: 3.9/4.0, Dean\'s Honour List, Co-op Program' },
            { id: 'bullet-28', text: 'Relevant Coursework: Algorithms & Data Structures, Machine Learning, Distributed Systems, Database Systems, Computer Networks, Operating Systems' },
            { id: 'bullet-29', text: 'Teaching Assistant for CS341 (Algorithms) - graded assignments and held office hours for 80+ students' },
            { id: 'bullet-30', text: 'Research Assistant in Systems Lab - worked on distributed systems optimization and performance analysis' }
          ]
        }
      ],
      projects: [
        {
          id: 'proj-1',
          name: 'Distributed Task Scheduler',
          description: 'High-performance distributed task scheduling system with fault tolerance',
          technologies: 'Go, Kubernetes, Redis, PostgreSQL, gRPC',
          startDate: 'Jan 2023',
          endDate: 'Apr 2023',
          bullets: [
            { id: 'bullet-31', text: 'Built scalable task scheduler handling 100K+ concurrent tasks using Go and Kubernetes, achieving 99.95% reliability' },
            { id: 'bullet-32', text: 'Implemented distributed consensus algorithm using Raft protocol for leader election and task coordination across nodes' },
            { id: 'bullet-33', text: 'Designed fault-tolerant architecture with automatic failover and task replication, ensuring zero data loss during node failures' },
            { id: 'bullet-34', text: 'Created monitoring dashboard using Prometheus and Grafana, enabling real-time visibility into system performance and health' }
          ]
        },
        {
          id: 'proj-2',
          name: 'E-commerce Platform',
          description: 'Full-stack e-commerce platform with payment integration and inventory management',
          technologies: 'React, Node.js, Express, PostgreSQL, Stripe API, AWS',
          startDate: 'Sep 2021',
          endDate: 'Dec 2021',
          bullets: [
            { id: 'bullet-35', text: 'Built scalable web application supporting 1000+ concurrent users with real-time inventory updates and order processing' },
            { id: 'bullet-36', text: 'Integrated Stripe payment processing handling $50K+ in transactions with PCI compliance and fraud detection' },
            { id: 'bullet-37', text: 'Implemented JWT-based authentication and authorization with role-based access control for admin and customer roles' },
            { id: 'bullet-38', text: 'Deployed on AWS using EC2, RDS, S3, and CloudFront with automated backup, monitoring, and auto-scaling capabilities' }
          ]
        },
        {
          id: 'proj-3',
          name: 'Real-time Chat Application',
          description: 'Scalable real-time messaging platform with end-to-end encryption',
          technologies: 'React, Node.js, Socket.io, MongoDB, Redis, Docker',
          startDate: 'May 2022',
          endDate: 'Aug 2022',
          bullets: [
            { id: 'bullet-39', text: 'Built real-time chat application supporting 10K+ concurrent users with WebSocket connections and message queuing' },
            { id: 'bullet-40', text: 'Implemented end-to-end encryption using RSA and AES algorithms, ensuring secure message transmission' },
            { id: 'bullet-41', text: 'Designed microservices architecture with message broker using Redis, achieving sub-100ms message delivery latency' },
            { id: 'bullet-42', text: 'Deployed using Docker containers and Kubernetes orchestration, enabling horizontal scaling and high availability' }
          ]
        }
      ],
      customSections: [
        {
          id: 'custom-2',
          title: 'Awards & Recognition',
          subtitle: '',
          bullets: [
            { id: 'bullet-50', text: 'Google Hackathon Winner - Best Technical Implementation (2023) - Built AI-powered code review tool' },
            { id: 'bullet-51', text: 'University of Waterloo Engineering Excellence Award (2022) - Top 5% of Computer Science graduating class' }
          ]
        }
      ]
    };

    // Save to storage and update the resume
    await storageService.saveResume(mockMasterResume);
    onResumeUpdate(mockMasterResume);
  };

  return (
    <div className="profile-page">
      <div className="profile-header sticky-header">
        <div className="profile-header-content">
          <div>
            <h1>Profile</h1>
            <p className="profile-subtitle">Manage your master resume points</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <AutoSaveIndicator status={saveStatus} />
            <button 
              className="btn-import-resume"
              onClick={handleImportResume}
              title="Import from existing resume"
            >
              <Icon name="download" size={18} />
              Import from Resume
            </button>
          </div>
        </div>
      </div>

      <div className="profile-content">
        <div className="profile-tabs">
          <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        <div className="profile-editor">
          {activeTab === 'personal' && (
            <PersonalInfoEditor
              value={resume.personalInfo}
              onChange={(updatedInfo) => {
                onResumeUpdate({
                  ...resume,
                  personalInfo: updatedInfo
                });
              }}
            />
          )}

          {activeTab === 'experiences' && (
            <div>
              {(!resume.experiences || resume.experiences.length === 0) ? (
                <div className="empty-state">
                  <p>No experiences yet. Add your first work experience!</p>
                </div>
              ) : (
                resume.experiences.map(experience => (
                  <ExperienceEditor
                    key={experience.id}
                    experience={experience}
                    onUpdate={(updatedExp) => {
                      const updated = resume.experiences.map(exp =>
                        exp.id === updatedExp.id ? updatedExp : exp
                      );
                      const totalBullets = calculateTotalBullets({
                        ...resume,
                        experiences: updated
                      });
                      onResumeUpdate({
                        ...resume,
                        experiences: updated,
                        totalBullets
                      });
                    }}
                    onDelete={(expId) => {
                      const updated = resume.experiences.filter(exp => exp.id !== expId);
                      const totalBullets = calculateTotalBullets({
                        ...resume,
                        experiences: updated
                      });
                      onResumeUpdate({
                        ...resume,
                        experiences: updated,
                        totalBullets
                      });
                    }}
                  />
                ))
              )}
              <button
                className="btn btn-primary btn-add"
                onClick={() => {
                  const newExp = {
                    id: `exp-${Date.now()}`,
                    company: '',
                    role: '',
                    startDate: '',
                    endDate: '',
                    bullets: []
                  };
                  onResumeUpdate({
                    ...resume,
                    experiences: [...resume.experiences, newExp]
                  });
                }}
                style={{ marginTop: '16px' }}
              >
                + Add Experience
              </button>
            </div>
          )}

          {activeTab === 'education' && (
            <div>
              {(!resume.education || resume.education.length === 0) ? (
                <div className="empty-state">
                  <p>No education entries yet. Add your first education!</p>
                </div>
              ) : (
                resume.education.map(edu => (
                  <EducationEditor
                    key={edu.id}
                    education={edu}
                    onUpdate={(updatedEdu) => {
                      const updated = resume.education.map(e =>
                        e.id === updatedEdu.id ? updatedEdu : e
                      );
                      onResumeUpdate({ ...resume, education: updated });
                    }}
                    onDelete={(eduId) => {
                      onResumeUpdate({
                        ...resume,
                        education: resume.education.filter(e => e.id !== eduId)
                      });
                    }}
                  />
                ))
              )}
              <button
                className="btn btn-primary btn-add"
                onClick={() => {
                  const newEdu = {
                    id: `edu-${Date.now()}`,
                    school: '',
                    degree: '',
                    field: '',
                    startDate: '',
                    endDate: '',
                    bullets: []
                  };
                  onResumeUpdate({
                    ...resume,
                    education: [...resume.education, newEdu]
                  });
                }}
                style={{ marginTop: '16px' }}
              >
                + Add Education
              </button>
            </div>
          )}

          {activeTab === 'projects' && (
            <div>
              {(!resume.projects || resume.projects.length === 0) ? (
                <div className="empty-state">
                  <p>No projects yet. Add your first project!</p>
                </div>
              ) : (
                resume.projects.map(project => (
                  <ProjectEditor
                    key={project.id}
                    project={project}
                    onUpdate={(updatedProj) => {
                      const updated = resume.projects.map(p =>
                        p.id === updatedProj.id ? updatedProj : p
                      );
                      onResumeUpdate({ ...resume, projects: updated });
                    }}
                    onDelete={(projId) => {
                      onResumeUpdate({
                        ...resume,
                        projects: resume.projects.filter(p => p.id !== projId)
                      });
                    }}
                  />
                ))
              )}
              <button
                className="btn btn-primary btn-add"
                onClick={() => {
                  const newProj = {
                    id: `proj-${Date.now()}`,
                    name: '',
                    description: '',
                    technologies: '',
                    startDate: '',
                    endDate: '',
                    bullets: []
                  };
                  onResumeUpdate({
                    ...resume,
                    projects: [...resume.projects, newProj]
                  });
                }}
                style={{ marginTop: '16px' }}
              >
                + Add Project
              </button>
            </div>
          )}

          {activeTab === 'skills' && (
            <SkillsEditor
              skills={resume.skills}
              onChange={(updatedSkills) => onResumeUpdate({ ...resume, skills: updatedSkills })}
            />
          )}

          {activeTab === 'custom' && (
            <div>
              {(!resume.customSections || resume.customSections.length === 0) ? (
                <div className="empty-state">
                  <p>No custom sections yet. Add certifications, skills, awards, etc.!</p>
                </div>
              ) : (
                resume.customSections.map(section => (
                  <CustomSectionEditor
                    key={section.id}
                    section={section}
                    onUpdate={(updatedSection) => {
                      const updated = resume.customSections.map(s =>
                        s.id === updatedSection.id ? updatedSection : s
                      );
                      onResumeUpdate({ ...resume, customSections: updated });
                    }}
                    onDelete={(sectionId) => {
                      onResumeUpdate({
                        ...resume,
                        customSections: resume.customSections.filter(s => s.id !== sectionId)
                      });
                    }}
                  />
                ))
              )}
              <button
                className="btn btn-primary btn-add"
                onClick={() => {
                  const newSection = {
                    id: `custom-${Date.now()}`,
                    title: '',
                    subtitle: '',
                    bullets: []
                  };
                  onResumeUpdate({
                    ...resume,
                    customSections: [...resume.customSections, newSection]
                  });
                }}
                style={{ marginTop: '16px' }}
              >
                + Add Custom Section
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Profile;

