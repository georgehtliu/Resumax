import React from 'react';
import './SkillsEditor.css';

const DEFAULT_GROUP = {
  id: '',
  title: '',
  skills: []
};

function SkillsEditor({ skills = [], onChange }) {
  const skillGroups = Array.isArray(skills) ? skills : [];

  function updateGroups(nextGroups) {
    if (!onChange) return;
    onChange(nextGroups);
  }

  function handleGroupFieldChange(groupId, field, value) {
    const updated = skillGroups.map((group) =>
      group.id === groupId ? { ...group, [field]: value } : group
    );
    updateGroups(updated);
  }

  function handleSkillChange(groupId, index, value) {
    const updated = skillGroups.map((group) => {
      if (group.id !== groupId) return group;
      const items = [...(group.skills || [])];
      items[index] = value;
      return { ...group, skills: items };
    });
    updateGroups(updated);
  }

  function handleAddGroup() {
    const newGroup = {
      ...DEFAULT_GROUP,
      id: generateId('skill-group'),
      skills: ['']
    };
    updateGroups([...skillGroups, newGroup]);
  }

  function handleDeleteGroup(groupId) {
    updateGroups(skillGroups.filter((group) => group.id !== groupId));
  }

  function handleAddSkill(groupId) {
    const updated = skillGroups.map((group) => {
      if (group.id !== groupId) return group;
      return { ...group, skills: [...(group.skills || []), ''] };
    });
    updateGroups(updated);
  }

  function handleDeleteSkill(groupId, index) {
    const updated = skillGroups.map((group) => {
      if (group.id !== groupId) return group;
      const items = [...(group.skills || [])];
      items.splice(index, 1);
      return { ...group, skills: items };
    });
    updateGroups(updated);
  }

  return (
    <div className="skills-editor">
      <div className="skills-header">
        <h3>Skills</h3>
        <button className="btn btn-small" onClick={handleAddGroup}>
          + Add Skill Group
        </button>
      </div>

      {skillGroups.length === 0 ? (
        <div className="skills-empty">
          <p>No skills added yet. Create a group like "Languages" or "Frameworks" and list your skills.</p>
        </div>
      ) : (
        <div className="skills-groups">
          {skillGroups.map((group) => (
            <div key={group.id} className="skill-group">
              <div className="skill-group-header">
                <div className="skill-group-field">
                  <label>Group Title</label>
                  <input
                    type="text"
                    value={group.title || ''}
                    onChange={(e) => handleGroupFieldChange(group.id, 'title', e.target.value)}
                    placeholder="e.g., Languages"
                  />
                </div>
                <button
                  className="btn-icon"
                  onClick={() => handleDeleteGroup(group.id)}
                  title="Delete group"
                >
                  ×
                </button>
              </div>

              <div className="skill-items">
                {(group.skills || []).length === 0 ? (
                  <div className="skill-item-empty">No skills yet. Add your first skill.</div>
                ) : (
                  (group.skills || []).map((skill, index) => (
                    <div key={`${group.id}-${index}`} className="skill-item">
                      <input
                        type="text"
                        value={skill}
                        onChange={(e) => handleSkillChange(group.id, index, e.target.value)}
                        placeholder="e.g., Python"
                      />
                      <button
                        className="btn-icon"
                        onClick={() => handleDeleteSkill(group.id, index)}
                        title="Remove skill"
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>

              <button
                className="btn btn-small btn-secondary"
                onClick={() => handleAddSkill(group.id)}
              >
                + Add Skill
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function generateId(prefix = 'id') {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now()}`;
}

export default SkillsEditor;


