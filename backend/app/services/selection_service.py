"""
Selection Service - Unified Global Selection Algorithm.

Replaces siloed per-section budgets with a single global pool where all entries
(experiences, projects, education, custom) compete for space together.

Key behavioral changes:
- Minimum 2 bullets per experience/project (entries with < 2 bullets are dropped)
- No siloed budgets — all sections share a single 37-line pool
- Tight packing — expand when even 1 line is available (not 5)
- Entry-level drop at minimum — when squeezing hits min bullets, next squeeze
  drops the entire entry (prevents 1-bullet state)
"""

from dataclasses import dataclass, field
from typing import List, Optional, Tuple, Dict
import math
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

    Args:
        text: Bullet point text
        chars_per_line: Average characters per line in LaTeX (default 110)

    Returns:
        Estimated number of lines
    """
    if not text:
        return 0

    effective_length = len(text or "") + 2  # Small bias for bullet indent

    if effective_length <= 0:
        return 0

    return max(1, math.ceil(effective_length / chars_per_line))


# Prestigious companies that should be included even if less relevant
PRESTIGIOUS_COMPANIES = {
    # FAANG
    'google', 'meta', 'facebook', 'amazon', 'apple', 'netflix', 'microsoft',
    # Other top tech
    'tesla', 'nvidia', 'uber', 'airbnb', 'stripe', 'palantir', 'databricks',
    'snowflake', 'openai', 'anthropic', 'linkedin', 'twitter',
    'x.com', 'snapchat', 'tiktok', 'bytedance', 'alphabet', 'salesforce',
    'oracle', 'adobe', 'intel', 'amd', 'qualcomm', 'cisco', 'ibm',
    # Unicorns & well-known startups
    'square', 'coinbase', 'robinhood',
    'doordash', 'instacart', 'zoom', 'slack', 'notion', 'figma', 'canva',
    'discord', 'reddit', 'pinterest', 'spotify', 'dropbox', 'box',
    # Finance & Consulting
    'goldman sachs', 'morgan stanley', 'jpmorgan', 'mckinsey', 'bain',
    'boston consulting group', 'bcg', 'deloitte', 'pwc', 'ey', 'kpmg'
}


@dataclass
class EntrySlot:
    """Unified representation for any resume entry."""
    entry_id: str
    section_type: str  # 'experience' | 'project' | 'education' | 'custom'
    original_entry: object
    all_bullets_scored: list  # [(Bullet, score), ...]
    selected_bullets: list  # [SelectedBullet, ...]
    composite_score: float
    line_count: int
    is_must_have: bool
    min_bullets: int  # 2 for exp/proj, 0 for edu, 1 for custom
    header_lines: int = 2


class ResumeProfileDetector:
    """
    Detects resume profile based on content characteristics.
    Simplified: no distribution needed (no per-section allocation).
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
            'experience_pattern': 'many_short' | 'few_deep' | 'many_deep' | 'standard' | 'none',
            'compression_needed': float,  # 0.0-1.0
            'available_lines': int,  # Lines available after fixed sections
            'initial_bullets_per_entry': int  # Derived from pattern
        }
        """
        # Calculate total content
        total_experience_lines = sum(
            len(exp.bullets) * 1.5 + 2
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

        # Density
        if total_content > 60:
            density = 'high'
        elif total_content > 30:
            density = 'medium'
        else:
            density = 'low'

        # Experience Pattern
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

        # Initial bullets per entry derived from pattern
        pattern_to_bullets = {
            'many_short': 2,
            'few_deep': 4,
            'many_deep': 2,
            'standard': 3,
            'none': 2
        }
        initial_bullets_per_entry = pattern_to_bullets[experience_pattern]

        # Calculate compression needed
        available_lines = ResumeProfileDetector.MAX_LINES - ResumeProfileDetector.HEADER_LINES - ResumeProfileDetector.SKILLS_LINES
        compression_needed = max(0, min(1.0, (total_content - available_lines) / total_content)) if total_content > 0 else 0.0

        return {
            'density': density,
            'experience_pattern': experience_pattern,
            'compression_needed': compression_needed,
            'available_lines': available_lines,
            'total_content': total_content,
            'initial_bullets_per_entry': initial_bullets_per_entry
        }


class SelectionService:
    """
    Unified global selection service.

    4-phase algorithm:
    Phase 1: Score Everything → flat list of EntrySlots
    Phase 2: Build Initial Selection → must-haves first, then greedy fill
    Phase 3: Squeeze (if over) → remove lowest-scoring bullets globally;
             entries at min_bullets get dropped entirely
    Phase 4: Expand (if under) → add back highest-scoring deleted bullets;
             also restore dropped entries if space allows (with min 2 bullets)
    Convert → SelectedResume
    """

    def __init__(self):
        self.vector_search = VectorSearch()
        self.max_lines = 42

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
        Select top bullets across all sections using a unified global pool.

        Args:
            resume: Structured resume with all bullets
            job_description: Job description to match against
            bullets_per_experience: Hint (overridden by profile detection)
            bullets_per_education: Number of bullets to select per education
            bullets_per_project: Hint (overridden by profile detection)
            bullets_per_custom: Number of bullets to select per custom section

        Returns:
            SelectedResume with top bullets per section
        """
        print(f"📋 Selecting bullets for {len(resume.experiences)} experiences...")

        # Step 1: Detect profile
        profile = self.detect_profile(resume)
        print(f"📊 Profile: density={profile['density']}, pattern={profile['experience_pattern']}, initial_bullets={profile['initial_bullets_per_entry']}")

        job_embedding = self._generate_job_embedding(job_description)

        # Phase 1: Score everything into EntrySlots
        all_slots = await self._score_all_entries(
            resume, job_description, job_embedding, profile,
            bullets_per_education, bullets_per_custom
        )

        # Mark must-haves
        self._mark_must_haves(all_slots, resume)

        # Phase 2: Build initial selection
        selected_slots, dropped_slots = self._build_initial_selection(all_slots, profile)

        # Phase 3: Squeeze if over
        total_lines = self._calculate_slots_lines(selected_slots, resume)
        if total_lines > profile['available_lines']:
            self._squeeze(selected_slots, dropped_slots, profile, resume)

        # Phase 4: Expand if under
        total_lines = self._calculate_slots_lines(selected_slots, resume)
        if total_lines < profile['available_lines']:
            self._expand(selected_slots, dropped_slots, profile, resume)

        total_lines = self._calculate_slots_lines(selected_slots, resume)
        print(f"✅ Final selection: {len(selected_slots)} entries, {total_lines}/{profile['available_lines']} lines")

        # Convert to SelectedResume
        return self._slots_to_selected_resume(selected_slots, resume)

    def detect_profile(self, resume: StructuredResume) -> Dict:
        """Delegate to ResumeProfileDetector."""
        return ResumeProfileDetector.detect_profile(resume)

    def _generate_job_embedding(self, job_description: str) -> Optional[List[float]]:
        """Generate embedding for the job description once per selection request."""
        try:
            embedding = self.vector_search.embedding_generator.generate_embedding(job_description)
            if embedding:
                return embedding
        except Exception as exc:
            print(f"⚠️ Error generating job embedding: {exc}")
        return None

    async def _score_all_entries(
        self,
        resume: StructuredResume,
        job_description: str,
        job_embedding: Optional[List[float]],
        profile: Dict,
        bullets_per_education: int,
        bullets_per_custom: int
    ) -> List[EntrySlot]:
        """
        Phase 1: Score all entries across all sections into EntrySlots.
        """
        slots = []
        initial_bullets = profile['initial_bullets_per_entry']

        # Score experiences
        for exp in resume.experiences:
            all_scored = await self._score_bullets(exp.bullets, job_description, job_embedding)
            top_n = self._pick_top_n_bullets(all_scored, initial_bullets)
            composite = self._score_entry_composite(
                exp, top_n, job_description,
                resume.experiences, section_type='experience'
            )
            line_count = self._estimate_entry_lines(top_n)

            slots.append(EntrySlot(
                entry_id=exp.id,
                section_type='experience',
                original_entry=exp,
                all_bullets_scored=all_scored,
                selected_bullets=top_n,
                composite_score=composite,
                line_count=line_count,
                is_must_have=False,
                min_bullets=2,
                header_lines=2
            ))

        # Score projects
        for proj in resume.projects:
            all_scored = await self._score_bullets(proj.bullets, job_description, job_embedding)
            top_n = self._pick_top_n_bullets(all_scored, initial_bullets)
            composite = self._calculate_relevance_score(top_n)
            line_count = self._estimate_entry_lines(top_n)

            slots.append(EntrySlot(
                entry_id=proj.id,
                section_type='project',
                original_entry=proj,
                all_bullets_scored=all_scored,
                selected_bullets=top_n,
                composite_score=composite,
                line_count=line_count,
                is_must_have=False,
                min_bullets=2,
                header_lines=2
            ))

        # Score education (always included, min_bullets=0)
        for edu in resume.education:
            all_scored = await self._score_bullets(edu.bullets, job_description, job_embedding)
            top_n = self._pick_top_n_bullets(all_scored, bullets_per_education)
            composite = self._calculate_relevance_score(top_n) if top_n else 0.5
            line_count = self._estimate_entry_lines(top_n, header_only_ok=True)

            slots.append(EntrySlot(
                entry_id=edu.id,
                section_type='education',
                original_entry=edu,
                all_bullets_scored=all_scored,
                selected_bullets=top_n,
                composite_score=composite,
                line_count=line_count,
                is_must_have=True,  # Education always included
                min_bullets=0,
                header_lines=2
            ))

        # Score custom sections
        for sec in resume.customSections:
            all_scored = await self._score_bullets(sec.bullets, job_description, job_embedding)
            top_n = self._pick_top_n_bullets(all_scored, bullets_per_custom)
            composite = self._calculate_relevance_score(top_n) if top_n else 0.3
            line_count = self._estimate_entry_lines(top_n)

            slots.append(EntrySlot(
                entry_id=sec.id,
                section_type='custom',
                original_entry=sec,
                all_bullets_scored=all_scored,
                selected_bullets=top_n,
                composite_score=composite,
                line_count=line_count,
                is_must_have=False,
                min_bullets=1,
                header_lines=2
            ))

        return slots

    def _mark_must_haves(self, slots: List[EntrySlot], resume: StructuredResume):
        """
        Mark anchor + trophy experiences and all education as must-have.

        Anchor: most recent experience (first in list)
        Trophy: highest prestige company
        Education: always included
        """
        exp_slots = [s for s in slots if s.section_type == 'experience']

        if not exp_slots:
            return

        # Anchor: most recent (first experience in the resume list)
        anchor_id = resume.experiences[0].id if resume.experiences else None

        # Trophy: highest prestige
        trophy_slot = max(exp_slots, key=lambda s: self._calculate_prestige_score(s.original_entry.company))

        for slot in slots:
            if slot.section_type == 'education':
                slot.is_must_have = True
            elif slot.section_type == 'experience':
                if slot.entry_id == anchor_id:
                    slot.is_must_have = True
                if slot.entry_id == trophy_slot.entry_id:
                    slot.is_must_have = True

    def _build_initial_selection(
        self,
        all_slots: List[EntrySlot],
        profile: Dict
    ) -> Tuple[List[EntrySlot], List[EntrySlot]]:
        """
        Phase 2: Lock must-haves, then greedy-fill remaining slots.

        Returns (selected, dropped) lists.
        """
        available = profile['available_lines']

        selected = []
        dropped = []
        total_lines = 0

        # Count section title lines for sections that will have entries
        # (will be recalculated after selection)

        # First: lock must-haves
        must_haves = [s for s in all_slots if s.is_must_have]
        non_must_haves = [s for s in all_slots if not s.is_must_have]

        for slot in must_haves:
            selected.append(slot)
            total_lines += slot.line_count

        # Sort non-must-haves by composite score (highest first)
        non_must_haves.sort(key=lambda s: s.composite_score, reverse=True)

        # Greedy fill with 10% buffer
        buffer = int(available * 0.1)
        for slot in non_must_haves:
            if total_lines + slot.line_count <= available + buffer:
                selected.append(slot)
                total_lines += slot.line_count
            else:
                dropped.append(slot)

        return selected, dropped

    def _squeeze(
        self,
        selected: List[EntrySlot],
        dropped: List[EntrySlot],
        profile: Dict,
        resume: StructuredResume
    ):
        """
        Phase 3: Iteratively remove lowest-scoring bullets globally.
        When an entry hits min_bullets and is not must_have, drop the entire entry.
        """
        available = profile['available_lines']
        max_iterations = 200

        for _ in range(max_iterations):
            total_lines = self._calculate_slots_lines(selected, resume)
            if total_lines <= available:
                break

            # Find the globally lowest-scoring removal candidate
            best_candidate = None
            best_score = float('inf')
            best_slot_idx = -1
            best_is_entry_drop = False

            for idx, slot in enumerate(selected):
                if slot.section_type == 'education' and slot.min_bullets == 0:
                    # Education bullets can be squeezed but entry stays
                    if slot.selected_bullets:
                        worst = min(slot.selected_bullets, key=lambda b: b.relevanceScore)
                        if worst.relevanceScore < best_score:
                            best_score = worst.relevanceScore
                            best_candidate = worst
                            best_slot_idx = idx
                            best_is_entry_drop = False
                    continue

                if len(slot.selected_bullets) > slot.min_bullets:
                    # Can remove a bullet
                    worst = min(slot.selected_bullets, key=lambda b: b.relevanceScore)
                    if worst.relevanceScore < best_score:
                        best_score = worst.relevanceScore
                        best_candidate = worst
                        best_slot_idx = idx
                        best_is_entry_drop = False
                elif len(slot.selected_bullets) == slot.min_bullets and not slot.is_must_have:
                    # Entry-level drop: score is min bullet score
                    entry_score = min(b.relevanceScore for b in slot.selected_bullets) if slot.selected_bullets else 0
                    if entry_score < best_score:
                        best_score = entry_score
                        best_candidate = slot
                        best_slot_idx = idx
                        best_is_entry_drop = True
                elif len(slot.selected_bullets) == 0 and not slot.is_must_have:
                    # Empty non-must-have entry, drop it
                    best_score = -1
                    best_candidate = slot
                    best_slot_idx = idx
                    best_is_entry_drop = True

            if best_candidate is None:
                break  # Nothing left to remove

            if best_is_entry_drop:
                # Drop entire entry
                removed_slot = selected.pop(best_slot_idx)
                dropped.append(removed_slot)
            else:
                # Remove single bullet
                slot = selected[best_slot_idx]
                slot.selected_bullets.remove(best_candidate)
                slot.line_count = self._estimate_entry_lines(
                    slot.selected_bullets,
                    header_only_ok=(slot.section_type == 'education')
                )

    def _expand(
        self,
        selected: List[EntrySlot],
        dropped: List[EntrySlot],
        profile: Dict,
        resume: StructuredResume
    ):
        """
        Phase 4: Add back highest-scoring deleted bullets or restore dropped entries.
        Threshold: 1 line available (not 5).
        """
        available = profile['available_lines']
        max_iterations = 200

        for _ in range(max_iterations):
            total_lines = self._calculate_slots_lines(selected, resume)
            remaining = available - total_lines
            if remaining < 1:
                break

            # Option A: Add a bullet to an existing selected entry
            best_add_bullet = None
            best_add_score = -1.0
            best_add_slot = None
            best_add_lines = 0

            for slot in selected:
                # Find unselected bullets for this entry
                selected_ids = {b.id for b in slot.selected_bullets}
                unselected = [
                    (bullet, score) for bullet, score in slot.all_bullets_scored
                    if bullet.id not in selected_ids
                ]
                if not unselected:
                    continue

                best_unselected = max(unselected, key=lambda x: x[1])
                bullet, score = best_unselected
                bullet_lines = estimate_latex_lines(bullet.text)

                if bullet_lines <= remaining and score > best_add_score:
                    best_add_score = score
                    best_add_bullet = bullet
                    best_add_slot = slot
                    best_add_lines = bullet_lines

            # Option B: Restore a dropped entry (with min_bullets)
            best_restore = None
            best_restore_score = -1.0
            best_restore_idx = -1
            best_restore_lines = 0

            for idx, slot in enumerate(dropped):
                if slot.section_type == 'education':
                    # Education: restore with header only if needed
                    restore_lines = slot.header_lines
                    if restore_lines <= remaining and slot.composite_score > best_restore_score:
                        best_restore_score = slot.composite_score
                        best_restore = slot
                        best_restore_idx = idx
                        best_restore_lines = restore_lines
                else:
                    # Need at least min_bullets to restore
                    min_b = slot.min_bullets
                    top_bullets = self._pick_top_n_bullets(slot.all_bullets_scored, min_b)
                    if len(top_bullets) < min_b:
                        continue
                    restore_lines = self._estimate_entry_lines(top_bullets)
                    if restore_lines <= remaining and slot.composite_score > best_restore_score:
                        best_restore_score = slot.composite_score
                        best_restore = slot
                        best_restore_idx = idx
                        best_restore_lines = restore_lines

            # Pick the best option
            if best_restore is not None and best_restore_score >= best_add_score:
                # Restore the dropped entry
                restored = dropped.pop(best_restore_idx)
                if restored.section_type != 'education':
                    restored.selected_bullets = self._pick_top_n_bullets(
                        restored.all_bullets_scored, restored.min_bullets
                    )
                restored.line_count = self._estimate_entry_lines(
                    restored.selected_bullets,
                    header_only_ok=(restored.section_type == 'education')
                )
                selected.append(restored)
            elif best_add_bullet is not None:
                # Add bullet to existing entry
                new_bullet = SelectedBullet(
                    id=best_add_bullet.id,
                    text=best_add_bullet.text,
                    relevanceScore=round(best_add_score, 3),
                    lineCount=best_add_lines
                )
                best_add_slot.selected_bullets.append(new_bullet)
                best_add_slot.line_count = self._estimate_entry_lines(
                    best_add_slot.selected_bullets,
                    header_only_ok=(best_add_slot.section_type == 'education')
                )
            else:
                break  # Nothing to add

    def _calculate_slots_lines(self, slots: List[EntrySlot], resume: StructuredResume) -> int:
        """
        Calculate total lines for all selected slots,
        including section title lines (1 per non-empty section).
        """
        total = 0

        # Count section title lines
        section_types_present = set()
        for slot in slots:
            section_types_present.add(slot.section_type)

        # Each non-empty section gets 1 title line
        total += len(section_types_present)

        # Count entry lines
        for slot in slots:
            total += slot.line_count

        return total

    def _estimate_entry_lines(self, selected_bullets: List[SelectedBullet], header_only_ok: bool = False) -> int:
        """
        Estimate total line count for an entry (header + bullets).
        Education entries always get header lines even without bullets.
        """
        header_lines = 2

        if not selected_bullets:
            return header_lines if header_only_ok else 0

        bullet_lines = sum(bullet.lineCount or 1 for bullet in selected_bullets)
        return bullet_lines + header_lines

    def _pick_top_n_bullets(self, scored_bullets: List[Tuple[Bullet, float]], n: int) -> List[SelectedBullet]:
        """Pick top N bullets from scored list, convert to SelectedBullet."""
        if not scored_bullets or n <= 0:
            return []

        sorted_bullets = sorted(scored_bullets, key=lambda x: x[1], reverse=True)
        top = sorted_bullets[:n]

        return [
            SelectedBullet(
                id=bullet.id,
                text=bullet.text,
                relevanceScore=round(score, 3),
                lineCount=estimate_latex_lines(bullet.text)
            )
            for bullet, score in top
        ]

    def _slots_to_selected_resume(self, slots: List[EntrySlot], resume: StructuredResume) -> SelectedResume:
        """Convert EntrySlots back to SelectedResume format."""
        experiences = []
        education = []
        projects = []
        custom_sections = []

        # Build lookup for original ordering
        exp_order = {exp.id: i for i, exp in enumerate(resume.experiences)}
        edu_order = {edu.id: i for i, edu in enumerate(resume.education)}
        proj_order = {proj.id: i for i, proj in enumerate(resume.projects)}
        custom_order = {sec.id: i for i, sec in enumerate(resume.customSections)}

        for slot in slots:
            if slot.section_type == 'experience':
                exp = slot.original_entry
                experiences.append(SelectedExperience(
                    id=exp.id,
                    company=exp.company,
                    role=exp.role,
                    location=getattr(exp, 'location', None),
                    startDate=exp.startDate,
                    endDate=exp.endDate,
                    selectedBullets=slot.selected_bullets
                ))
            elif slot.section_type == 'education':
                edu = slot.original_entry
                education.append(SelectedEducation(
                    id=edu.id,
                    school=edu.school,
                    degree=edu.degree,
                    field=edu.field,
                    startDate=edu.startDate,
                    endDate=edu.endDate,
                    selectedBullets=slot.selected_bullets
                ))
            elif slot.section_type == 'project':
                proj = slot.original_entry
                projects.append(SelectedProject(
                    id=proj.id,
                    name=proj.name,
                    description=proj.description,
                    technologies=proj.technologies,
                    url=getattr(proj, 'url', None),
                    startDate=proj.startDate,
                    endDate=proj.endDate,
                    selectedBullets=slot.selected_bullets
                ))
            elif slot.section_type == 'custom':
                sec = slot.original_entry
                custom_sections.append(SelectedCustomSection(
                    id=sec.id,
                    title=sec.title,
                    subtitle=sec.subtitle,
                    selectedBullets=slot.selected_bullets
                ))

        # Preserve original ordering within each section
        experiences.sort(key=lambda e: exp_order.get(e.id, 999))
        education.sort(key=lambda e: edu_order.get(e.id, 999))
        projects.sort(key=lambda p: proj_order.get(p.id, 999))
        custom_sections.sort(key=lambda c: custom_order.get(c.id, 999))

        return SelectedResume(
            personalInfo=resume.personalInfo,
            skills=resume.skills,
            experiences=experiences,
            education=education,
            projects=projects,
            customSections=custom_sections
        )

    # ========================================================================
    # Scoring helpers
    # ========================================================================

    async def _score_bullets(
        self,
        bullets: List[Bullet],
        job_description: str,
        job_embedding: Optional[List[float]]
    ) -> List[Tuple[Bullet, float]]:
        """
        Score all bullets using embeddings (with keyword fallback).
        """
        if not bullets:
            return []

        bullet_scores = []

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

    def _simple_keyword_match(self, bullet_text: str, job_description: str) -> float:
        """Simple keyword matching fallback (no API calls)."""
        bullet_lower = bullet_text.lower()
        job_lower = job_description.lower()

        job_words = set(job_lower.split())
        bullet_words = set(bullet_lower.split())
        matches = len(job_words.intersection(bullet_words))

        total_words = len(job_words.union(bullet_words))
        if total_words == 0:
            return 0.0

        return matches / total_words

    def _score_entry_composite(
        self,
        entry,
        selected_bullets: List[SelectedBullet],
        job_description: str,
        all_entries: list,
        section_type: str
    ) -> float:
        """
        Calculate composite score for an entry.
        Score = (Relevance * 0.5) + (Recency * 0.2) + (Prestige * 0.2) + (Role Match * 0.1)
        """
        relevance = self._calculate_relevance_score(selected_bullets)

        if section_type == 'experience':
            recency = self._calculate_recency_score(entry, all_entries)
            prestige = self._calculate_prestige_score(entry.company)
            role_match = self._calculate_role_match_score(entry.role, job_description)
        else:
            recency = 0.5
            prestige = 0.3
            role_match = 0.3

        return relevance * 0.5 + recency * 0.2 + prestige * 0.2 + role_match * 0.1

    def _calculate_relevance_score(self, selected_bullets: List[SelectedBullet]) -> float:
        """Average of bullet relevance scores."""
        if not selected_bullets:
            return 0.0
        scores = [bullet.relevanceScore for bullet in selected_bullets]
        return sum(scores) / len(scores)

    def _calculate_recency_score(self, experience, all_experiences: list) -> float:
        """Recency score based on position in list (assumes most recent first)."""
        if not all_experiences:
            return 0.5

        try:
            index = next(i for i, exp in enumerate(all_experiences) if exp.id == experience.id)
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
        """Prestige score based on company name."""
        if not company:
            return 0.0

        company_lower = company.lower().strip()

        for prestigious in PRESTIGIOUS_COMPANIES:
            if prestigious in company_lower:
                return 1.0

        known_indicators = ['inc', 'corp', 'llc', 'ltd', 'technologies', 'tech']
        if any(indicator in company_lower for indicator in known_indicators):
            return 0.6

        return 0.2

    def _calculate_role_match_score(self, role: str, job_description: str) -> float:
        """Role match score based on job title similarity."""
        if not role:
            return 0.0

        role_lower = role.lower()
        job_lower = job_description.lower()

        role_keywords = {
            'engineer', 'developer', 'programmer', 'architect', 'manager',
            'lead', 'senior', 'principal', 'staff', 'director', 'scientist',
            'analyst', 'consultant', 'specialist'
        }

        role_words = set(role_lower.split())
        job_words = set(job_lower.split())

        matches = len(role_words.intersection(job_words))
        role_matches = len(role_words.intersection(role_keywords))

        if matches > 0:
            return min(1.0, matches / max(1, len(role_words)))
        elif role_matches > 0:
            return 0.5
        else:
            return 0.0


def calculate_total_lines(selected_resume: SelectedResume) -> int:
    """
    Calculate total estimated LaTeX lines for the selected resume.
    Counts section title lines (1 per non-empty section) and
    education headers even without bullets.
    """
    total = 0

    # Section title lines
    if selected_resume.experiences:
        total += 1  # "Experience" section title
    if selected_resume.education:
        total += 1  # "Education" section title
    if selected_resume.projects:
        total += 1  # "Projects" section title
    if selected_resume.customSections:
        total += 1  # Custom section title(s)

    for exp in selected_resume.experiences:
        total += sum(bullet.lineCount or 1 for bullet in exp.selectedBullets)
        total += 2  # Header lines

    for edu in selected_resume.education:
        total += sum(bullet.lineCount or 1 for bullet in edu.selectedBullets)
        total += 2  # Header lines always counted

    for proj in selected_resume.projects:
        total += sum(bullet.lineCount or 1 for bullet in proj.selectedBullets)
        total += 2  # Header lines

    for section in selected_resume.customSections:
        total += sum(bullet.lineCount or 1 for bullet in section.selectedBullets)
        total += 2  # Header lines

    return total


def identify_gaps(selected_resume: SelectedResume, job_description: str) -> List[str]:
    """
    Identify skill gaps between resume and job description.
    """
    job_lower = job_description.lower()

    tech_keywords = [
        'python', 'javascript', 'react', 'node', 'aws', 'kubernetes',
        'docker', 'microservices', 'api', 'sql', 'mongodb', 'postgresql',
        'machine learning', 'ai', 'ml', 'tensorflow', 'pytorch'
    ]

    gaps = []
    for keyword in tech_keywords:
        if keyword in job_lower:
            found = False
            resume_text = ""
            for exp in selected_resume.experiences:
                resume_text += " ".join(b.text.lower() for b in exp.selectedBullets)

            if keyword not in resume_text:
                gaps.append(keyword.title())

    return gaps[:5]
