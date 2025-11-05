"""
Optimization Service - Selects and rewrites bullets.

This service:
1. Uses SelectionService to select top bullets per experience
2. Rewrites selected bullets using LLM
3. Returns structured resume with rewritten bullets
"""

from typing import List
from app.services.selection_service import SelectionService, calculate_total_lines, identify_gaps
from app.services.unified_optimizer import UnifiedOptimizer
from app.schemas.rag import (
    StructuredResume, SelectedResume, SelectedBullet, SelectedExperience,
    SelectedEducation, SelectedProject, SelectedCustomSection
)
import time

class OptimizationService:
    """
    Service for selecting AND rewriting bullets.
    
    This service combines selection (fast) with rewriting (slower LLM calls).
    """
    
    def __init__(self):
        """Initialize the optimization service."""
        self.selection_service = SelectionService()
        self.unified_optimizer = UnifiedOptimizer()
    
    async def optimize_resume(
        self,
        resume: StructuredResume,
        job_description: str,
        bullets_per_experience: int = 3,
        bullets_per_education: int = 2,
        bullets_per_project: int = 2,
        bullets_per_custom: int = 5,
        rewrite_style: str = "professional",
        optimization_mode: str = "strict"
    ) -> SelectedResume:
        """
        Select top bullets AND rewrite them.
        
        Args:
            resume: Structured resume with all bullets
            job_description: Job description to match against
            bullets_per_experience: Number of bullets to select per experience
            bullets_per_education: Number of bullets to select per education
            bullets_per_project: Number of bullets to select per project
            bullets_per_custom: Number of bullets to select per custom section
            rewrite_style: Style for rewriting (professional, technical, concise)
            optimization_mode: Optimization mode (strict or creative)
            
        Returns:
            SelectedResume with selected and rewritten bullets
        """
        print(f"✨ Optimizing resume with selection + rewriting...")
        
        # Step 1: Select bullets (fast - no LLM)
        selected_resume = await self.selection_service.select_bullets(
            resume,
            job_description,
            bullets_per_experience,
            bullets_per_education,
            bullets_per_project,
            bullets_per_custom
        )
        
        print(f"✅ Selected bullets, now rewriting...")
        
        # Step 2: Rewrite selected bullets (slow - LLM calls)
        optimized_experiences = []
        for exp in selected_resume.experiences:
            rewritten_bullets = await self._rewrite_bullets(
                exp.selectedBullets,
                job_description,
                rewrite_style
            )
            
            optimized_experiences.append(SelectedExperience(
                id=exp.id,
                company=exp.company,
                role=exp.role,
                startDate=exp.startDate,
                endDate=exp.endDate,
                selectedBullets=rewritten_bullets
            ))
        
        # Rewrite education bullets
        optimized_education = []
        for edu in selected_resume.education:
            rewritten_bullets = await self._rewrite_bullets(
                edu.selectedBullets,
                job_description,
                rewrite_style
            )
            
            optimized_education.append(SelectedEducation(
                id=edu.id,
                school=edu.school,
                degree=edu.degree,
                field=edu.field,
                startDate=edu.startDate,
                endDate=edu.endDate,
                selectedBullets=rewritten_bullets
            ))
        
        # Rewrite project bullets
        optimized_projects = []
        for proj in selected_resume.projects:
            rewritten_bullets = await self._rewrite_bullets(
                proj.selectedBullets,
                job_description,
                rewrite_style
            )
            
            optimized_projects.append(SelectedProject(
                id=proj.id,
                name=proj.name,
                description=proj.description,
                technologies=proj.technologies,
                startDate=proj.startDate,
                endDate=proj.endDate,
                selectedBullets=rewritten_bullets
            ))
        
        # Rewrite custom section bullets
        optimized_custom = []
        for section in selected_resume.customSections:
            rewritten_bullets = await self._rewrite_bullets(
                section.selectedBullets,
                job_description,
                rewrite_style
            )
            
            optimized_custom.append(SelectedCustomSection(
                id=section.id,
                title=section.title,
                subtitle=section.subtitle,
                selectedBullets=rewritten_bullets
            ))
        
        return SelectedResume(
            experiences=optimized_experiences,
            education=optimized_education,
            projects=optimized_projects,
            customSections=optimized_custom
        )
    
    async def _rewrite_bullets(
        self,
        selected_bullets: List[SelectedBullet],
        job_description: str,
        rewrite_style: str
    ) -> List[SelectedBullet]:
        """
        Rewrite selected bullets using LLM.
        
        Args:
            selected_bullets: List of selected bullets to rewrite
            job_description: Job description for context
            rewrite_style: Style for rewriting
            
        Returns:
            List of rewritten bullets
        """
        if not selected_bullets:
            return []
        
        # Collect bullet texts
        bullet_texts = [bullet.text for bullet in selected_bullets]
        
        try:
            # Use unified optimizer to rewrite bullets
            optimization_result = await self.unified_optimizer.optimize_resume(
                bullets=bullet_texts,
                job_description=job_description,
                mode="strict",  # Use strict mode for rewriting
                similarity_scores={text: bullet.relevanceScore for text, bullet in zip(bullet_texts, selected_bullets)}
            )
            
            # Map rewritten bullets back
            rewritten_bullets = []
            for i, bullet in enumerate(selected_bullets):
                # Find matching rewritten bullet
                rewritten_text = bullet.text  # Default to original
                reasoning = None
                
                if optimization_result and "rankings" in optimization_result:
                    for ranking in optimization_result["rankings"]:
                        if ranking.get("original") == bullet.text:
                            rewritten_text = ranking.get("rewritten", bullet.text)
                            reasoning = ranking.get("improvement_reasoning", "")
                            break
                
                rewritten_bullets.append(SelectedBullet(
                    id=bullet.id,
                    text=rewritten_text,  # Use rewritten text as main text
                    relevanceScore=bullet.relevanceScore,
                    lineCount=bullet.lineCount,
                    original=bullet.text,  # Keep original
                    rewritten=rewritten_text,  # Store rewritten version
                    reasoning=reasoning
                ))
            
            return rewritten_bullets
            
        except Exception as e:
            print(f"⚠️ Error rewriting bullets: {e}")
            # Return original bullets if rewriting fails
            return selected_bullets

