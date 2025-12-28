import React from 'react';

export default function ResumeRenderer({
  resume,
  bulletComments,
  selectedBulletId,
  hoveredBulletId,
  setSelectedBulletId,
  setHoveredBulletId,
  bulletRefs,
  setBulletRefs
}) {
  const renderBullet = (bullet, bulletId, sectionType, entryId, entry) => {
    const bulletText = typeof bullet === 'string' ? bullet : (bullet.text || bullet.rewritten || '');
    const bulletCommentsList = bulletComments[bulletId] || [];
    const hasComments = bulletCommentsList.length > 0;
    const isSelected = selectedBulletId === bulletId;
    const isHovered = hoveredBulletId === bulletId;

    return (
      <li 
        key={bulletId} 
        ref={(el) => {
          if (el && !bulletRefs[bulletId]) {
            setBulletRefs(prev => ({ ...prev, [bulletId]: el }));
          }
        }}
        className={`resume-bullet ${hasComments ? 'has-comments' : ''} ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''}`}
        onClick={(e) => {
          // Only toggle if clicking on the bullet text or badge, not on the comment form
          if (!e.target.closest('.bullet-comment-form') && !e.target.closest('.comment-marker')) {
            e.stopPropagation();
            setSelectedBulletId(isSelected ? null : bulletId);
          }
        }}
        onMouseEnter={() => setHoveredBulletId(bulletId)}
        onMouseLeave={() => setHoveredBulletId(null)}
      >
        <div className="bullet-content-wrapper">
          <span className="comment-marker-container">
            {hasComments && (
              <span 
                className={`comment-marker ${isSelected || isHovered ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedBulletId(isSelected ? null : bulletId);
                }}
                title={`${bulletCommentsList.length} comment(s)`}
              >
                <span className="comment-marker-dot"></span>
                <span className="comment-marker-count">{bulletCommentsList.length}</span>
              </span>
            )}
            {!hasComments && (isSelected || isHovered) && (
              <span 
                className="comment-marker add-comment-marker"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedBulletId(bulletId);
                }}
                title="Add comment"
              >
                <span className="comment-marker-dot">+</span>
              </span>
            )}
          </span>
          <span className="bullet-text">{bulletText}</span>
        </div>
      </li>
    );
  };

  const renderResumeSection = (title, entries, getEntryContent, sectionType) => {
    if (!entries || entries.length === 0) return null;

    return (
      <div className="resume-section">
        <h3 className="section-title">{title}</h3>
        {entries.map((entry, idx) => (
          <div key={entry.id || idx} className="resume-entry">
            {getEntryContent(entry, sectionType)}
          </div>
        ))}
      </div>
    );
  };

  if (!resume || !resume.resume_data) return null;

  const data = resume.resume_data;
  
  // Get personal info with fallbacks for different data structures
  const personalInfo = data.personalInfo || data.personal_info || {};
  const firstName = (personalInfo.firstName || personalInfo.first_name || '').trim();
  const lastName = (personalInfo.lastName || personalInfo.last_name || '').trim();
  const name = firstName || lastName 
    ? `${firstName} ${lastName}`.trim() 
    : (personalInfo.name || '').trim();
  
  // Check if we have any personal info to display
  const hasName = name.length > 0;
  const hasContactInfo = !!(personalInfo.phone || personalInfo.email || personalInfo.linkedin || personalInfo.github);
  const shouldShowPersonalInfo = hasName || hasContactInfo;

  return (
    <>
      {/* Personal Info Header - Always at top */}
      {shouldShowPersonalInfo && (
        <div className="resume-header-section">
          {hasName && (
            <h1 className="resume-name">{name}</h1>
          )}
          {hasContactInfo && (
            <div className="resume-contact-info">
              {personalInfo.phone && (
                <span className="contact-item">{personalInfo.phone}</span>
              )}
              {personalInfo.email && (
                <span className="contact-item">
                  {personalInfo.email}
                </span>
              )}
              {personalInfo.linkedin && (
                <span className="contact-item">
                  <a href={personalInfo.linkedin} target="_blank" rel="noopener noreferrer">
                    {personalInfo.linkedin.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/^linkedin\.com\/in\//, 'linkedin.com/in/')}
                  </a>
                </span>
              )}
              {personalInfo.github && (
                <span className="contact-item">
                  <a href={personalInfo.github} target="_blank" rel="noopener noreferrer">
                    {personalInfo.github.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/^github\.com\//, 'github.com/')}
                  </a>
                </span>
              )}
            </div>
          )}
        </div>
      )}

      <div className="resume-content" id="resume-content">

      {renderResumeSection(
        'EXPERIENCE',
        data.experiences,
        (entry, sectionType) => {
          // Get bullets from selectedBullets or bullets (fallback)
          const bullets = entry.selectedBullets || entry.bullets || [];
          const location = entry.location || (entry.city && entry.state ? `${entry.city}, ${entry.state}` : entry.city || entry.state || '');
          return (
            <div className="resume-entry">
              <div className="entry-header-row">
                <div className="entry-title">
                  {entry.company && (
                    <div className="entry-company-name">{entry.company}</div>
                  )}
                  <div>
                    <strong className="entry-role">{entry.role}</strong>
                    {location && <span className="entry-location">, {location}</span>}
                  </div>
                </div>
                {(entry.startDate || entry.endDate) && (
                  <span className="entry-dates">
                    {entry.startDate || ''} {entry.startDate && entry.endDate ? '–' : ''} {entry.endDate || 'Present'}
                  </span>
                )}
              </div>
              {bullets.length > 0 && (
                <ul className="entry-bullets">
                  {bullets.map((bullet, idx) => {
                    const bulletId = bullet.id || `${entry.id}-bullet-${idx}`;
                    return renderBullet(bullet, bulletId, sectionType, entry.id, entry);
                  })}
                </ul>
              )}
            </div>
          );
        },
        'experience'
      )}

      {renderResumeSection(
        'Education',
        data.education,
        (entry, sectionType) => {
          // Get bullets from selectedBullets or bullets (fallback)
          const bullets = entry.selectedBullets || entry.bullets || [];
          // Check if endDate is in the future for "Expected Graduation"
          const endDate = entry.endDate;
          const isFutureDate = endDate && new Date(endDate) > new Date();
          const dateLabel = isFutureDate ? 'Expected Graduation: ' : '';
          return (
            <div className="resume-entry">
              <div className="entry-header-row">
                <div className="entry-title">
                  <strong className="entry-school">{entry.school}</strong>
                  {(entry.startDate || entry.endDate) && (
                    <span className="entry-dates-inline">
                      {' '}{dateLabel}{entry.endDate || entry.startDate || ''}
                    </span>
                  )}
                  {entry.degree && <span className="entry-degree">, {entry.degree}</span>}
                  {entry.field && <span className="entry-field">, {entry.field}</span>}
                </div>
              </div>
              {bullets.length > 0 && (
                <ul className="entry-bullets">
                  {bullets.map((bullet, idx) => {
                    const bulletId = bullet.id || `${entry.id}-bullet-${idx}`;
                    return renderBullet(bullet, bulletId, sectionType, entry.id, entry);
                  })}
                </ul>
              )}
            </div>
          );
        },
        'education'
      )}

      {renderResumeSection(
        'PROJECTS',
        data.projects,
        (entry, sectionType) => {
          // Get bullets from selectedBullets or bullets (fallback)
          const bullets = entry.selectedBullets || entry.bullets || [];
          // Ensure technologies is always an array
          const technologiesRaw = entry.technologies || entry.tech || entry.skills;
          const technologies = Array.isArray(technologiesRaw) ? technologiesRaw : (technologiesRaw ? [technologiesRaw] : []);
          return (
            <div className="resume-entry">
              <div className="entry-header-row">
                <div className="entry-title">
                  <strong className="entry-project-name">{entry.name}</strong>
                  {technologies.length > 0 && (
                    <span className="entry-technologies">— {technologies.join(', ')}</span>
                  )}
                </div>
              </div>
              {bullets.length > 0 && (
                <ul className="entry-bullets">
                  {bullets.map((bullet, idx) => {
                    const bulletId = bullet.id || `${entry.id}-bullet-${idx}`;
                    return renderBullet(bullet, bulletId, sectionType, entry.id, entry);
                  })}
                </ul>
              )}
            </div>
          );
        },
        'project'
      )}

      {data.skills && data.skills.length > 0 && (
        <div className="resume-section">
          <h3 className="section-title">SKILLS</h3>
          <ul className="skills-list">
            {data.skills.map((group, idx) => {
              // Ensure skills is always an array
              const skillsArray = Array.isArray(group.skills) ? group.skills : (group.skills ? [group.skills] : []);
              if (skillsArray.length === 0) return null;
              return (
                <li key={group.id || idx} className="skill-group">
                  {group.title && <strong className="skill-category">{group.title}: </strong>}
                  <span className="skill-items">{skillsArray.join(', ')}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {data.customSections && data.customSections.length > 0 && (
        data.customSections.map((section, idx) => {
          const bullets = section.selectedBullets || section.bullets || [];
          if (bullets.length === 0) return null;
          
          return (
            <div key={section.id || idx} className="resume-section">
              <h3 className="section-title">{section.title || 'ADDITIONAL'}</h3>
              <div className="resume-entry">
                <ul className="entry-bullets">
                  {bullets.map((bullet, bulletIdx) => {
                    const bulletId = bullet.id || `${section.id}-bullet-${bulletIdx}`;
                    return renderBullet(bullet, bulletId, 'custom', section.id, section);
                  })}
                </ul>
              </div>
            </div>
          );
        })
      )}
      </div>
    </>
  );
}

