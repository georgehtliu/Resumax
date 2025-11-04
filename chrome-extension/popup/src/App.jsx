import React, { useState, useEffect } from 'react';
import ExperienceEditor from './components/ExperienceEditor';
import EducationEditor from './components/EducationEditor';
import ProjectEditor from './components/ProjectEditor';
import CustomSectionEditor from './components/CustomSectionEditor';
import Tabs from './components/Tabs';
import GenerateResume from './components/GenerateResume';
import SavedResumes from './components/SavedResumes';
import { storageService } from './services/storage';
import './App.css';

/**
 * Main App Component
 * 
 * State Management:
 * - Resume data (experiences, bullets)
 * - Current job description
 * - Optimization results
 */
function App() {
  const [activeTab, setActiveTab] = useState('master');
  const [refreshSaved, setRefreshSaved] = useState(0);
  const [resume, setResume] = useState({
    experiences: [],
    education: [],
    projects: [],
    customSections: [],
    totalBullets: 0
  });

  // Load resume data on mount and initialize mock data if needed
  useEffect(() => {
    async function init() {
      await initializeMockData();
      await loadResumeData();
    }
    init();
  }, []);

  /**
   * Initialize mock data if no data exists
   */
  async function initializeMockData() {
    try {
      const existingResume = await storageService.getResume();
      const savedResumes = await storageService.getSavedResumes();
      
      // Only initialize if no data exists
      if (existingResume.totalBullets === 0 && savedResumes.length === 0) {
        // Initialize master resume with mock data
        const mockMasterResume = {
          experiences: [
            {
              id: 'exp-1',
              company: 'Google',
              role: 'Software Engineer',
              startDate: '2022',
              endDate: 'Present',
              bullets: [
                { id: 'bullet-1', text: 'Developed and maintained microservices handling 10M+ daily requests using Python and Kubernetes' },
                { id: 'bullet-2', text: 'Optimized database queries reducing API response time by 40% and improving user experience' },
                { id: 'bullet-3', text: 'Led a team of 3 engineers to ship a new feature that increased user engagement by 25%' },
                { id: 'bullet-4', text: 'Implemented CI/CD pipelines using Jenkins and Docker, reducing deployment time by 60%' },
                { id: 'bullet-5', text: 'Designed and built RESTful APIs serving 5M+ requests per day with 99.9% uptime' },
                { id: 'bullet-6', text: 'Collaborated with product managers and designers to define technical requirements for new features' }
              ]
            },
            {
              id: 'exp-2',
              company: 'Meta',
              role: 'Software Engineering Intern',
              startDate: '2021',
              endDate: '2021',
              bullets: [
                { id: 'bullet-7', text: 'Built React components for Facebook Marketplace improving user interface and accessibility' },
                { id: 'bullet-8', text: 'Implemented real-time notifications using WebSocket connections reducing latency by 30%' },
                { id: 'bullet-9', text: 'Worked on GraphQL API endpoints optimizing data fetching and reducing server load' },
                { id: 'bullet-10', text: 'Participated in code reviews and contributed to team best practices documentation' }
              ]
            }
          ],
          education: [
            {
              id: 'edu-1',
              school: 'Stanford University',
              degree: 'B.S.',
              field: 'Computer Science',
              startDate: '2018',
              endDate: '2022',
              bullets: [
                { id: 'bullet-11', text: 'GPA: 3.9/4.0, Magna Cum Laude' },
                { id: 'bullet-12', text: 'Relevant Coursework: Algorithms, Data Structures, Machine Learning, Distributed Systems' },
                { id: 'bullet-13', text: 'Dean\'s List: Fall 2019, Spring 2020, Fall 2020, Spring 2021' }
              ]
            }
          ],
          projects: [
            {
              id: 'proj-1',
              name: 'E-commerce Platform',
              description: 'Full-stack e-commerce platform with payment integration',
              technologies: 'React, Node.js, PostgreSQL, Stripe API',
              startDate: '2020',
              endDate: '2021',
              bullets: [
                { id: 'bullet-14', text: 'Built scalable web application supporting 1000+ concurrent users with real-time inventory updates' },
                { id: 'bullet-15', text: 'Integrated Stripe payment processing handling $50K+ in transactions' },
                { id: 'bullet-16', text: 'Implemented user authentication and authorization using JWT tokens' },
                { id: 'bullet-17', text: 'Deployed on AWS using EC2 and RDS with automated backup and monitoring' }
              ]
            },
            {
              id: 'proj-2',
              name: 'Machine Learning Recommender System',
              description: 'Content-based recommendation engine for streaming platform',
              technologies: 'Python, TensorFlow, Scikit-learn, Flask',
              startDate: '2021',
              endDate: '2021',
              bullets: [
                { id: 'bullet-18', text: 'Trained neural network model achieving 85% accuracy in content recommendations' },
                { id: 'bullet-19', text: 'Processed and cleaned dataset of 1M+ user interactions using pandas and numpy' },
                { id: 'bullet-20', text: 'Created REST API serving recommendations with average response time of 50ms' }
              ]
            }
          ],
          customSections: [
            {
              id: 'custom-1',
              title: 'Technical Skills',
              subtitle: '',
              bullets: [
                { id: 'bullet-21', text: 'Languages: Python, JavaScript, Java, C++, TypeScript, Go' },
                { id: 'bullet-22', text: 'Frameworks: React, Node.js, Express, Django, Spring Boot' },
                { id: 'bullet-23', text: 'Tools: Git, Docker, Kubernetes, AWS, Jenkins, PostgreSQL, MongoDB' },
                { id: 'bullet-24', text: 'Concepts: Microservices, REST APIs, GraphQL, Machine Learning, System Design' }
              ]
            },
            {
              id: 'custom-2',
              title: 'Awards & Recognition',
              subtitle: '',
              bullets: [
                { id: 'bullet-25', text: 'Google Hackathon Winner - Best Technical Implementation (2022)' },
                { id: 'bullet-26', text: 'Stanford Engineering Excellence Award (2021)' },
                { id: 'bullet-27', text: 'Published research paper on distributed systems in ACM Conference' }
              ]
            }
          ],
          totalBullets: 0
        };
        
        mockMasterResume.totalBullets = calculateTotalBullets(mockMasterResume);
        await storageService.saveResume(mockMasterResume);
        
        // Initialize saved resumes with mock data
        const mockSavedResumes = [
          {
            id: 'resume-1',
            name: 'Google SWE - Full Stack',
            createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000, // 2 days ago
            updatedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
            data: {
              selectedBullets: [
                {
                  id: 'bullet-1',
                  text: 'Developed and maintained microservices handling 10M+ daily requests using Python and Kubernetes',
                  original: 'Developed and maintained microservices handling 10M+ daily requests using Python and Kubernetes',
                  relevanceScore: 0.92,
                  rewritten: 'Built scalable microservices architecture processing 10M+ daily requests with Python and Kubernetes, ensuring high availability and performance'
                },
                {
                  id: 'bullet-5',
                  text: 'Designed and built RESTful APIs serving 5M+ requests per day with 99.9% uptime',
                  original: 'Designed and built RESTful APIs serving 5M+ requests per day with 99.9% uptime',
                  relevanceScore: 0.88,
                  rewritten: 'Architected and implemented RESTful APIs handling 5M+ daily requests with 99.9% uptime, leveraging Node.js and PostgreSQL'
                },
                {
                  id: 'bullet-4',
                  text: 'Implemented CI/CD pipelines using Jenkins and Docker, reducing deployment time by 60%',
                  original: 'Implemented CI/CD pipelines using Jenkins and Docker, reducing deployment time by 60%',
                  relevanceScore: 0.85,
                  rewritten: 'Established CI/CD pipelines with Jenkins and Docker, automating deployments and reducing release time by 60%'
                }
              ],
              gaps: ['Cloud infrastructure', 'System design'],
              mode: 'strict',
              jobDescription: 'Full-stack software engineer position at Google...'
            }
          },
          {
            id: 'resume-2',
            name: 'Meta Frontend Engineer',
            createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000, // 5 days ago
            updatedAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
            data: {
              selectedBullets: [
                {
                  id: 'bullet-7',
                  text: 'Built React components for Facebook Marketplace improving user interface and accessibility',
                  original: 'Built React components for Facebook Marketplace improving user interface and accessibility',
                  relevanceScore: 0.95,
                  rewritten: 'Developed React components for Facebook Marketplace, enhancing UI/UX and accessibility standards'
                },
                {
                  id: 'bullet-8',
                  text: 'Implemented real-time notifications using WebSocket connections reducing latency by 30%',
                  original: 'Implemented real-time notifications using WebSocket connections reducing latency by 30%',
                  relevanceScore: 0.90,
                  rewritten: 'Created real-time notification system using WebSocket connections, achieving 30% latency reduction'
                },
                {
                  id: 'bullet-14',
                  text: 'Built scalable web application supporting 1000+ concurrent users with real-time inventory updates',
                  original: 'Built scalable web application supporting 1000+ concurrent users with real-time inventory updates',
                  relevanceScore: 0.87,
                  rewritten: 'Engineered scalable web application handling 1000+ concurrent users with real-time inventory management'
                }
              ],
              gaps: ['TypeScript', 'GraphQL'],
              mode: 'strict',
              jobDescription: 'Frontend engineer role focusing on React and user experience...'
            }
          }
        ];
        
        // Save mock resumes with their original timestamps
        for (const resume of mockSavedResumes) {
          await storageService.saveGeneratedResume(resume.name, resume.data, resume.createdAt);
        }
        
        console.log('Mock data initialized successfully');
      }
    } catch (error) {
      console.error('Error initializing mock data:', error);
    }
  }

  /**
   * Load resume from Chrome storage
   */
  async function loadResumeData() {
    try {
      const data = await storageService.getResume();
      // Ensure all fields exist and calculate total bullets
      const normalizedData = {
        experiences: Array.isArray(data.experiences) ? data.experiences : [],
        education: Array.isArray(data.education) ? data.education : [],
        projects: Array.isArray(data.projects) ? data.projects : [],
        customSections: Array.isArray(data.customSections) ? data.customSections : [],
        totalBullets: calculateTotalBullets({
          experiences: Array.isArray(data.experiences) ? data.experiences : [],
          education: Array.isArray(data.education) ? data.education : [],
          projects: Array.isArray(data.projects) ? data.projects : [],
          customSections: Array.isArray(data.customSections) ? data.customSections : []
        })
      };
      setResume(normalizedData);
    } catch (error) {
      console.error('Error loading resume:', error);
      // Set default empty state on error
      setResume({
        experiences: [],
        education: [],
        projects: [],
        customSections: [],
        totalBullets: 0
      });
    }
  }

  /**
   * Save resume to Chrome storage
   */
  async function saveResumeData(updatedResume) {
    try {
      await storageService.saveResume(updatedResume);
      setResume(updatedResume);
    } catch (error) {
      console.error('Error saving resume:', error);
    }
  }

  /**
   * Calculate total bullets across all sections
   */
  function calculateTotalBullets(resumeData) {
    if (!resumeData) return 0;
    
    const experiences = Array.isArray(resumeData.experiences) ? resumeData.experiences : [];
    const education = Array.isArray(resumeData.education) ? resumeData.education : [];
    const projects = Array.isArray(resumeData.projects) ? resumeData.projects : [];
    const customSections = Array.isArray(resumeData.customSections) ? resumeData.customSections : [];
    
    return (
      experiences.reduce((sum, exp) => sum + (Array.isArray(exp?.bullets) ? exp.bullets.length : 0), 0) +
      education.reduce((sum, edu) => sum + (Array.isArray(edu?.bullets) ? edu.bullets.length : 0), 0) +
      projects.reduce((sum, proj) => sum + (Array.isArray(proj?.bullets) ? proj.bullets.length : 0), 0) +
      customSections.reduce((sum, section) => sum + (Array.isArray(section?.bullets) ? section.bullets.length : 0), 0)
    );
  }

  /**
   * Handle refresh of saved resumes list
   */
  function handleResumeSaved() {
    // Trigger refresh by updating refresh trigger
    setRefreshSaved(prev => prev + 1);
  }

  const tabs = [
    { id: 'master', label: 'Master Resume' },
    { id: 'generate', label: 'Generate New Resume' },
    { id: 'saved', label: 'Saved Resumes' }
  ];

  return (
    <div className="app">
      <header className="app-header">
        <h1>AI Resume Optimizer</h1>
        <p className="subtitle">Match your resume to any job description</p>
      </header>

      <main className="app-main">
        <Tabs activeTab={activeTab} onTabChange={setActiveTab} tabs={tabs} />

        {/* Tab 1: Master Resume */}
        {activeTab === 'master' && (
          <section className="section">
            <h2>Master Resume</h2>
            <p className="section-subtitle">
              Total Bullets: {resume.totalBullets} • Add unlimited bullet points per experience
            </p>

          {/* Work Experience Section */}
          <div className="resume-section-group">
            <h3 className="section-group-title">Work Experience</h3>
            
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
                    saveResumeData({
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
                    saveResumeData({
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
                saveResumeData({
                  ...resume,
                  experiences: [...resume.experiences, newExp]
                });
              }}
            >
              + Add Experience
            </button>
          </div>

          {/* Education Section */}
          <div className="resume-section-group">
            <h3 className="section-group-title">Education</h3>
            
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
                    const totalBullets = calculateTotalBullets({
                      ...resume,
                      education: updated
                    });
                    saveResumeData({
                      ...resume,
                      education: updated,
                      totalBullets
                    });
                  }}
                  onDelete={(eduId) => {
                    const updated = resume.education.filter(e => e.id !== eduId);
                    const totalBullets = calculateTotalBullets({
                      ...resume,
                      education: updated
                    });
                    saveResumeData({
                      ...resume,
                      education: updated,
                      totalBullets
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
                saveResumeData({
                  ...resume,
                  education: [...resume.education, newEdu]
                });
              }}
            >
              + Add Education
            </button>
          </div>

          {/* Projects Section */}
          <div className="resume-section-group">
            <h3 className="section-group-title">Projects</h3>
            
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
                    const totalBullets = calculateTotalBullets({
                      ...resume,
                      projects: updated
                    });
                    saveResumeData({
                      ...resume,
                      projects: updated,
                      totalBullets
                    });
                  }}
                  onDelete={(projId) => {
                    const updated = resume.projects.filter(p => p.id !== projId);
                    const totalBullets = calculateTotalBullets({
                      ...resume,
                      projects: updated
                    });
                    saveResumeData({
                      ...resume,
                      projects: updated,
                      totalBullets
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
                saveResumeData({
                  ...resume,
                  projects: [...resume.projects, newProj]
                });
              }}
            >
              + Add Project
            </button>
          </div>

          {/* Custom Sections */}
          <div className="resume-section-group">
            <h3 className="section-group-title">Custom Sections</h3>
            
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
                    const totalBullets = calculateTotalBullets({
                      ...resume,
                      customSections: updated
                    });
                    saveResumeData({
                      ...resume,
                      customSections: updated,
                      totalBullets
                    });
                  }}
                  onDelete={(sectionId) => {
                    const updated = resume.customSections.filter(s => s.id !== sectionId);
                    const totalBullets = calculateTotalBullets({
                      ...resume,
                      customSections: updated
                    });
                    saveResumeData({
                      ...resume,
                      customSections: updated,
                      totalBullets
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
                saveResumeData({
                  ...resume,
                  customSections: [...resume.customSections, newSection]
                });
              }}
            >
              + Add Custom Section
            </button>
          </div>
        </section>
        )}

        {/* Tab 2: Generate New Resume */}
        {activeTab === 'generate' && (
          <GenerateResume
            masterResume={resume}
            onSave={handleResumeSaved}
          />
        )}

        {/* Tab 3: Saved Resumes */}
        {activeTab === 'saved' && (
          <SavedResumes 
            onLoadResume={handleResumeSaved} 
            refreshTrigger={refreshSaved}
            masterResume={resume}
          />
        )}
      </main>
    </div>
  );
}

export default App;


