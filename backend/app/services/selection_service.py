"""
Selection Service - Selects bullets per experience without rewriting.

This service handles the fast selection endpoint that ranks bullets by relevance
and selects the top N bullets per section without any LLM rewriting.
"""

from typing import List, Tuple
from app.core.search import VectorSearch
from app.schemas.rag import (
    StructuredResume, SelectedResume, SelectedExperience, SelectedEducation,
    SelectedProject, SelectedCustomSection, SelectedBullet, Experience,
    Education, Project, CustomSection, Bullet
)
import time

def estimate_latex_lines(text: str, chars_per_line: int = 70) -> int:
    """
    Estimate how many lines a bullet point will take in LaTeX.
    
    Uses a simple heuristic: characters per line in Jake's Resume format.
    
    Args:
        text: Bullet point text
        chars_per_line: Average characters per line in LaTeX
        
    Returns:
        Estimated number of lines
    """
    if not text:
        return 0
    
    # Account for bullet point indentation
    effective_length = len(text) + 4  # Add space for bullet
    
    lines = max(1, (effective_length // chars_per_line) + 1)
    return lines

class SelectionService:
    """
    Service for selecting bullets without rewriting.
    
    This service:
    1. Scores all bullets per experience against job description
    2. Selects top N bullets per section
    3. Returns structured resume with selected bullets
    """
    
    def __init__(self):
        """Initialize the selection service."""
        self.vector_search = VectorSearch()
    
    async def select_bullets(
        self,
        resume: StructuredResume,
        job_description: str,
        bullets_per_experience: int = 3,
        bullets_per_education: int = 2,
        bullets_per_project: int = 2,
        bullets_per_custom: int = 5
    ) -> SelectedResume:
        """
        Select top bullets per section based on relevance.
        
        Args:
            resume: Structured resume with all bullets
            job_description: Job description to match against
            bullets_per_experience: Number of bullets to select per experience
            bullets_per_education: Number of bullets to select per education
            bullets_per_project: Number of bullets to select per project
            bullets_per_custom: Number of bullets to select per custom section
            
        Returns:
            SelectedResume with top bullets per section
        """
        print(f"📋 Selecting bullets for {len(resume.experiences)} experiences...")
        
        # Select from experiences
        selected_experiences = []
        for experience in resume.experiences:
            selected_bullets = await self._select_bullets_for_section(
                experience.bullets,
                job_description,
                bullets_per_experience
            )
            
            selected_experiences.append(SelectedExperience(
                id=experience.id,
                company=experience.company,
                role=experience.role,
                startDate=experience.startDate,
                endDate=experience.endDate,
                selectedBullets=selected_bullets
            ))
        
        # Select from education
        selected_education = []
        for edu in resume.education:
            selected_bullets = await self._select_bullets_for_section(
                edu.bullets,
                job_description,
                bullets_per_education
            )
            
            selected_education.append(SelectedEducation(
                id=edu.id,
                school=edu.school,
                degree=edu.degree,
                field=edu.field,
                startDate=edu.startDate,
                endDate=edu.endDate,
                selectedBullets=selected_bullets
            ))
        
        # Select from projects
        selected_projects = []
        for project in resume.projects:
            selected_bullets = await self._select_bullets_for_section(
                project.bullets,
                job_description,
                bullets_per_project
            )
            
            selected_projects.append(SelectedProject(
                id=project.id,
                name=project.name,
                description=project.description,
                technologies=project.technologies,
                startDate=project.startDate,
                endDate=project.endDate,
                selectedBullets=selected_bullets
            ))
        
        # Select from custom sections
        selected_custom = []
        for section in resume.customSections:
            selected_bullets = await self._select_bullets_for_section(
                section.bullets,
                job_description,
                bullets_per_custom
            )
            
            selected_custom.append(SelectedCustomSection(
                id=section.id,
                title=section.title,
                subtitle=section.subtitle,
                selectedBullets=selected_bullets
            ))
        
        return SelectedResume(
            experiences=selected_experiences,
            education=selected_education,
            projects=selected_projects,
            customSections=selected_custom
        )
    
    async def _select_bullets_for_section(
        self,
        bullets: List[Bullet],
        job_description: str,
        top_n: int
    ) -> List[SelectedBullet]:
        """
        Select top N bullets from a section based on relevance.
        
        Args:
            bullets: List of bullets to score
            job_description: Job description to match against
            top_n: Number of top bullets to select
            
        Returns:
            List of selected bullets with scores
        """
        if not bullets:
            return []
        
        # Score all bullets
        bullet_scores = []
        
        # Generate embedding for job description once
        try:
            job_embedding = self.vector_search.embedding_generator.generate_embedding(job_description)
        except Exception as e:
            print(f"⚠️ Error generating job embedding: {e}")
            job_embedding = None
        
        for bullet in bullets:
            try:
                if job_embedding:
                    # Generate embedding for bullet text
                    bullet_embedding = self.vector_search.embedding_generator.generate_embedding(bullet.text)
                    
                    if bullet_embedding:
                        # Calculate cosine similarity
                        import numpy as np
                        similarity = np.dot(bullet_embedding, job_embedding) / (
                            np.linalg.norm(bullet_embedding) * np.linalg.norm(job_embedding)
                        )
                        score = float(similarity)
                    else:
                        # Fallback: simple keyword matching
                        score = self._simple_keyword_match(bullet.text, job_description)
                else:
                    # Fallback: simple keyword matching
                    score = self._simple_keyword_match(bullet.text, job_description)
                
                bullet_scores.append((bullet, score))
            except Exception as e:
                print(f"⚠️ Error scoring bullet '{bullet.text[:50]}...': {e}")
                # Fallback to simple keyword matching
                score = self._simple_keyword_match(bullet.text, job_description)
                bullet_scores.append((bullet, score))
        
        # Sort by score (highest first)
        bullet_scores.sort(key=lambda x: x[1], reverse=True)
        
        # Take top N
        top_bullets = bullet_scores[:top_n]
        
        # Convert to SelectedBullet format
        selected = []
        for bullet, score in top_bullets:
            selected.append(SelectedBullet(
                id=bullet.id,
                text=bullet.text,  # Original text (no rewriting)
                relevanceScore=round(score, 3),
                lineCount=estimate_latex_lines(bullet.text)
            ))
        
        return selected
    
    def _simple_keyword_match(self, bullet_text: str, job_description: str) -> float:
        """
        Simple keyword matching fallback (no API calls).
        
        Args:
            bullet_text: Bullet point text
            job_description: Job description
            
        Returns:
            Similarity score (0-1)
        """
        bullet_lower = bullet_text.lower()
        job_lower = job_description.lower()
        
        # Extract keywords from job description
        job_words = set(job_lower.split())
        
        # Count matching words
        bullet_words = set(bullet_lower.split())
        matches = len(job_words.intersection(bullet_words))
        
        # Normalize by total unique words
        total_words = len(job_words.union(bullet_words))
        if total_words == 0:
            return 0.0
        
        return matches / total_words

def calculate_total_lines(selected_resume: SelectedResume) -> int:
    """
    Calculate total estimated LaTeX lines for the selected resume.
    
    Args:
        selected_resume: Resume with selected bullets
        
    Returns:
        Total estimated lines
    """
    total = 0
    
    # Count lines from all sections
    for exp in selected_resume.experiences:
        total += sum(bullet.lineCount or 1 for bullet in exp.selectedBullets)
        # Add space for section headers (rough estimate)
        if exp.selectedBullets:
            total += 2
    
    for edu in selected_resume.education:
        total += sum(bullet.lineCount or 1 for bullet in edu.selectedBullets)
        if edu.selectedBullets:
            total += 2
    
    for proj in selected_resume.projects:
        total += sum(bullet.lineCount or 1 for bullet in proj.selectedBullets)
        if proj.selectedBullets:
            total += 2
    
    for section in selected_resume.customSections:
        total += sum(bullet.lineCount or 1 for bullet in section.selectedBullets)
        if section.selectedBullets:
            total += 2
    
    return total

def identify_gaps(selected_resume: SelectedResume, job_description: str) -> List[str]:
    """
    Identify skill gaps between resume and job description.
    
    This is a simple implementation - can be enhanced with LLM later.
    
    Args:
        selected_resume: Selected resume
        job_description: Job description
        
    Returns:
        List of identified gaps
    """
    # Simple keyword extraction from job description
    job_lower = job_description.lower()
    
    # Common tech keywords
    tech_keywords = [
        'python', 'javascript', 'react', 'node', 'aws', 'kubernetes',
        'docker', 'microservices', 'api', 'sql', 'mongodb', 'postgresql',
        'machine learning', 'ai', 'ml', 'tensorflow', 'pytorch'
    ]
    
    gaps = []
    for keyword in tech_keywords:
        if keyword in job_lower:
            # Check if keyword appears in resume
            found = False
            resume_text = ""
            for exp in selected_resume.experiences:
                resume_text += " ".join(b.text.lower() for b in exp.selectedBullets)
            
            if keyword not in resume_text:
                gaps.append(keyword.title())
    
    return gaps[:5]  # Return top 5 gaps

