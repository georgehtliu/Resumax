"""
Selection Service - Selects bullets per experience without rewriting.

This service handles the fast selection endpoint that ranks bullets by relevance
and selects the top N bullets per section without any LLM rewriting.

Now includes profile-based adaptive selection that adjusts strategy based on
resume characteristics (density, distribution, experience patterns).
"""

from typing import List, Optional, Tuple, Dict
import math
import heapq
import numpy as np
from datetime import datetime
from app.core.search import VectorSearch
from app.schemas.rag import (
    StructuredResume, SelectedResume, SelectedExperience, SelectedEducation,
    SelectedProject, SelectedCustomSection, SelectedBullet, Bullet, Experience
)

def estimate_latex_lines(text: str, chars_per_line: int = 110) -> int:
    """
    Estimate how many lines a bullet point will take in LaTeX.
    
    Uses a simple heuristic: characters per line in Jake's Resume format.
    Standard character count per line for resume formatting.
    
    Args:
        text: Bullet point text
        chars_per_line: Average characters per line in LaTeX (default 110)
        
    Returns:
        Estimated number of lines
    """
    if not text:
        return 0
    
    # Account for bullet point indentation
    effective_length = len(text or "") + 2  # Small bias for bullet indent

    if effective_length <= 0:
        return 0

    lines = max(1, math.ceil(effective_length / chars_per_line))
    # Don't cap at 3 - allow longer bullets to be estimated correctly
    return lines

# Prestigious companies that should be included even if less relevant
PRESTIGIOUS_COMPANIES = {
    # FAANG
    'google', 'meta', 'facebook', 'amazon', 'apple', 'netflix', 'microsoft',
    # Other top tech
    'tesla', 'nvidia', 'uber', 'airbnb', 'stripe', 'palantir', 'databricks',
    'snowflake', 'databricks', 'openai', 'anthropic', 'linkedin', 'twitter',
    'x.com', 'snapchat', 'tiktok', 'bytedance', 'alphabet', 'salesforce',
    'oracle', 'adobe', 'intel', 'amd', 'qualcomm', 'cisco', 'ibm',
    # Unicorns & well-known startups
    'databricks', 'snowflake', 'stripe', 'square', 'coinbase', 'robinhood',
    'doordash', 'instacart', 'zoom', 'slack', 'notion', 'figma', 'canva',
    'discord', 'reddit', 'pinterest', 'spotify', 'dropbox', 'box',
    # Finance & Consulting
    'goldman sachs', 'morgan stanley', 'jpmorgan', 'mckinsey', 'bain',
    'boston consulting group', 'bcg', 'deloitte', 'pwc', 'ey', 'kpmg'
}


class ResumeProfileDetector:
    """
    Detects resume profile based on content characteristics.
    Focuses on constraint management, not user types.
    """
    
    MAX_LINES = 42
    HEADER_LINES = 3  # Personal info + spacing
    SKILLS_LINES = 2
    
    @staticmethod
    def detect_profile(resume: StructuredResume) -> Dict:
        """
        Returns profile characteristics:
        {
            'density': 'high' | 'medium' | 'low',
            'distribution': 'experience_heavy' | 'project_heavy' | 'education_heavy' | 'balanced',
            'experience_pattern': 'many_short' | 'few_deep' | 'many_deep' | 'standard' | 'none',
            'compression_needed': float,  # 0.0-1.0, how much compression needed
            'available_lines': int  # Lines available after fixed sections
        }
        """
        # Calculate total content
        total_experience_lines = sum(
            len(exp.bullets) * 1.5 + 2  # ~1.5 lines per bullet + header
            for exp in resume.experiences
        )
        total_project_lines = sum(
            len(proj.bullets) * 1.5 + 2
            for proj in resume.projects
        )
        total_education_lines = sum(
            len(edu.bullets) * 1.5 + 2
            for edu in resume.education
        )
        total_custom_lines = sum(
            len(sec.bullets) * 1.5 + 2
            for sec in resume.customSections
        )
        
        total_content = total_experience_lines + total_project_lines + total_education_lines + total_custom_lines
        
        # Dimension 1: Density
        if total_content > 60:
            density = 'high'
        elif total_content > 30:
            density = 'medium'
        else:
            density = 'low'
        
        # Dimension 2: Distribution
        total_variable = total_experience_lines + total_project_lines + total_education_lines + total_custom_lines
        if total_variable == 0:
            distribution = 'balanced'
        else:
            exp_ratio = total_experience_lines / total_variable
            proj_ratio = total_project_lines / total_variable
            edu_ratio = total_education_lines / total_variable
            
            if exp_ratio > 0.7:
                distribution = 'experience_heavy'
            elif proj_ratio > 0.5:
                distribution = 'project_heavy'
            elif edu_ratio > 0.4:
                distribution = 'education_heavy'
            else:
                distribution = 'balanced'
        
        # Dimension 3: Experience Pattern
        num_experiences = len(resume.experiences)
        if num_experiences == 0:
            experience_pattern = 'none'
        else:
            avg_bullets = sum(len(exp.bullets) for exp in resume.experiences) / num_experiences
            
            if num_experiences >= 4 and avg_bullets < 3:
                experience_pattern = 'many_short'
            elif num_experiences <= 3 and avg_bullets >= 5:
                experience_pattern = 'few_deep'
            elif num_experiences >= 4 and avg_bullets >= 4:
                experience_pattern = 'many_deep'
            else:
                experience_pattern = 'standard'
        
        # Calculate compression needed
        available_lines = ResumeProfileDetector.MAX_LINES - ResumeProfileDetector.HEADER_LINES - ResumeProfileDetector.SKILLS_LINES
        compression_needed = max(0, min(1.0, (total_content - available_lines) / total_content)) if total_content > 0 else 0.0
        
        return {
            'density': density,
            'distribution': distribution,
            'experience_pattern': experience_pattern,
            'compression_needed': compression_needed,
            'available_lines': available_lines,
            'total_content': total_content
        }


class AdaptiveSpaceAllocator:
    """
    Allocates space based on profile characteristics.
    General strategy: Maximize relevance within constraint.
    """
    
    @staticmethod
    def allocate_space(profile: Dict) -> Dict:
        """
        Returns space allocation:
        {
            'experiences': int,
            'projects': int,
            'education': int,
            'custom': int,
            'strategy': str  # Compression strategy
        }
        """
        available = profile['available_lines']
        density = profile['density']
        distribution = profile['distribution']
        exp_pattern = profile['experience_pattern']
        
        # Base allocation based on distribution
        if distribution == 'experience_heavy':
            # Prioritize experiences
            exp_lines = int(available * 0.75)
            proj_lines = int(available * 0.15)
            edu_lines = int(available * 0.08)
            custom_lines = available - exp_lines - proj_lines - edu_lines
            
        elif distribution == 'project_heavy':
            # Prioritize projects
            exp_lines = int(available * 0.40)
            proj_lines = int(available * 0.45)
            edu_lines = int(available * 0.10)
            custom_lines = available - exp_lines - proj_lines - edu_lines
            
        elif distribution == 'education_heavy':
            # Prioritize education (rare but possible)
            exp_lines = int(available * 0.50)
            proj_lines = int(available * 0.20)
            edu_lines = int(available * 0.25)
            custom_lines = available - exp_lines - proj_lines - edu_lines
            
        else:  # balanced
            # Even distribution
            exp_lines = int(available * 0.55)
            proj_lines = int(available * 0.30)
            edu_lines = int(available * 0.10)
            custom_lines = available - exp_lines - proj_lines - edu_lines
        
        # Adjust based on experience pattern
        if exp_pattern == 'many_short':
            # Strategy: Fit more experiences with fewer bullets
            strategy = 'compress_bullets_per_exp'
        elif exp_pattern == 'few_deep':
            # Strategy: Can afford more bullets per experience
            strategy = 'allow_more_bullets'
        elif exp_pattern == 'many_deep':
            # Strategy: Aggressive compression, prioritize relevance
            strategy = 'aggressive_compression'
        else:
            strategy = 'standard'
        
        # Adjust for density
        if density == 'high':
            # Reduce all allocations slightly for buffer
            exp_lines = int(exp_lines * 0.95)
            proj_lines = int(proj_lines * 0.95)
            edu_lines = int(edu_lines * 0.95)
        
        return {
            'experiences': exp_lines,
            'projects': proj_lines,
            'education': edu_lines,
            'custom': custom_lines,
            'strategy': strategy
        }


class CompressionStrategy:
    """
    Different compression strategies based on profile.
    """
    
    @staticmethod
    def get_bullets_per_experience(profile: Dict, allocation: Dict, num_experiences: int) -> int:
        """Determine initial bullets per experience."""
        strategy = allocation['strategy']
        exp_pattern = profile['experience_pattern']
        
        if strategy == 'compress_bullets_per_exp':
            # Many short experiences: 1-2 bullets each
            if num_experiences >= 6:
                return 1
            elif num_experiences >= 4:
                return 2
            else:
                return 2
        
        elif strategy == 'allow_more_bullets':
            # Few deep experiences: 3-4 bullets each
            if num_experiences <= 2:
                return 4
            else:
                return 3
        
        elif strategy == 'aggressive_compression':
            # Many deep: Start with 2, compress aggressively
            return 2
        
        else:  # standard
            return 3
    
    @staticmethod
    def get_squeeze_behavior(strategy: str) -> Dict:
        """
        Returns squeeze phase behavior:
        {
            'min_bullets_per_exp': int,  # Minimum bullets before removing experience
            'prefer_remove_experience': bool,  # Remove whole experiences vs bullets
            'allow_one_liner': bool,  # Allow experiences with 0 bullets (header only)
            'compression_factor': float  # How aggressive (0.0-1.0)
        }
        """
        behaviors = {
            'compress_bullets_per_exp': {
                'min_bullets_per_exp': 1,  # Can go down to 1 bullet
                'prefer_remove_experience': True,  # Prefer removing whole experiences
                'allow_one_liner': False,
                'compression_factor': 0.7  # Moderate compression
            },
            'allow_more_bullets': {
                'min_bullets_per_exp': 2,  # Keep at least 2 bullets
                'prefer_remove_experience': False,  # Prefer removing bullets
                'allow_one_liner': False,
                'compression_factor': 0.9  # Less aggressive
            },
            'aggressive_compression': {
                'min_bullets_per_exp': 1,  # Can go to 1 bullet
                'prefer_remove_experience': False,  # Remove bullets globally
                'allow_one_liner': True,  # Allow header-only for must-haves
                'compression_factor': 0.5  # Very aggressive
            },
            'standard': {
                'min_bullets_per_exp': 1,
                'prefer_remove_experience': False,
                'allow_one_liner': False,
                'compression_factor': 0.8
            }
        }
        return behaviors.get(strategy, behaviors['standard'])


class SelectionService:
    """
    Service for selecting bullets without rewriting using a hybrid algorithm.
    
    This service implements a 4-phase hybrid algorithm:
    
    Phase 1: Preparation & Valuation
    - Scores all experiences and bullets globally
    - Identifies Must-Haves (Anchor: most recent + Trophy: highest prestige)
    
    Phase 2: Initial Fill (Coarse Selection)
    - Locks must-haves into selection
    - Priority queue selection for remaining experiences
    - Fills with buffer for squeeze phase
    
    Phase 3: The Squeeze (Fine Optimization)
    - Iteratively removes globally lowest-scoring bullets
    - Handles orphan blocks (one-liner mode for must-haves)
    
    Phase 4: Revive (Fill Underutilized Space)
    - Adds back highest-scoring deleted bullets if significantly under limit
    
    Returns structured resume with selected bullets that maximizes relevance
    while fitting within one page (42 lines).
    """
    
    def __init__(self):
        """Initialize the selection service."""
        self.vector_search = VectorSearch()
        self.max_lines = 42  # One page limit
        self.profile_detector = ResumeProfileDetector()
        self.space_allocator = AdaptiveSpaceAllocator()
        self.compression_strategy = CompressionStrategy()
    
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
        Now uses profile-based adaptive selection.
        
        Args:
            resume: Structured resume with all bullets
            job_description: Job description to match against
            bullets_per_experience: Number of bullets to select per experience (initial, may be adjusted)
            bullets_per_education: Number of bullets to select per education
            bullets_per_project: Number of bullets to select per project
            bullets_per_custom: Number of bullets to select per custom section
            
        Returns:
            SelectedResume with top bullets per section
        """
        print(f"📋 Selecting bullets for {len(resume.experiences)} experiences...")

        # Step 1: Detect profile
        profile = self.profile_detector.detect_profile(resume)
        print(f"📊 Profile detected: density={profile['density']}, distribution={profile['distribution']}, pattern={profile['experience_pattern']}")
        
        # Step 2: Allocate space based on profile
        space_allocation = self.space_allocator.allocate_space(profile)
        print(f"📐 Space allocation: experiences={space_allocation['experiences']}, projects={space_allocation['projects']}, strategy={space_allocation['strategy']}")

        job_embedding = self._generate_job_embedding(job_description)

        # Step 3: Adjust bullets per experience based on profile
        adaptive_bullets_per_exp = self.compression_strategy.get_bullets_per_experience(
            profile,
            space_allocation,
            len(resume.experiences)
        )
        print(f"🎯 Adaptive bullets per experience: {adaptive_bullets_per_exp} (requested: {bullets_per_experience})")

        # Step 4: Select experiences with profile-aware strategy
        selected_experiences = await self._select_experiences_with_priority_queue(
            resume.experiences,
            job_description,
            adaptive_bullets_per_exp,
            job_embedding,
            max_lines=space_allocation['experiences'],
            profile=profile,
            allocation=space_allocation
        )
        
        # Select from education
        selected_education = []
        for edu in resume.education:
            selected_bullets = await self._select_bullets_for_section(
                edu.bullets,
                job_description,
                bullets_per_education,
                job_embedding
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
        
        # Select from projects with profile-aware limits
        selected_projects = await self._select_projects_with_limit(
            resume.projects,
            job_description,
            bullets_per_project,
            job_embedding,
            max_lines=space_allocation['projects'],
            profile=profile
        )
        
        # Select from custom sections with profile-aware limits
        selected_custom = await self._select_custom_sections_with_limit(
            resume.customSections,
            job_description,
            bullets_per_custom,
            job_embedding,
            max_lines=space_allocation['custom'],
            profile=profile
        )
        
        return SelectedResume(
            personalInfo=resume.personalInfo,
            skills=resume.skills,
            experiences=selected_experiences,
            education=selected_education,
            projects=selected_projects,
            customSections=selected_custom
        )
    
    def _generate_job_embedding(self, job_description: str) -> Optional[List[float]]:
        """Generate embedding for the job description once per selection request."""
        try:
            embedding = self.vector_search.embedding_generator.generate_embedding(job_description)
            if embedding:
                return embedding
        except Exception as exc:
            print(f"⚠️ Error generating job embedding: {exc}")
        return None

    async def _select_bullets_for_section(
        self,
        bullets: List[Bullet],
        job_description: str,
        top_n: int,
        job_embedding: Optional[List[float]]
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

        # If we have a job embedding, try to score via cosine similarity with batched bullet embeddings
        bullet_embeddings: Optional[List[List[float]]] = None
        job_vector: Optional[np.ndarray] = None
        job_norm: Optional[float] = None

        if job_embedding:
            try:
                bullet_texts = [bullet.text for bullet in bullets]
                bullet_embeddings = self.vector_search.embedding_generator.generate_embeddings_batch(bullet_texts)
                job_vector = np.array(job_embedding, dtype=np.float32)
                job_norm = float(np.linalg.norm(job_vector))
                if job_norm == 0.0:
                    job_vector = None
            except Exception as exc:
                print(f"⚠️ Error generating bullet embeddings: {exc}")
                bullet_embeddings = None
                job_vector = None

        for idx, bullet in enumerate(bullets):
            score: float

            if bullet_embeddings and job_vector is not None and job_norm and idx < len(bullet_embeddings):
                bullet_embedding = bullet_embeddings[idx]

                try:
                    if not bullet_embedding:
                        raise ValueError("Missing bullet embedding")

                    bullet_vector = np.array(bullet_embedding, dtype=np.float32)
                    bullet_norm = float(np.linalg.norm(bullet_vector))
                    denominator = bullet_norm * job_norm

                    if denominator == 0.0:
                        raise ValueError("Zero norm encountered in cosine similarity")

                    similarity = float(np.dot(bullet_vector, job_vector) / denominator)
                    score = similarity
                except Exception as exc:
                    print(f"⚠️ Error scoring bullet '{bullet.text[:50]}...': {exc}")
                    score = self._simple_keyword_match(bullet.text, job_description)
            else:
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
    
    async def _select_experiences_with_priority_queue(
        self,
        experiences: List[Experience],
        job_description: str,
        bullets_per_experience: int,
        job_embedding: Optional[List[float]],
        max_lines: int = 42,
        profile: Optional[Dict] = None,
        allocation: Optional[Dict] = None
    ) -> List[SelectedExperience]:
        """
        Hybrid algorithm: Fast initial selection + Iterative refinement ("The Squeeze").
        Now profile-aware with adaptive compression strategies.
        
        Phase 1: Preparation & Valuation
        - Score all experiences and bullets
        - Identify "Must-Haves" (Anchor + Trophy)
        
        Phase 2: Initial Fill (Coarse Selection)
        - Lock must-haves
        - Priority queue selection for remaining experiences
        
        Phase 3: The Squeeze (Fine Optimization)
        - Iteratively remove globally lowest-scoring bullets
        - Uses profile-aware compression behavior
        - Handle orphan blocks (one-liner mode for must-haves)
        
        Phase 4: Revive (Fill Underutilized Space)
        - Add back highest-scoring deleted bullets if significantly under limit
        
        Args:
            experiences: List of experiences to select from
            job_description: Job description to match against
            bullets_per_experience: Number of bullets per experience (initial)
            job_embedding: Job description embedding
            max_lines: Maximum lines allowed (default 42 for one page)
            profile: Profile characteristics dict (optional)
            allocation: Space allocation dict (optional)
            
        Returns:
            List of selected experiences with bullets
        """
        if not experiences:
            return []
        
        # Get compression behavior based on profile
        squeeze_behavior = None
        if profile and allocation:
            squeeze_behavior = self.compression_strategy.get_squeeze_behavior(allocation['strategy'])
        else:
            # Default behavior
            squeeze_behavior = {
                'min_bullets_per_exp': 1,
                'prefer_remove_experience': False,
                'allow_one_liner': False,
                'compression_factor': 0.8
            }
        
        # ========================================================================
        # PHASE 1: Preparation & Valuation
        # ========================================================================
        
        # Score all experiences and collect all bullets globally
        experience_data = []
        
        for exp in experiences:
            # Score ALL bullets for this experience (not just top N yet)
            all_bullets_scored = await self._score_all_bullets_for_experience(
                exp.bullets,
                job_description,
                job_embedding
            )
            
            # Calculate composite score (using top bullets for block score)
            top_bullets = sorted(all_bullets_scored, key=lambda x: x[1], reverse=True)[:bullets_per_experience]
            selected_bullets = [SelectedBullet(
                id=bullet.id,
                text=bullet.text,
                relevanceScore=score,
                lineCount=estimate_latex_lines(bullet.text)
            ) for bullet, score in top_bullets]
            
            score = self._score_experience(
                exp,
                selected_bullets,
                job_description,
                experiences
            )
            
            line_count = self._estimate_experience_lines(selected_bullets)
            
            experience_data.append({
                'experience': exp,
                'selected_bullets': selected_bullets,
                'all_bullets_scored': all_bullets_scored,
                'score': score,
                'line_count': line_count,
                'is_must_have': False  # Will be set in Phase 2
            })
        
        # ========================================================================
        # PHASE 2: Initial Fill (Coarse Selection)
        # ========================================================================
        
        # Identify Must-Haves: Anchor (most recent) + Trophy (highest prestige)
        anchor_exp = experiences[0] if experiences else None  # Most recent
        trophy_exp = max(experience_data, key=lambda x: self._calculate_prestige_score(x['experience'].company))
        
        must_have_ids = set()
        if anchor_exp:
            must_have_ids.add(anchor_exp.id)
        if trophy_exp['experience'].id != anchor_exp.id:
            must_have_ids.add(trophy_exp['experience'].id)
        
        # Mark must-haves
        for data in experience_data:
            if data['experience'].id in must_have_ids:
                data['is_must_have'] = True
        
        # Lock must-haves into selection
        selected = []
        total_lines = 0
        deleted_bullets = []  # Track deleted bullets for revive phase
        
        for data in experience_data:
            if data['is_must_have']:
                selected.append({
                    'experience': data['experience'],
                    'bullets': data['selected_bullets'].copy(),  # Copy for modification
                    'score': data['score'],
                    'line_count': self._estimate_experience_lines(data['selected_bullets']),
                    'is_must_have': True,
                    'all_bullets_scored': data['all_bullets_scored']
                })
                total_lines += self._estimate_experience_lines(data['selected_bullets'])
        
        # Priority queue for remaining experiences
        remaining_experiences = [data for data in experience_data if not data['is_must_have']]
        remaining_experiences.sort(key=lambda x: x['score'], reverse=True)
        
        # Add remaining experiences until approaching limit (with buffer)
        buffer = int(max_lines * 0.1)  # 10% buffer for squeeze phase
        for data in remaining_experiences:
            line_count = self._estimate_experience_lines(data['selected_bullets'])
            if total_lines + line_count <= max_lines + buffer:
                selected.append({
                    'experience': data['experience'],
                    'bullets': data['selected_bullets'].copy(),
                    'score': data['score'],
                    'line_count': line_count,
                    'is_must_have': False,
                    'all_bullets_scored': data['all_bullets_scored']
                })
                total_lines += line_count
        
        # ========================================================================
        # PHASE 3: The Squeeze (Fine Optimization)
        # ========================================================================
        
        # Iteratively remove globally lowest-scoring bullets until under limit
        max_iterations = 100  # Safety limit
        iteration = 0
        
        while total_lines > max_lines and iteration < max_iterations:
            iteration += 1
            
            # Find globally lowest-scoring bullet across all selected experiences
            # (excluding protected bullets from must-haves with only 1 bullet)
            lowest_bullet = None
            lowest_score = float('inf')
            lowest_exp_idx = -1
            lowest_bullet_idx = -1
            
            for exp_idx, exp_data in enumerate(selected):
                # Skip must-haves with only min_bullets_per_exp bullets (protected)
                min_bullets = squeeze_behavior['min_bullets_per_exp']
                if exp_data['is_must_have'] and len(exp_data['bullets']) <= min_bullets:
                    continue
                
                # Skip if below minimum bullets per experience
                if len(exp_data['bullets']) <= min_bullets:
                    # If prefer_remove_experience is True, we'll remove the whole experience
                    if squeeze_behavior['prefer_remove_experience'] and not exp_data['is_must_have']:
                        # Mark for removal
                        continue
                    else:
                        # Otherwise, protect this bullet
                        continue
                
                for bullet_idx, bullet in enumerate(exp_data['bullets']):
                    if bullet.relevanceScore < lowest_score:
                        lowest_score = bullet.relevanceScore
                        lowest_bullet = bullet
                        lowest_exp_idx = exp_idx
                        lowest_bullet_idx = bullet_idx
            
            if lowest_bullet is None:
                break  # No more bullets to remove (all protected or removed)
            
            # Remove the lowest-scoring bullet
            exp_data = selected[lowest_exp_idx]
            removed_bullet = exp_data['bullets'].pop(lowest_bullet_idx)
            deleted_bullets.append({
                'bullet': Bullet(id=removed_bullet.id, text=removed_bullet.text),
                'score': removed_bullet.relevanceScore,
                'experience': exp_data['experience'],
                'line_count': removed_bullet.lineCount or 1
            })
            
            # Recalculate line count for this experience
            old_line_count = exp_data['line_count']
            exp_data['line_count'] = self._estimate_experience_lines(exp_data['bullets'])
            total_lines = total_lines - old_line_count + exp_data['line_count']
            
            # Handle orphan blocks (experiences with 0 bullets)
            if len(exp_data['bullets']) == 0:
                if exp_data['is_must_have'] and squeeze_behavior['allow_one_liner']:
                    # One-liner mode: Keep experience with just header (company, role, dates)
                    exp_data['line_count'] = 2  # Just header, no bullets
                    total_lines = total_lines - old_line_count + 2
                else:
                    # Remove non-must-have orphan entirely
                    total_lines -= exp_data['line_count']  # Remove current line count
                    # Remove from selected list (iterate backwards to avoid index issues)
                    for i in range(len(selected) - 1, -1, -1):
                        if selected[i]['experience'].id == exp_data['experience'].id:
                            selected.pop(i)
                            break
                    # Break to restart loop with updated selected list
                    break
            # Handle case where experience is at minimum bullets and prefer_remove_experience is True
            elif len(exp_data['bullets']) == squeeze_behavior['min_bullets_per_exp']:
                if squeeze_behavior['prefer_remove_experience'] and not exp_data['is_must_have']:
                    # Remove the whole experience (remove all bullets)
                    while exp_data['bullets']:
                        removed = exp_data['bullets'].pop()
                        deleted_bullets.append({
                            'bullet': Bullet(id=removed.id, text=removed.text),
                            'score': removed.relevanceScore,
                            'experience': exp_data['experience'],
                            'line_count': removed.lineCount or 1
                        })
                    # Now it's an orphan, will be handled in next iteration
                    total_lines -= exp_data['line_count']
                    exp_data['line_count'] = 0
                    # Break to restart loop
                    break
        
        # ========================================================================
        # PHASE 4: Revive (Fill Underutilized Space)
        # ========================================================================
        
        # If significantly under limit, revive highest-scoring deleted bullets
        under_limit_threshold = max_lines - 5  # If 5+ lines under limit
        
        if total_lines < under_limit_threshold and deleted_bullets:
            # Sort deleted bullets by score (highest first)
            deleted_bullets.sort(key=lambda x: x['score'], reverse=True)
            
            for deleted in deleted_bullets:
                if total_lines >= max_lines:
                    break
                
                # Find the experience this bullet belongs to
                exp_data = next(
                    (exp for exp in selected if exp['experience'].id == deleted['experience'].id),
                    None
                )
                
                if exp_data:
                    # Add bullet back to its experience
                    new_bullet = SelectedBullet(
                        id=deleted['bullet'].id,
                        text=deleted['bullet'].text,
                        relevanceScore=deleted['score'],
                        lineCount=deleted['line_count']
                    )
                    exp_data['bullets'].append(new_bullet)
                    exp_data['line_count'] = self._estimate_experience_lines(exp_data['bullets'])
                    total_lines += deleted['line_count']
        
        # ========================================================================
        # Final Formatting & Output
        # ========================================================================
        
        # Sort final selection by score (highest first) for display
        selected.sort(key=lambda x: x['score'], reverse=True)
        
        # Convert to SelectedExperience format
        result = []
        for data in selected:
            exp = data['experience']
            # Only include experiences with bullets OR must-haves in one-liner mode
            if len(data['bullets']) > 0 or data['is_must_have']:
                result.append(SelectedExperience(
                    id=exp.id,
                    company=exp.company,
                    role=exp.role,
                    startDate=exp.startDate,
                    endDate=exp.endDate,
                    selectedBullets=data['bullets']  # Empty list for one-liner mode
                ))
        
        print(f"   Selected {len(result)}/{len(experiences)} experiences ({total_lines}/{max_lines} lines)")
        print(f"   Must-haves: {len([d for d in selected if d['is_must_have']])} (Anchor + Trophy)")
        return result
    
    async def _score_all_bullets_for_experience(
        self,
        bullets: List[Bullet],
        job_description: str,
        job_embedding: Optional[List[float]]
    ) -> List[Tuple[Bullet, float]]:
        """
        Score ALL bullets for an experience (not just top N).
        Used for global bullet optimization in "The Squeeze" phase.
        
        Args:
            bullets: List of bullets to score
            job_description: Job description
            job_embedding: Job embedding
            
        Returns:
            List of (bullet, score) tuples
        """
        if not bullets:
            return []
        
        bullet_scores = []
        
        # Use same scoring logic as _select_bullets_for_section
        bullet_embeddings: Optional[List[List[float]]] = None
        job_vector: Optional[np.ndarray] = None
        job_norm: Optional[float] = None
        
        if job_embedding:
            try:
                bullet_texts = [bullet.text for bullet in bullets]
                bullet_embeddings = self.vector_search.embedding_generator.generate_embeddings_batch(bullet_texts)
                job_vector = np.array(job_embedding, dtype=np.float32)
                job_norm = float(np.linalg.norm(job_vector))
                if job_norm == 0.0:
                    job_vector = None
            except Exception as exc:
                print(f"⚠️ Error generating bullet embeddings: {exc}")
                bullet_embeddings = None
                job_vector = None
        
        for idx, bullet in enumerate(bullets):
            score: float
            
            if bullet_embeddings and job_vector is not None and job_norm and idx < len(bullet_embeddings):
                bullet_embedding = bullet_embeddings[idx]
                
                try:
                    if not bullet_embedding:
                        raise ValueError("Missing bullet embedding")
                    
                    bullet_vector = np.array(bullet_embedding, dtype=np.float32)
                    bullet_norm = float(np.linalg.norm(bullet_vector))
                    denominator = bullet_norm * job_norm
                    
                    if denominator == 0.0:
                        raise ValueError("Zero norm encountered in cosine similarity")
                    
                    similarity = float(np.dot(bullet_vector, job_vector) / denominator)
                    score = similarity
                except Exception as exc:
                    score = self._simple_keyword_match(bullet.text, job_description)
            else:
                score = self._simple_keyword_match(bullet.text, job_description)
            
            bullet_scores.append((bullet, score))
        
        return bullet_scores
    
    def _score_experience(
        self,
        experience: Experience,
        selected_bullets: List[SelectedBullet],
        job_description: str,
        all_experiences: List[Experience]
    ) -> float:
        """
        Calculate composite score for an experience.
        
        Score = (Relevance × 0.5) + (Recency × 0.2) + (Prestige × 0.2) + (Role Match × 0.1)
        
        Args:
            experience: Experience to score
            selected_bullets: Selected bullets for this experience
            job_description: Job description
            all_experiences: All experiences (for determining recency)
            
        Returns:
            Composite score (0-1)
        """
        # Relevance score: average of top bullet scores
        relevance = self._calculate_relevance_score(selected_bullets)
        
        # Recency score: based on position in list (assuming sorted by date)
        recency = self._calculate_recency_score(experience, all_experiences)
        
        # Prestige score: based on company name
        prestige = self._calculate_prestige_score(experience.company)
        
        # Role match score: job title similarity
        role_match = self._calculate_role_match_score(experience.role, job_description)
        
        # Weighted composite score
        composite_score = (
            relevance * 0.5 +
            recency * 0.2 +
            prestige * 0.2 +
            role_match * 0.1
        )
        
        return composite_score
    
    def _calculate_relevance_score(self, selected_bullets: List[SelectedBullet]) -> float:
        """
        Calculate relevance score as average of bullet scores.
        
        Args:
            selected_bullets: Selected bullets with scores
            
        Returns:
            Average relevance score (0-1)
        """
        if not selected_bullets:
            return 0.0
        
        scores = [bullet.relevanceScore for bullet in selected_bullets]
        return sum(scores) / len(scores)
    
    def _calculate_recency_score(
        self,
        experience: Experience,
        all_experiences: List[Experience]
    ) -> float:
        """
        Calculate recency score based on position in experience list.
        
        Assumes experiences are sorted by date (most recent first).
        
        Args:
            experience: Experience to score
            all_experiences: All experiences (sorted by date)
            
        Returns:
            Recency score (0-1)
        """
        if not all_experiences:
            return 0.5
        
        try:
            index = next(i for i, exp in enumerate(all_experiences) if exp.id == experience.id)
            
            # Most recent (index 0): 1.0
            # Within last 2 positions: 0.8
            # Within last 5 positions: 0.5
            # Older: 0.2
            if index == 0:
                return 1.0
            elif index < 2:
                return 0.8
            elif index < 5:
                return 0.5
            else:
                return 0.2
        except StopIteration:
            return 0.5
    
    def _calculate_prestige_score(self, company: str) -> float:
        """
        Calculate prestige score based on company name.
        
        Args:
            company: Company name
            
        Returns:
            Prestige score (0-1)
        """
        if not company:
            return 0.0
        
        company_lower = company.lower().strip()
        
        # Check if company is in prestigious list
        for prestigious in PRESTIGIOUS_COMPANIES:
            if prestigious in company_lower:
                return 1.0
        
        # Known companies (partial match)
        known_indicators = ['inc', 'corp', 'llc', 'ltd', 'technologies', 'tech']
        if any(indicator in company_lower for indicator in known_indicators):
            return 0.6
        
        # Unknown/startup
        return 0.2
    
    def _estimate_other_sections_lines(
        self,
        resume: StructuredResume,
        job_description: str,
        bullets_per_education: int,
        bullets_per_project: int,
        bullets_per_custom: int,
        job_embedding: Optional[List[float]]
    ) -> int:
        """
        Estimate line count for non-experience sections.
        
        Args:
            resume: Structured resume
            job_description: Job description
            bullets_per_education: Bullets per education
            bullets_per_project: Bullets per project
            bullets_per_custom: Bullets per custom section
            job_embedding: Job embedding
            
        Returns:
            Estimated line count for other sections
        """
        total = 0
        
        # Estimate education lines
        for edu in resume.education:
            if edu.bullets:
                # Estimate: 2 lines per bullet + 2 for header
                total += min(bullets_per_education, len(edu.bullets)) * 2 + 2
        
        # Estimate project lines
        for project in resume.projects:
            if project.bullets:
                total += min(bullets_per_project, len(project.bullets)) * 2 + 2
        
        # Estimate custom section lines
        for section in resume.customSections:
            if section.bullets:
                total += min(bullets_per_custom, len(section.bullets)) * 2 + 2
        
        return total
    
    def _calculate_role_match_score(self, role: str, job_description: str) -> float:
        """
        Calculate role match score based on job title similarity.
        
        Args:
            role: Job title/role
            job_description: Job description
            
        Returns:
            Role match score (0-1)
        """
        if not role:
            return 0.0
        
        role_lower = role.lower()
        job_lower = job_description.lower()
        
        # Extract common role keywords
        role_keywords = {
            'engineer', 'developer', 'programmer', 'architect', 'manager',
            'lead', 'senior', 'principal', 'staff', 'director', 'scientist',
            'analyst', 'consultant', 'specialist'
        }
        
        role_words = set(role_lower.split())
        job_words = set(job_lower.split())
        
        # Count matching role-related keywords
        matches = len(role_words.intersection(job_words))
        role_matches = len(role_words.intersection(role_keywords))
        
        if matches > 0:
            return min(1.0, matches / max(1, len(role_words)))
        elif role_matches > 0:
            return 0.5
        else:
            return 0.0
    
    def _is_prestigious_company(self, company: str) -> bool:
        """
        Check if company is prestigious.
        
        Args:
            company: Company name
            
        Returns:
            True if prestigious, False otherwise
        """
        if not company:
            return False
        
        company_lower = company.lower().strip()
        return any(prestigious in company_lower for prestigious in PRESTIGIOUS_COMPANIES)
    
    async def _select_projects_with_limit(
        self,
        projects: List,
        job_description: str,
        bullets_per_project: int,
        job_embedding: Optional[List[float]],
        max_lines: int,
        profile: Dict
    ) -> List[SelectedProject]:
        """
        Select projects with line limit based on profile.
        
        Args:
            projects: List of projects
            job_description: Job description
            bullets_per_project: Initial bullets per project
            job_embedding: Job embedding
            max_lines: Maximum lines allowed for projects
            profile: Profile characteristics
            
        Returns:
            List of selected projects
        """
        if not projects:
            return []
        
        selected_projects = []
        total_lines = 0
        
        # Score all projects and their bullets
        project_data = []
        for project in projects:
            selected_bullets = await self._select_bullets_for_section(
                project.bullets,
                job_description,
                bullets_per_project,
                job_embedding
            )
            
            # Estimate lines for this project
            bullet_lines = sum(bullet.lineCount or 1 for bullet in selected_bullets)
            project_lines = bullet_lines + 2  # +2 for header
            
            project_data.append({
                'project': project,
                'bullets': selected_bullets,
                'line_count': project_lines,
                'score': sum(bullet.relevanceScore for bullet in selected_bullets) / len(selected_bullets) if selected_bullets else 0.0
            })
        
        # Sort by score (highest first)
        project_data.sort(key=lambda x: x['score'], reverse=True)
        
        # Select projects until we hit the line limit
        for data in project_data:
            if total_lines + data['line_count'] <= max_lines:
                selected_projects.append(SelectedProject(
                    id=data['project'].id,
                    name=data['project'].name,
                    description=data['project'].description,
                    technologies=data['project'].technologies,
                    startDate=data['project'].startDate,
                    endDate=data['project'].endDate,
                    selectedBullets=data['bullets']
                ))
                total_lines += data['line_count']
            else:
                # Try to fit with fewer bullets
                if data['bullets']:
                    # Try with 1 bullet
                    single_bullet = [data['bullets'][0]]
                    single_lines = (single_bullet[0].lineCount or 1) + 2
                    if total_lines + single_lines <= max_lines:
                        selected_projects.append(SelectedProject(
                            id=data['project'].id,
                            name=data['project'].name,
                            description=data['project'].description,
                            technologies=data['project'].technologies,
                            startDate=data['project'].startDate,
                            endDate=data['project'].endDate,
                            selectedBullets=single_bullet
                        ))
                        total_lines += single_lines
        
        print(f"   Selected {len(selected_projects)}/{len(projects)} projects ({total_lines}/{max_lines} lines)")
        return selected_projects
    
    async def _select_custom_sections_with_limit(
        self,
        custom_sections: List,
        job_description: str,
        bullets_per_custom: int,
        job_embedding: Optional[List[float]],
        max_lines: int,
        profile: Dict
    ) -> List[SelectedCustomSection]:
        """
        Select custom sections with line limit based on profile.
        
        Args:
            custom_sections: List of custom sections
            job_description: Job description
            bullets_per_custom: Initial bullets per section
            job_embedding: Job embedding
            max_lines: Maximum lines allowed for custom sections
            profile: Profile characteristics
            
        Returns:
            List of selected custom sections
        """
        if not custom_sections:
            return []
        
        selected_custom = []
        total_lines = 0
        
        # Score all sections and their bullets
        section_data = []
        for section in custom_sections:
            selected_bullets = await self._select_bullets_for_section(
                section.bullets,
                job_description,
                bullets_per_custom,
                job_embedding
            )
            
            # Estimate lines for this section
            bullet_lines = sum(bullet.lineCount or 1 for bullet in selected_bullets)
            section_lines = bullet_lines + 2  # +2 for header
            
            section_data.append({
                'section': section,
                'bullets': selected_bullets,
                'line_count': section_lines,
                'score': sum(bullet.relevanceScore for bullet in selected_bullets) / len(selected_bullets) if selected_bullets else 0.0
            })
        
        # Sort by score (highest first)
        section_data.sort(key=lambda x: x['score'], reverse=True)
        
        # Select sections until we hit the line limit
        for data in section_data:
            if total_lines + data['line_count'] <= max_lines:
                selected_custom.append(SelectedCustomSection(
                    id=data['section'].id,
                    title=data['section'].title,
                    subtitle=data['section'].subtitle,
                    selectedBullets=data['bullets']
                ))
                total_lines += data['line_count']
        
        print(f"   Selected {len(selected_custom)}/{len(custom_sections)} custom sections ({total_lines}/{max_lines} lines)")
        return selected_custom
    
    def _estimate_experience_lines(self, selected_bullets: List[SelectedBullet]) -> int:
        """
        Estimate total line count for an experience section.
        
        Args:
            selected_bullets: Selected bullets for the experience
            
        Returns:
            Estimated line count (including header)
        """
        if not selected_bullets:
            return 0
        
        # Sum bullet line counts
        bullet_lines = sum(bullet.lineCount or 1 for bullet in selected_bullets)
        
        # Add 2 lines for section header (company, role, dates)
        return bullet_lines + 2

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

