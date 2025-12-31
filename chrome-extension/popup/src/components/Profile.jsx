import React from 'react';
import PersonalInfoEditor from './editors/PersonalInfoEditor';
import SkillsEditor from './editors/SkillsEditor';
import ExperienceEditor from './editors/ExperienceEditor';
import EducationEditor from './editors/EducationEditor';
import ProjectEditor from './editors/ProjectEditor';
import CustomSectionEditor from './editors/CustomSectionEditor';

function Profile({ resume, onResumeUpdate, onSave, calculateTotalBullets }) {
  if (!resume) {
    return <div>Loading...</div>;
  }

  return (
    <div className="view-container">
      <div className="view-header">
        <h1>Master Resume</h1>
        <p className="view-subtitle">
          Edit your master resume. All changes are saved automatically.
        </p>
      </div>
      <div className="view-content">
        {/* Personal Information */}
        <div className="resume-section-group">
          <h3 className="section-group-title">Personal Information</h3>
          <PersonalInfoEditor
            value={resume.personalInfo}
            onChange={(updatedInfo) => {
              const updatedResume = {
                ...resume,
                personalInfo: updatedInfo
              };
              onResumeUpdate(updatedResume);
              onSave(updatedResume, false);
            }}
          />
        </div>

        {/* Skills Section */}
        <div className="resume-section-group">
          <h3 className="section-group-title">Skills</h3>
          <SkillsEditor
            skills={resume.skills}
            onChange={(updatedSkills) => {
              const updatedResume = {
                ...resume,
                skills: updatedSkills,
                totalBullets: calculateTotalBullets({
                  ...resume,
                  skills: updatedSkills
                })
              };
              onResumeUpdate(updatedResume);
              onSave(updatedResume, false);
            }}
          />
        </div>

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
                  const updatedResume = {
                    ...resume,
                    experiences: updated,
                    totalBullets
                  };
                  onResumeUpdate(updatedResume);
                  onSave(updatedResume, false);
                }}
                onDelete={(expId) => {
                  const updated = resume.experiences.filter(exp => exp.id !== expId);
                  const totalBullets = calculateTotalBullets({
                    ...resume,
                    experiences: updated
                  });
                  const updatedResume = {
                    ...resume,
                    experiences: updated,
                    totalBullets
                  };
                  onResumeUpdate(updatedResume);
                  onSave(updatedResume, false);
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
              const updatedResume = {
                ...resume,
                experiences: [...resume.experiences, newExp]
              };
              onResumeUpdate(updatedResume);
              onSave(updatedResume, false);
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
                  const updatedResume = {
                    ...resume,
                    education: updated,
                    totalBullets
                  };
                  onResumeUpdate(updatedResume);
                  onSave(updatedResume, false);
                }}
                onDelete={(eduId) => {
                  const updated = resume.education.filter(e => e.id !== eduId);
                  const totalBullets = calculateTotalBullets({
                    ...resume,
                    education: updated
                  });
                  const updatedResume = {
                    ...resume,
                    education: updated,
                    totalBullets
                  };
                  onResumeUpdate(updatedResume);
                  onSave(updatedResume, false);
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
              const updatedResume = {
                ...resume,
                education: [...resume.education, newEdu]
              };
              onResumeUpdate(updatedResume);
              onSave(updatedResume, false);
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
                  const updatedResume = {
                    ...resume,
                    projects: updated,
                    totalBullets
                  };
                  onResumeUpdate(updatedResume);
                  onSave(updatedResume, false);
                }}
                onDelete={(projId) => {
                  const updated = resume.projects.filter(p => p.id !== projId);
                  const totalBullets = calculateTotalBullets({
                    ...resume,
                    projects: updated
                  });
                  const updatedResume = {
                    ...resume,
                    projects: updated,
                    totalBullets
                  };
                  onResumeUpdate(updatedResume);
                  onSave(updatedResume, false);
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
              const updatedResume = {
                ...resume,
                projects: [...resume.projects, newProj]
              };
              onResumeUpdate(updatedResume);
              onSave(updatedResume, false);
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
                  const updatedResume = {
                    ...resume,
                    customSections: updated,
                    totalBullets
                  };
                  onResumeUpdate(updatedResume);
                  onSave(updatedResume, false);
                }}
                onDelete={(sectionId) => {
                  const updated = resume.customSections.filter(s => s.id !== sectionId);
                  const totalBullets = calculateTotalBullets({
                    ...resume,
                    customSections: updated
                  });
                  const updatedResume = {
                    ...resume,
                    customSections: updated,
                    totalBullets
                  };
                  onResumeUpdate(updatedResume);
                  onSave(updatedResume, false);
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
              const updatedResume = {
                ...resume,
                customSections: [...resume.customSections, newSection]
              };
              onResumeUpdate(updatedResume);
              onSave(updatedResume, false);
            }}
          >
            + Add Custom Section
          </button>
        </div>
      </div>
    </div>
  );
}

export default Profile;
