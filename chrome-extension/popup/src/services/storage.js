/**
 * Storage Service
 * 
 * Uses Supabase for resume data persistence
 * Falls back to Chrome Storage if user is not signed in
 */
import { supabase } from '../config/supabase';

const MASTER_RESUME_NAME = '__MASTER_RESUME__';

/**
 * Get current user session
 * @returns {Promise<Object|null>} Session object or null
 */
async function getSession() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}

/**
 * Save resume data (master resume) to Supabase using normalized tables
 * @param {Object} resumeData - Resume object with experiences and bullets
 */
export async function saveResume(resumeData) {
  const session = await getSession();
  
  if (!session) {
    console.warn('⚠️ No session - saving to Chrome storage only');
    // Fallback to Chrome storage if not signed in
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ resume: resumeData }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
  }

  try {
    const userId = session.user.id;
    console.log('💾 Saving resume data to Supabase for user:', userId);
    console.log('📥 Raw input data:', {
      experiences: resumeData.experiences?.length || 0,
      education: resumeData.education?.length || 0,
      projects: resumeData.projects?.length || 0,
      customSections: resumeData.customSections?.length || 0,
      skills: resumeData.skills?.length || 0
    });
    const normalized = normalizeResume(resumeData);
    console.log('📊 Normalized data:', {
      experiences: normalized.experiences?.length || 0,
      education: normalized.education?.length || 0,
      projects: normalized.projects?.length || 0,
      customSections: normalized.customSections?.length || 0,
      skills: normalized.skills?.length || 0
    });
    console.log('📊 Normalized data details:', JSON.stringify({
      education: normalized.education?.slice(0, 1), // First item only for debugging
      projects: normalized.projects?.slice(0, 1),
      skills: normalized.skills?.slice(0, 1)
    }, null, 2));

    // 1. Save/Update personal_info
    const { data: existingPersonalInfo } = await supabase
      .from('personal_info')
      .select('id')
      .eq('user_id', userId)
      .single();

    const personalInfoData = {
      user_id: userId,
      first_name: normalized.personalInfo.firstName || null,
      last_name: normalized.personalInfo.lastName || null,
      email: normalized.personalInfo.email || null,
      phone: normalized.personalInfo.phone || null,
      linkedin: normalized.personalInfo.linkedin || null,
      github: normalized.personalInfo.github || null,
      updated_at: new Date().toISOString()
    };

    if (existingPersonalInfo) {
      const { error } = await supabase
        .from('personal_info')
        .update(personalInfoData)
        .eq('id', existingPersonalInfo.id);
      if (error) {
        console.error('❌ Error updating personal_info:', error);
        throw error;
      }
      console.log('✅ Updated personal_info');
    } else {
      const { error } = await supabase
        .from('personal_info')
        .insert(personalInfoData);
      if (error) {
        console.error('❌ Error inserting personal_info:', error);
        throw error;
      }
      console.log('✅ Inserted personal_info');
    }

    // 2. Delete all existing experiences, education, projects, custom_sections for this user
    // (This ensures we have a clean state before inserting new data)
    // Note: resume_points should be cascade deleted when parent records are deleted
    console.log('🗑️ Deleting existing data...');
    
    const { error: deleteExpError } = await supabase
      .from('experiences')
      .delete()
      .eq('user_id', userId);
    if (deleteExpError) {
      console.error('❌ Error deleting experiences:', deleteExpError);
      throw deleteExpError;
    }

    const { error: deleteEduError } = await supabase
      .from('education')
      .delete()
      .eq('user_id', userId);
    if (deleteEduError) {
      console.error('❌ Error deleting education:', deleteEduError);
      throw deleteEduError;
    }

    const { error: deleteProjError } = await supabase
      .from('projects')
      .delete()
      .eq('user_id', userId);
    if (deleteProjError) {
      console.error('❌ Error deleting projects:', deleteProjError);
      throw deleteProjError;
    }

    const { error: deleteCustomError } = await supabase
      .from('custom_sections')
      .delete()
      .eq('user_id', userId);
    if (deleteCustomError) {
      console.error('❌ Error deleting custom_sections:', deleteCustomError);
      throw deleteCustomError;
    }

    const { error: deleteSkillsError } = await supabase
      .from('skill_groups')
      .delete()
      .eq('user_id', userId);
    if (deleteSkillsError) {
      console.error('❌ Error deleting skill_groups:', deleteSkillsError);
      throw deleteSkillsError;
    }
    // Note: skills will be cascade deleted when skill_groups are deleted
    console.log('✅ Deleted existing data');

    // 3. Insert experiences with resume_points
    console.log(`📝 Inserting ${normalized.experiences?.length || 0} experiences...`);
    for (const exp of normalized.experiences || []) {
      const { data: newExp, error: expError } = await supabase
        .from('experiences')
        .insert({
          user_id: userId,
          company_name: exp.company || '',
          role: exp.role || '',
          start_date: exp.startDate || null,
          end_date: exp.endDate || null
        })
        .select()
        .single();
      
      if (expError) {
        console.error('❌ Error inserting experience:', expError, exp);
        throw expError;
      }

      if (!newExp || !newExp.id) {
        console.error('❌ Experience inserted but no ID returned:', newExp);
        throw new Error('Failed to get experience ID after insert');
      }

      // Insert resume_points for this experience
      if (exp.bullets && Array.isArray(exp.bullets) && exp.bullets.length > 0) {
        const points = exp.bullets
          .filter(bullet => bullet && bullet.text && bullet.text.trim().length > 0)
          .map(bullet => ({
            experience_id: newExp.id,
            text_content: bullet.text.trim(),
            is_non_negotiable: bullet.isNonNegotiable || false
          }));

        if (points.length > 0) {
          console.log(`    📝 Inserting ${points.length} resume_points for experience ID: ${newExp.id}`);
          
          // Verify the experience exists before inserting resume_points
          const { data: verifyExp, error: verifyError } = await supabase
            .from('experiences')
            .select('id')
            .eq('id', newExp.id)
            .single();
          
          if (verifyError || !verifyExp) {
            console.error('❌ Experience not found after insert:', newExp.id);
            throw new Error(`Experience ${newExp.id} not found - cannot insert resume_points`);
          }
          
          const { error: pointsError } = await supabase
            .from('resume_points')
            .insert(points);
          if (pointsError) {
            console.error('❌ Error inserting resume_points for experience:', pointsError);
            console.error('  Experience ID:', newExp.id);
            console.error('  Experience data:', newExp);
            console.error('  Points data:', points);
            throw pointsError;
          }
          console.log(`    ✅ Inserted ${points.length} resume_points for experience ID: ${newExp.id}`);
        }
      }
    }
    console.log('✅ Inserted experiences');

    // 4. Insert education with resume_points
    console.log(`📝 Inserting ${normalized.education?.length || 0} education entries...`);
    for (const edu of normalized.education || []) {
      const { data: newEdu, error: eduError } = await supabase
        .from('education')
        .insert({
          user_id: userId,
          institution: edu.school || '',
          degree: edu.degree || null,
          field_of_study: edu.field || null,
          start_date: edu.startDate || null,
          end_date: edu.endDate || null
        })
        .select()
        .single();
      
      if (eduError) {
        console.error('❌ Error inserting education:', eduError, edu);
        throw eduError;
      }

      if (!newEdu || !newEdu.id) {
        console.error('❌ Education inserted but no ID returned:', newEdu);
        throw new Error('Failed to get education ID after insert');
      }
      console.log(`  ✅ Inserted education "${edu.school || edu.institution || ''}" with ID: ${newEdu.id}`);

      // Insert resume_points for this education
      if (edu.bullets && Array.isArray(edu.bullets) && edu.bullets.length > 0) {
        const points = edu.bullets.map(bullet => ({
          education_id: newEdu.id,
          text_content: bullet.text || '',
          is_non_negotiable: bullet.isNonNegotiable || false
        }));

        if (points.length > 0) {
          console.log(`    📝 Inserting ${points.length} resume_points for education ID: ${newEdu.id}`);
          const { error: pointsError } = await supabase
            .from('resume_points')
            .insert(points);
          if (pointsError) {
            console.error('❌ Error inserting resume_points for education:', pointsError);
            console.error('  Education ID:', newEdu.id);
            console.error('  Points data:', points);
            throw pointsError;
          }
          console.log(`    ✅ Inserted ${points.length} resume_points for education ID: ${newEdu.id}`);
        }
      }
    }
    console.log('✅ Inserted education');

    // 5. Insert projects with resume_points
    console.log(`📝 Inserting ${normalized.projects?.length || 0} projects...`);
    for (const proj of normalized.projects || []) {
      const { data: newProj, error: projError } = await supabase
        .from('projects')
        .insert({
          user_id: userId,
          name: proj.name || '',
          description: proj.description || null,
          technologies: proj.technologies || null,
          start_date: proj.startDate || null,
          end_date: proj.endDate || null
          // Note: url and display_order exist in DB but not in code data structure
        })
        .select()
        .single();
      
      if (projError) {
        console.error('❌ Error inserting project:', projError, proj);
        throw projError;
      }

      if (!newProj || !newProj.id) {
        console.error('❌ Project inserted but no ID returned:', newProj);
        throw new Error('Failed to get project ID after insert');
      }
      console.log(`  ✅ Inserted project "${proj.name || ''}" with ID: ${newProj.id}`);

      // Insert resume_points for this project
      if (proj.bullets && Array.isArray(proj.bullets) && proj.bullets.length > 0) {
        const points = proj.bullets.map(bullet => ({
          project_id: newProj.id,
          text_content: bullet.text || '',
          is_non_negotiable: bullet.isNonNegotiable || false
        }));

        if (points.length > 0) {
          console.log(`    📝 Inserting ${points.length} resume_points for project ID: ${newProj.id}`);
          const { error: pointsError } = await supabase
            .from('resume_points')
            .insert(points);
          if (pointsError) {
            console.error('❌ Error inserting resume_points for project:', pointsError);
            console.error('  Project ID:', newProj.id);
            console.error('  Points data:', points);
            throw pointsError;
          }
          console.log(`    ✅ Inserted ${points.length} resume_points for project ID: ${newProj.id}`);
        }
      }
    }
    console.log('✅ Inserted projects');

    // 6. Insert custom_sections with resume_points
    console.log(`📝 Inserting ${normalized.customSections?.length || 0} custom sections...`);
    for (const custom of normalized.customSections || []) {
      const { data: newCustom, error: customError } = await supabase
        .from('custom_sections')
        .insert({
          user_id: userId,
          title: custom.title || ''
          // Note: subtitle column doesn't exist in database, skipping it
        })
        .select()
        .single();
      
      if (customError) {
        console.error('❌ Error inserting custom_section:', customError, custom);
        throw customError;
      }

      if (!newCustom || !newCustom.id) {
        console.error('❌ Custom section inserted but no ID returned:', newCustom);
        throw new Error('Failed to get custom section ID after insert');
      }
      console.log(`  ✅ Inserted custom section "${custom.title || ''}" with ID: ${newCustom.id}`);

      // Insert resume_points for this custom section
      if (custom.bullets && Array.isArray(custom.bullets) && custom.bullets.length > 0) {
        const points = custom.bullets.map(bullet => ({
          custom_section_id: newCustom.id,
          text_content: bullet.text || '',
          is_non_negotiable: bullet.isNonNegotiable || false
        }));

        if (points.length > 0) {
          console.log(`    📝 Inserting ${points.length} resume_points for custom section ID: ${newCustom.id}`);
          const { error: pointsError } = await supabase
            .from('resume_points')
            .insert(points);
          if (pointsError) {
            console.error('❌ Error inserting resume_points for custom section:', pointsError);
            console.error('  Custom section ID:', newCustom.id);
            console.error('  Points data:', points);
            throw pointsError;
          }
          console.log(`    ✅ Inserted ${points.length} resume_points for custom section ID: ${newCustom.id}`);
        }
      }
    }
    console.log('✅ Inserted custom sections');

    // 7. Insert skill_groups with skills
    console.log(`📝 Inserting ${normalized.skills?.length || 0} skill groups...`);
    if (normalized.skills && normalized.skills.length > 0) {
      for (const skillGroup of normalized.skills) {
        // Validate skill group has at least a title
        if (!skillGroup.title || typeof skillGroup.title !== 'string' || skillGroup.title.trim().length === 0) {
          console.warn('⚠️ Skipping skill group with no title:', skillGroup);
          continue;
        }

        // Insert skill group
        const { data: newSkillGroup, error: skillGroupError } = await supabase
          .from('skill_groups')
          .insert({
            user_id: userId,
            title: skillGroup.title.trim(),
            display_order: skillGroup.display_order || 0
          })
          .select()
          .single();
        
        if (skillGroupError) {
          console.error('❌ Error inserting skill_group:', skillGroupError);
          console.error('  Skill group data:', skillGroup);
          throw skillGroupError;
        }

        if (!newSkillGroup || !newSkillGroup.id) {
          console.error('❌ Skill group inserted but no ID returned:', newSkillGroup);
          throw new Error('Failed to get skill group ID after insert');
        }
        console.log(`  ✅ Inserted skill group "${skillGroup.title}" with ID: ${newSkillGroup.id}`);

        // Insert skills for this group
        if (skillGroup.skills && Array.isArray(skillGroup.skills) && skillGroup.skills.length > 0) {
          // Map and filter skills
          const skillsToInsert = skillGroup.skills
            .map((skill, index) => ({
              skill_group_id: newSkillGroup.id,
              name: typeof skill === 'string' ? skill.trim() : String(skill).trim(),
              display_order: index
            }))
            .filter(skill => skill.name.length > 0); // Filter out empty skills

          if (skillsToInsert.length > 0) {
            console.log(`    📝 Inserting ${skillsToInsert.length} skills for skill group "${skillGroup.title}"`);
            const { error: skillsInsertError } = await supabase
              .from('skills')
              .insert(skillsToInsert);
            
            if (skillsInsertError) {
              console.error('❌ Error inserting skills:', skillsInsertError);
              console.error('  Skill group ID:', newSkillGroup.id);
              console.error('  Skill group title:', skillGroup.title);
              console.error('  Skills data:', skillsToInsert);
              throw skillsInsertError;
            }
            console.log(`    ✅ Inserted ${skillsToInsert.length} skills for skill group "${skillGroup.title}"`);
          } else {
            console.log(`    ℹ️ No valid skills to insert for skill group "${skillGroup.title}"`);
          }
        } else {
          console.log(`    ℹ️ Skill group "${skillGroup.title}" has no skills`);
        }
      }
      console.log('✅ Inserted skill groups');
    } else {
      console.log('ℹ️ No skill groups to insert');
    }

    // Also save to Chrome storage as backup
    chrome.storage.local.set({ resume: resumeData }, () => {});
    console.log('✅ Successfully saved all resume data to Supabase');
  } catch (error) {
    console.error('❌ Error saving resume to Supabase:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      status: error.status
    });
    // Don't silently fall back - throw the error so the caller knows it failed
    throw error;
  }
}

/**
 * Normalize resume data to ensure all required fields exist
 * @param {Object} resumeData - Resume data from storage
 * @returns {Object} Normalized resume data
 */
function normalizePersonalInfo(info) {
  const normalized = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    linkedin: '',
    github: ''
  };

  if (!info || typeof info !== 'object') {
    return normalized;
  }

  return {
    firstName: typeof info.firstName === 'string' ? info.firstName : '',
    lastName: typeof info.lastName === 'string' ? info.lastName : '',
    email: typeof info.email === 'string' ? info.email : '',
    phone: typeof info.phone === 'string' ? info.phone : '',
    linkedin: typeof info.linkedin === 'string' ? info.linkedin : '',
    github: typeof info.github === 'string' ? info.github : ''
  };
}

function normalizeSkills(skills = []) {
  if (!Array.isArray(skills)) {
    return [];
  }

  return skills
    .filter(group => group && (group.title || (group.skills && group.skills.length)))
    .map((group, index) => {
      const normalizedSkills = Array.isArray(group.skills)
        ? group.skills
            .map((skill) => (typeof skill === 'string' ? skill.trim() : ''))
            .filter(Boolean)
        : [];

      return {
        id: typeof group.id === 'string' && group.id.length > 0 ? group.id : `skill-${Date.now()}-${index}`,
        title: typeof group.title === 'string' ? group.title : '',
        skills: normalizedSkills
      };
    });
}

function normalizeResume(resumeData) {
  if (!resumeData) {
    return {
      personalInfo: normalizePersonalInfo(),
      skills: [],
      experiences: [],
      education: [],
      projects: [],
      customSections: [],
      totalBullets: 0
    };
  }

  // Ensure all arrays exist and are arrays
  return {
    personalInfo: normalizePersonalInfo(resumeData.personalInfo),
    skills: normalizeSkills(resumeData.skills),
    experiences: Array.isArray(resumeData.experiences) ? resumeData.experiences : [],
    education: Array.isArray(resumeData.education) ? resumeData.education : [],
    projects: Array.isArray(resumeData.projects) ? resumeData.projects : [],
    customSections: Array.isArray(resumeData.customSections) ? resumeData.customSections : [],
    totalBullets: typeof resumeData.totalBullets === 'number' ? resumeData.totalBullets : 0
  };
}

/**
 * Get resume data (master resume) from Supabase using normalized tables
 * @returns {Promise<Object>} Resume data
 */
export async function getResume() {
  const session = await getSession();
  
  if (!session) {
    // Return empty resume when not signed in (don't use Chrome storage to avoid showing wrong user's data)
    return normalizeResume(null);
  }

  try {
    const userId = session.user.id;
    console.log('🔍 Loading resume data for user:', userId);
    
    const resumeData = {
      personalInfo: {},
      skills: [],
      experiences: [],
      education: [],
      projects: [],
      customSections: [],
      totalBullets: 0
    };

    // 1. Get personal_info
    const { data: personalInfo, error: personalError } = await supabase
      .from('personal_info')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (personalError && personalError.code !== 'PGRST116') {
      console.error('❌ Error loading personal_info:', personalError);
      throw personalError;
    }

    if (personalInfo) {
      resumeData.personalInfo = {
        firstName: personalInfo.first_name || '',
        lastName: personalInfo.last_name || '',
        email: personalInfo.email || '',
        phone: personalInfo.phone || '',
        linkedin: personalInfo.linkedin || '',
        github: personalInfo.github || ''
      };
      console.log('✅ Loaded personal_info');
    } else {
      console.log('ℹ️ No personal_info found');
    }

    // 2. Get skill_groups with skills
    const { data: skillGroups, error: skillsError } = await supabase
      .from('skill_groups')
      .select(`
        *,
        skills (*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (skillsError) {
      console.error('❌ Error loading skill_groups:', skillsError);
      throw skillsError;
    }

    if (skillGroups && Array.isArray(skillGroups)) {
      resumeData.skills = skillGroups.map(sg => ({
        id: sg.id,
        title: sg.title || '',
        skills: (Array.isArray(sg.skills) ? sg.skills : []).map(skill => skill.name || '').filter(Boolean)
      }));
      console.log('✅ Loaded skill_groups:', resumeData.skills.length, 'groups');
      console.log('   Total skills:', resumeData.skills.reduce((sum, sg) => sum + (sg.skills?.length || 0), 0));
    } else {
      console.log('ℹ️ No skill_groups found');
      resumeData.skills = [];
    }

    // 3. Get experiences with resume_points
    const { data: experiences, error: expError } = await supabase
      .from('experiences')
      .select(`
        *,
        resume_points (*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (expError) {
      console.error('❌ Error loading experiences:', expError);
      throw expError;
    }

    if (experiences && Array.isArray(experiences)) {
      resumeData.experiences = experiences.map(exp => ({
        id: exp.id,
        company: exp.company_name || exp.company || '',
        role: exp.role || '',
        startDate: exp.start_date || '',
        endDate: exp.end_date || '',
        bullets: (Array.isArray(exp.resume_points) ? exp.resume_points : []).map(point => ({
          id: point.id,
          text: point.text_content || '',
          isNonNegotiable: point.is_non_negotiable || false
        }))
      }));
      console.log('✅ Loaded experiences:', resumeData.experiences.length, 'entries');
      console.log('   Total bullets:', resumeData.experiences.reduce((sum, exp) => sum + exp.bullets.length, 0));
    } else {
      console.log('ℹ️ No experiences found. Raw data:', experiences);
    }

    // 4. Get education with resume_points
    const { data: education, error: eduError } = await supabase
      .from('education')
      .select(`
        *,
        resume_points (*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (eduError) {
      console.error('❌ Error loading education:', eduError);
      throw eduError;
    }

    if (education && Array.isArray(education)) {
      resumeData.education = education.map(edu => ({
        id: edu.id,
        school: edu.institution || edu.school || '',
        degree: edu.degree || '',
        field: edu.field_of_study || edu.field || '',
        startDate: edu.start_date || '',
        endDate: edu.end_date || '',
        bullets: (Array.isArray(edu.resume_points) ? edu.resume_points : []).map(point => ({
          id: point.id,
          text: point.text_content || '',
          isNonNegotiable: point.is_non_negotiable || false
        }))
      }));
      console.log('✅ Loaded education:', resumeData.education.length, 'entries');
      console.log('   Total bullets:', resumeData.education.reduce((sum, edu) => sum + edu.bullets.length, 0));
    } else {
      console.log('ℹ️ No education found. Raw data:', education);
    }

    // 5. Get projects with resume_points
    const { data: projects, error: projError } = await supabase
      .from('projects')
      .select(`
        *,
        resume_points (*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (projError) {
      console.error('❌ Error loading projects:', projError);
      throw projError;
    }

    if (projects && Array.isArray(projects)) {
      resumeData.projects = projects.map(proj => ({
        id: proj.id,
        name: proj.name || '',
        description: proj.description || '',
        technologies: proj.technologies || '',
        startDate: proj.start_date || '',
        endDate: proj.end_date || '',
        bullets: (Array.isArray(proj.resume_points) ? proj.resume_points : []).map(point => ({
          id: point.id,
          text: point.text_content || '',
          isNonNegotiable: point.is_non_negotiable || false
        }))
      }));
      console.log('✅ Loaded projects:', resumeData.projects.length, 'entries');
      console.log('   Total bullets:', resumeData.projects.reduce((sum, proj) => sum + proj.bullets.length, 0));
    } else {
      console.log('ℹ️ No projects found. Raw data:', projects);
    }

    // 6. Get custom_sections with resume_points
    const { data: customSections, error: customError } = await supabase
      .from('custom_sections')
      .select(`
        *,
        resume_points (*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (customError) {
      console.error('❌ Error loading custom_sections:', customError);
      throw customError;
    }

    if (customSections && Array.isArray(customSections)) {
      resumeData.customSections = customSections.map(custom => ({
        id: custom.id,
        title: custom.title || '',
        subtitle: '', // subtitle column doesn't exist in database
        bullets: (Array.isArray(custom.resume_points) ? custom.resume_points : []).map(point => ({
          id: point.id,
          text: point.text_content || '',
          isNonNegotiable: point.is_non_negotiable || false
        }))
      }));
      console.log('✅ Loaded custom_sections:', resumeData.customSections.length, 'entries');
      console.log('   Total bullets:', resumeData.customSections.reduce((sum, custom) => sum + custom.bullets.length, 0));
    } else {
      console.log('ℹ️ No custom_sections found. Raw data:', customSections);
    }

    // Calculate total bullets
    const countBullets = (items) => items.reduce((sum, item) => sum + (item.bullets?.length || 0), 0);
    resumeData.totalBullets = 
      countBullets(resumeData.experiences) +
      countBullets(resumeData.education) +
      countBullets(resumeData.projects) +
      countBullets(resumeData.customSections) +
      (resumeData.skills?.reduce((sum, group) => sum + (group.skills?.length || 0), 0) || 0);

    console.log('📊 Resume data summary:', {
      experiences: resumeData.experiences.length,
      education: resumeData.education.length,
      projects: resumeData.projects.length,
      customSections: resumeData.customSections.length,
      skills: resumeData.skills.length,
      totalBullets: resumeData.totalBullets
    });

    // Also sync to Chrome storage as backup (only if we have a session)
    chrome.storage.local.set({ resume: resumeData }, () => {});
    
    const normalized = normalizeResume(resumeData);
    console.log('✅ Normalized resume data:', normalized);
    return normalized;
  } catch (error) {
    console.error('❌ Error getting resume from Supabase:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
    // Don't fall back to Chrome storage on error - return empty resume to avoid showing wrong user's data
    // Chrome storage is only used as a backup cache, not as primary storage
    return normalizeResume(null);
  }
}

/**
 * Clear all resume data (master resume) from normalized tables
 * 
 * WARNING: This is a DESTRUCTIVE operation that permanently deletes data from Supabase.
 * Only use this for:
 * - Testing/reset purposes
 * - Force re-initialization of mock data
 * 
 * DO NOT call this during normal sign-out - data should persist per user.
 */
export async function clearResume() {
  const session = await getSession();
  
  if (!session) {
    // Fallback to Chrome storage if not signed in
    return new Promise((resolve, reject) => {
      chrome.storage.local.remove(['resume'], () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
  }

  try {
    const userId = session.user.id;

    // Delete all resume data (cascade will handle resume_points)
    const { error: expError } = await supabase
      .from('experiences')
      .delete()
      .eq('user_id', userId);
    if (expError) throw expError;

    const { error: eduError } = await supabase
      .from('education')
      .delete()
      .eq('user_id', userId);
    if (eduError) throw eduError;

    const { error: projError } = await supabase
      .from('projects')
      .delete()
      .eq('user_id', userId);
    if (projError) throw projError;

    const { error: customError } = await supabase
      .from('custom_sections')
      .delete()
      .eq('user_id', userId);
    if (customError) throw customError;

    const { error: skillsError } = await supabase
      .from('skill_groups')
      .delete()
      .eq('user_id', userId);
    if (skillsError) throw skillsError;

    // Note: We keep personal_info as it's user profile data, not resume-specific

    // Also clear Chrome storage
    chrome.storage.local.remove(['resume'], () => {});
  } catch (error) {
    console.error('Error clearing resume from Supabase:', error);
    // Fallback to Chrome storage on error
    return new Promise((resolve, reject) => {
      chrome.storage.local.remove(['resume'], () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
  }
}

/**
 * Save a generated resume with a name
 * @param {string} name - Name for the resume
 * @param {Object} resumeData - Resume data to save
 */
export async function saveGeneratedResume(name, resumeData, createdAt = null) {
  const session = await getSession();
  const resumeName = name || `Resume ${new Date().toLocaleDateString()}`;

  if (!session) {
    // Fallback to Chrome storage if not signed in
    return new Promise((resolve, reject) => {
      getSavedResumes().then(savedResumes => {
        const newResume = {
          id: `resume-${Date.now()}`,
          name: resumeName,
          data: resumeData,
          createdAt: createdAt || Date.now(),
          updatedAt: createdAt || Date.now()
        };
        
        const updated = [newResume, ...savedResumes];
        chrome.storage.local.set({ savedResumes: updated }, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(newResume);
          }
        });
      }).catch(reject);
    });
  }

  try {
    // Save to Supabase
    const { data, error } = await supabase
      .from('saved_resumes')
      .insert({
        user_id: session.user.id,
        name: resumeName,
        resume_data: resumeData
      })
      .select()
      .single();

    if (error) throw error;

    // Transform to expected format
    const newResume = {
      id: data.id,
      name: data.name,
      data: data.resume_data,
      createdAt: data.created_at ? new Date(data.created_at).getTime() : Date.now(),
      updatedAt: data.updated_at ? new Date(data.updated_at).getTime() : Date.now()
    };

    return newResume;
  } catch (error) {
    console.error('Error saving resume to Supabase:', error);
    // Fallback to Chrome storage on error
    return new Promise((resolve, reject) => {
      getSavedResumes().then(savedResumes => {
        const newResume = {
          id: `resume-${Date.now()}`,
          name: resumeName,
          data: resumeData,
          createdAt: createdAt || Date.now(),
          updatedAt: createdAt || Date.now()
        };
        
        const updated = [newResume, ...savedResumes];
        chrome.storage.local.set({ savedResumes: updated }, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(newResume);
          }
        });
      }).catch(reject);
    });
  }
}

/**
 * Get all saved resumes (excluding master resume)
 * @returns {Promise<Array>} Array of saved resumes
 */
export async function getSavedResumes() {
  const session = await getSession();

  if (!session) {
    // Return empty array when not signed in (don't use Chrome storage to avoid showing wrong user's data)
    return [];
  }

  try {
    // Get all saved resumes from Supabase (excluding master resume)
    const { data, error } = await supabase
      .from('saved_resumes')
      .select('*')
      .eq('user_id', session.user.id)
      .neq('name', MASTER_RESUME_NAME)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Transform to expected format
    const transformedResumes = (data || []).map(resume => ({
      id: resume.id,
      name: resume.name,
      data: resume.resume_data,
      createdAt: resume.created_at ? new Date(resume.created_at).getTime() : Date.now(),
      updatedAt: resume.updated_at ? new Date(resume.updated_at).getTime() : Date.now()
    }));

    return transformedResumes;
  } catch (error) {
    console.error('Error getting saved resumes from Supabase:', error);
    // Don't fall back to Chrome storage on error - return empty array to avoid showing wrong user's data
    return [];
  }
}

/**
 * Delete a saved resume
 * @param {string} resumeId - ID of resume to delete (UUID or Chrome storage ID)
 */
export async function deleteSavedResume(resumeId) {
  const session = await getSession();
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resumeId);

  if (!session || !isUUID) {
    // Fallback to Chrome storage if not signed in or not a UUID
    return new Promise((resolve, reject) => {
      getSavedResumes().then(savedResumes => {
        const updated = savedResumes.filter(r => r.id !== resumeId);
        chrome.storage.local.set({ savedResumes: updated }, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      }).catch(reject);
    });
  }

  try {
    // Delete from Supabase
    const { error } = await supabase
      .from('saved_resumes')
      .delete()
      .eq('id', resumeId)
      .eq('user_id', session.user.id);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting resume from Supabase:', error);
    // Fallback to Chrome storage on error
    return new Promise((resolve, reject) => {
      getSavedResumes().then(savedResumes => {
        const updated = savedResumes.filter(r => r.id !== resumeId);
        chrome.storage.local.set({ savedResumes: updated }, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      }).catch(reject);
    });
  }
}

/**
 * Get a specific saved resume by ID
 * @param {string} resumeId - ID of resume to get (UUID or Chrome storage ID)
 */
export async function getSavedResume(resumeId) {
  const session = await getSession();
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resumeId);

  if (!session || !isUUID) {
    // Fallback to Chrome storage if not signed in or not a UUID
    return new Promise((resolve, reject) => {
      getSavedResumes().then(savedResumes => {
        const resume = savedResumes.find(r => r.id === resumeId);
        resolve(resume || null);
      }).catch(reject);
    });
  }

  try {
    // Get from Supabase
    const { data, error } = await supabase
      .from('saved_resumes')
      .select('*')
      .eq('id', resumeId)
      .eq('user_id', session.user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        return null;
      }
      throw error;
    }

    // Transform to expected format
    return {
      id: data.id,
      name: data.name,
      data: data.resume_data,
      createdAt: data.created_at ? new Date(data.created_at).getTime() : Date.now(),
      updatedAt: data.updated_at ? new Date(data.updated_at).getTime() : Date.now()
    };
  } catch (error) {
    console.error('Error getting saved resume from Supabase:', error);
    // Fallback to Chrome storage on error
    return new Promise((resolve, reject) => {
      getSavedResumes().then(savedResumes => {
        const resume = savedResumes.find(r => r.id === resumeId);
        resolve(resume || null);
      }).catch(reject);
    });
  }
}

/**
 * Storage service object (for convenience)
 */
export const storageService = {
  saveResume,
  getResume,
  clearResume,
  saveGeneratedResume,
  getSavedResumes,
  deleteSavedResume,
  getSavedResume
};


