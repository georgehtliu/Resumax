import React from 'react';
import ExperienceEditor from './ExperienceEditor';
import EducationEditor from './EducationEditor';
import ProjectEditor from './ProjectEditor';
import CustomSectionEditor from './CustomSectionEditor';
import PersonalInfoEditor from './PersonalInfoEditor';
import SkillsEditor from './SkillsEditor';
import Tabs from './Tabs';
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

  const handleImportResume = () => {
    // TODO: Implement resume import functionality
    alert('Resume import feature coming soon!');
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

