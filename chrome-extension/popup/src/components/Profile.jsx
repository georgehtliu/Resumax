import React from 'react';
import ExperienceEditor from './ExperienceEditor';
import EducationEditor from './EducationEditor';
import ProjectEditor from './ProjectEditor';
import CustomSectionEditor from './CustomSectionEditor';
import PersonalInfoEditor from './PersonalInfoEditor';
import SkillsEditor from './SkillsEditor';
import Tabs from './Tabs';
import { storageService } from '../services/storage';
import './Profile.css';

/**
 * Profile Component
 * Contains master resume points and editing
 */
function Profile({ resume, onResumeUpdate, calculateTotalBullets }) {
  const tabs = [
    { id: 'personal', label: 'Personal Info' },
    { id: 'experiences', label: 'Experiences' },
    { id: 'education', label: 'Education' },
    { id: 'projects', label: 'Projects' },
    { id: 'skills', label: 'Skills' },
    { id: 'custom', label: 'Custom Sections' },
  ];

  const [activeTab, setActiveTab] = React.useState('personal');

  const handleImportResume = async () => {
    // Load mock data for now
    const mockMasterResume = {
      personalInfo: {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane.doe@example.com',
        phone: '+1 (555) 123-4567',
        linkedin: 'linkedin.com/in/janedoe',
        github: 'github.com/janedoe'
      },
      skills: [
        {
          id: 'skill-1',
          title: 'Languages',
          skills: ['Python', 'JavaScript', 'Go', 'Java', 'SQL']
        },
        {
          id: 'skill-2',
          title: 'Frameworks & Libraries',
          skills: ['React', 'Node.js', 'Django', 'Spring Boot', 'GraphQL']
        },
        {
          id: 'skill-3',
          title: 'Cloud & DevOps',
          skills: ['AWS', 'Docker', 'Kubernetes', 'Terraform', 'CI/CD']
        }
      ],
      experiences: [
        {
          id: 'exp-1',
          company: 'Google',
          role: 'Software Engineer II',
          startDate: 'Jun 2022',
          endDate: 'Present',
          bullets: [
            { id: 'bullet-1', text: 'Scaled Go/Python microservices for 10M+ daily requests while keeping uptime at 99.9%' },
            { id: 'bullet-2', text: 'Cut API latency 40% by tuning SQL and cache layers, saving $50K in annual infra costs' },
            { id: 'bullet-3', text: 'Led three engineers to launch recommendations that raised engagement 25% and revenue $2M' },
            { id: 'bullet-4', text: 'Automated Jenkins and Docker pipelines enabling daily releases and trimming deploy time 60%' },
            { id: 'bullet-5', text: 'Built REST and gRPC services for 5M+ calls with sub-100ms latency to speed the mobile app' }
          ]
        },
        {
          id: 'exp-2',
          company: 'Meta',
          role: 'Software Engineering Intern',
          startDate: 'Jun 2021',
          endDate: 'Aug 2021',
          bullets: [
            { id: 'bullet-9', text: 'Shipped accessible Marketplace UI components that lifted conversion by 15%' },
            { id: 'bullet-10', text: 'Built WebSocket plus Redis alerts trimming latency 30% and boosting engagement' },
            { id: 'bullet-11', text: 'Optimized GraphQL queries to cut server load 25% and speed page renders' }
          ]
        }
      ],
      education: [
        {
          id: 'edu-1',
          school: 'Stanford University',
          degree: 'B.S.',
          field: 'Computer Science',
          startDate: 'Sep 2018',
          endDate: 'Jun 2022',
          bullets: [
            { id: 'bullet-18', text: 'GPA 3.9/4.0, Magna Cum Laude, Dean\'s List in every term' },
            { id: 'bullet-19', text: 'Core courses: Algorithms, Machine Learning, Distributed Systems, Databases' },
            { id: 'bullet-20', text: 'Teaching assistant for CS161 supporting 50+ students with labs and grading' }
          ]
        }
      ],
      projects: [
        {
          id: 'proj-1',
          name: 'Distributed Task Scheduler',
          description: 'High-performance distributed task scheduling system with fault tolerance',
          technologies: 'Go, Kubernetes, Redis, PostgreSQL, gRPC',
          startDate: 'Jan 2022',
          endDate: 'May 2022',
          bullets: [
            { id: 'bullet-22', text: 'Built Go + Kubernetes scheduler processing 100K concurrent jobs at 99.95% uptime' },
            { id: 'bullet-23', text: 'Implemented Raft-based leader election to coordinate task execution' },
            { id: 'bullet-24', text: 'Designed failover with replication to prevent task loss during node outages' }
          ]
        }
      ],
      customSections: []
    };

    // Save to storage and update the resume
    await storageService.saveResume(mockMasterResume);
    onResumeUpdate(mockMasterResume);
  };

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="profile-header-content">
          <div>
            <h1>Profile</h1>
            <p className="profile-subtitle">Manage your master resume points</p>
          </div>
          <button 
            className="btn-import-resume"
            onClick={handleImportResume}
            title="Import from existing resume"
          >
            <span className="import-icon">📥</span>
            Import from Resume
          </button>
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

