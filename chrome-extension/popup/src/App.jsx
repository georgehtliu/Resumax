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

  // Load resume data on mount
  useEffect(() => {
    loadResumeData();
  }, []);

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
          <SavedResumes onLoadResume={handleResumeSaved} refreshTrigger={refreshSaved} />
        )}
      </main>
    </div>
  );
}

export default App;


