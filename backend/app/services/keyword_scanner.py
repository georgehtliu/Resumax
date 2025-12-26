"""
Keyword Scanner Service - Scans resume for keywords from job description.

This service extracts keywords from job descriptions and checks if they appear
in the resume, providing:
- Found keywords (with context)
- Missing keywords (gaps)
- Match statistics
"""

from typing import List, Dict, Set, Optional
from app.core.search import VectorSearch
from app.core.keyword_patterns import GENERIC_WORDS
from app.core.tech_dictionary import extract_tech_keywords, is_tech_tool, is_tech_area
from app.schemas.rag import StructuredResume
import re

class KeywordScanner:
    """
    Scans resume for keywords from job description.
    
    Provides:
    - Found keywords (with context)
    - Missing keywords (gaps)
    - Match statistics
    """
    
    def __init__(self):
        self.vector_search = VectorSearch()
    
    def scan_resume(
        self,
        resume: StructuredResume,
        job_description: str
    ) -> Dict:
        """
        Scan resume for keywords from job description.
        
        Returns:
            {
                'found_keywords': [
                    {
                        'keyword': 'python',
                        'found_in': ['experience: Google - bullet 1', 'projects: ML Project'],
                        'match_count': 3,
                        'is_required': True
                    }
                ],
                'missing_keywords': [
                    {
                        'keyword': 'kubernetes',
                        'is_required': True,
                        'category': 'infrastructure'
                    }
                ],
                'statistics': {
                    'total_keywords': 25,
                    'found_count': 18,
                    'missing_count': 7,
                    'match_percentage': 72.0
                }
            }
        """
        # Step 1: Extract keywords from JD
        jd_keywords = self._extract_jd_keywords(job_description)
        
        if not jd_keywords:
            return {
                'found_keywords': [],
                'missing_keywords': [],
                'statistics': {
                    'total_keywords': 0,
                    'found_count': 0,
                    'missing_count': 0,
                    'match_percentage': 0.0
                }
            }
        
        # Step 2: Build resume text from all sections
        resume_sections = self._build_resume_text(resume)
        
        # Step 3: Find matches
        found_keywords = self._find_matches(jd_keywords, resume_sections, resume)
        
        # Step 4: Identify missing keywords
        found_keyword_set = {kw['keyword'].lower() for kw in found_keywords}
        missing_keywords = [
            self._create_missing_keyword(kw, job_description)
            for kw in jd_keywords
            if kw.lower() not in found_keyword_set
        ]
        
        # Step 5: Calculate statistics
        stats = self._calculate_statistics(
            len(jd_keywords),
            len(found_keywords),
            len(missing_keywords)
        )
        
        return {
            'found_keywords': found_keywords,
            'missing_keywords': missing_keywords,
            'statistics': stats
        }
    
    def _extract_jd_keywords(self, job_description: str) -> List[str]:
        """Extract keywords from job description using dictionary-based matching."""
        # Use dictionary-based extraction for tech tools and areas
        dictionary_keywords = extract_tech_keywords(job_description)
        
        # Also extract from "required" and "must have" sections
        required_keywords = self._extract_required_keywords(job_description)
        
        # Combine and deduplicate
        all_keywords = list(set(dictionary_keywords + required_keywords))
        
        # Filter out generic words that aren't technical skills
        technical_keywords = [
            kw for kw in all_keywords 
            if kw.lower() not in GENERIC_WORDS and len(kw) > 2
        ]
        
        return technical_keywords
    
    def _extract_required_keywords(self, text: str) -> List[str]:
        """Extract keywords from 'required' or 'must have' sections using dictionary."""
        required_keywords = []
        
        # Find "required" or "must have" sections
        required_patterns = [
            r'(?:required|must have|must-have|required skills?)[:\s]+(.*?)(?:\n\n|$)',
            r'(?:qualifications?|requirements?)[:\s]+(.*?)(?:\n\n|$)',
        ]
        
        for pattern in required_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE | re.DOTALL)
            for match in matches:
                section_text = match.group(1)
                # Extract keywords from this section using dictionary
                section_keywords = extract_tech_keywords(section_text)
                required_keywords.extend(section_keywords)
        
        # Filter out generic words
        filtered_keywords = [
            kw for kw in required_keywords 
            if kw.lower() not in GENERIC_WORDS and len(kw) > 2
        ]
        
        return filtered_keywords
    
    def _build_resume_text(self, resume: StructuredResume) -> Dict[str, str]:
        """
        Build searchable text from all resume sections.
        
        Returns dict mapping section names to their text content.
        """
        sections = {}
        
        # Experiences
        exp_texts = []
        for exp in resume.experiences:
            exp_header = f"{exp.company} - {exp.role}"
            bullets = " ".join(bullet.text for bullet in exp.bullets)
            exp_texts.append(f"{exp_header}: {bullets}")
        sections['experiences'] = " ".join(exp_texts)
        
        # Projects
        proj_texts = []
        for proj in resume.projects:
            proj_header = proj.name
            bullets = " ".join(bullet.text for bullet in proj.bullets)
            proj_texts.append(f"{proj_header}: {bullets}")
        sections['projects'] = " ".join(proj_texts)
        
        # Education
        edu_texts = []
        for edu in resume.education:
            edu_header = f"{edu.school} - {edu.degree}"
            bullets = " ".join(bullet.text for bullet in edu.bullets)
            edu_texts.append(f"{edu_header}: {bullets}")
        sections['education'] = " ".join(edu_texts)
        
        # Skills
        skill_texts = []
        for skill_group in resume.skills:
            skills = ", ".join(skill_group.skills)
            skill_texts.append(f"{skill_group.title}: {skills}")
        sections['skills'] = " ".join(skill_texts)
        
        # Custom sections
        custom_texts = []
        for section in resume.customSections:
            bullets = " ".join(bullet.text for bullet in section.bullets)
            custom_texts.append(f"{section.title}: {bullets}")
        sections['custom'] = " ".join(custom_texts)
        
        return sections
    
    def _find_matches(
        self,
        keywords: List[str],
        resume_sections: Dict[str, str],
        resume: StructuredResume
    ) -> List[Dict]:
        """Find where keywords appear in resume."""
        found_keywords = []
        
        for keyword in keywords:
            keyword_lower = keyword.lower()
            matches = []
            match_count = 0
            
            # Check each section
            for section_name, section_text in resume_sections.items():
                section_lower = section_text.lower()
                
                # Count occurrences
                count = section_lower.count(keyword_lower)
                if count > 0:
                    match_count += count
                    
                    # Find specific locations
                    if section_name == 'experiences':
                        matches.extend(
                            self._find_in_experiences(keyword_lower, resume.experiences)
                        )
                    elif section_name == 'projects':
                        matches.extend(
                            self._find_in_projects(keyword_lower, resume.projects)
                        )
                    elif section_name == 'education':
                        matches.extend(
                            self._find_in_education(keyword_lower, resume.education)
                        )
                    elif section_name == 'skills':
                        matches.extend(
                            self._find_in_skills(keyword_lower, resume.skills)
                        )
            
            if match_count > 0:
                found_keywords.append({
                    'keyword': keyword,
                    'found_in': matches[:5],  # Limit to top 5 locations
                    'match_count': match_count,
                    'is_required': False  # Will be set based on JD analysis
                })
        
        return found_keywords
    
    def _find_in_experiences(self, keyword: str, experiences: List) -> List[str]:
        """Find keyword in experiences with context."""
        locations = []
        for exp in experiences:
            for idx, bullet in enumerate(exp.bullets, 1):
                if keyword in bullet.text.lower():
                    locations.append(f"{exp.company} - {exp.role} (bullet {idx})")
        return locations
    
    def _find_in_projects(self, keyword: str, projects: List) -> List[str]:
        """Find keyword in projects with context."""
        locations = []
        for proj in projects:
            for idx, bullet in enumerate(proj.bullets, 1):
                if keyword in bullet.text.lower():
                    locations.append(f"{proj.name} (bullet {idx})")
        return locations
    
    def _find_in_education(self, keyword: str, education: List) -> List[str]:
        """Find keyword in education with context."""
        locations = []
        for edu in education:
            if keyword in edu.school.lower() or keyword in (edu.degree or "").lower():
                locations.append(f"{edu.school} - {edu.degree}")
            for idx, bullet in enumerate(edu.bullets, 1):
                if keyword in bullet.text.lower():
                    locations.append(f"{edu.school} (bullet {idx})")
        return locations
    
    def _find_in_skills(self, keyword: str, skills: List) -> List[str]:
        """Find keyword in skills."""
        locations = []
        for skill_group in skills:
            for skill in skill_group.skills:
                if keyword in skill.lower():
                    locations.append(f"Skills: {skill_group.title}")
        return locations
    
    def _create_missing_keyword(self, keyword: str, job_description: str) -> Dict:
        """Create missing keyword entry with metadata."""
        # Determine if required based on JD context
        jd_lower = job_description.lower()
        keyword_lower = keyword.lower()
        
        # Check if keyword appears in "required" sections
        # Look for keyword near "required", "must have", etc.
        required_pattern = r'(?:required|must have|must-have|essential|necessary).*?' + re.escape(keyword_lower)
        is_required = bool(re.search(required_pattern, jd_lower, re.IGNORECASE))
        
        # Categorize keyword
        category = self._categorize_keyword(keyword)
        
        return {
            'keyword': keyword,
            'is_required': is_required,
            'category': category
        }
    
    def _categorize_keyword(self, keyword: str) -> str:
        """Categorize keyword into groups."""
        keyword_lower = keyword.lower()
        
        # Programming languages
        languages = ['python', 'java', 'javascript', 'typescript', 'go', 'golang', 'rust', 'c++', 'c#', 'c', 'scala', 'kotlin', 'swift', 'ruby', 'php', 'perl', 'r', 'matlab']
        if keyword_lower in languages:
            return 'programming_language'
        
        # Frameworks
        frameworks = ['react', 'vue', 'angular', 'django', 'flask', 'express', 'fastapi', 'spring', 'rails', 'laravel']
        if keyword_lower in frameworks:
            return 'framework'
        
        # Infrastructure
        infra = ['aws', 'docker', 'kubernetes', 'k8s', 'terraform', 'ci/cd', 'jenkins', 'github actions', 'gcp', 'azure']
        if keyword_lower in infra:
            return 'infrastructure'
        
        # Databases
        databases = ['postgresql', 'mysql', 'mongodb', 'redis', 'cassandra', 'dynamodb', 'elasticsearch']
        if keyword_lower in databases:
            return 'database'
        
        # Cloud services
        cloud = ['s3', 'lambda', 'ec2', 'rds', 'cloudfront', 'api gateway']
        if keyword_lower in cloud:
            return 'cloud_service'
        
        # Default
        return 'other'
    
    def _calculate_statistics(
        self,
        total: int,
        found: int,
        missing: int
    ) -> Dict:
        """Calculate match statistics."""
        match_percentage = (found / total * 100) if total > 0 else 0.0
        
        return {
            'total_keywords': total,
            'found_count': found,
            'missing_count': missing,
            'match_percentage': round(match_percentage, 1)
        }

