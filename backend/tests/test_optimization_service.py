"""
Comprehensive tests for OptimizationService.

Tests the bullet selection + rewriting functionality.
"""

import pytest
from unittest.mock import Mock, patch, AsyncMock
from app.services.optimization_service import OptimizationService
from app.schemas.rag import (
    StructuredResume, Experience, Education, Project, CustomSection, Bullet,
    SelectedResume, SelectedExperience, SelectedEducation, SelectedProject,
    SelectedCustomSection, SelectedBullet
)


class TestOptimizationService:
    """Test OptimizationService functionality."""
    
    @pytest.fixture
    def optimization_service(self):
        """Create an OptimizationService instance for testing."""
        with patch('app.services.optimization_service.SelectionService'), \
             patch('app.services.optimization_service.UnifiedOptimizer'):
            service = OptimizationService()
            service.selection_service = Mock()
            service.unified_optimizer = Mock()
            return service
    
    @pytest.fixture
    def sample_resume(self):
        """Create a sample structured resume for testing."""
        return StructuredResume(
            experiences=[
                Experience(
                    id="exp-1",
                    company="Google",
                    role="Software Engineer II",
                    startDate="Jun 2022",
                    endDate="Present",
                    bullets=[
                        Bullet(id="bullet-1", text="Developed microservices handling 10M+ requests"),
                        Bullet(id="bullet-2", text="Optimized database queries reducing latency by 40%"),
                    ]
                )
            ],
            education=[],
            projects=[],
            customSections=[]
        )
    
    @pytest.fixture
    def selected_resume(self):
        """Create a selected resume (after selection, before rewriting)."""
        return SelectedResume(
            experiences=[
                SelectedExperience(
                    id="exp-1",
                    company="Google",
                    role="Software Engineer II",
                    startDate="Jun 2022",
                    endDate="Present",
                    selectedBullets=[
                        SelectedBullet(
                            id="bullet-1",
                            text="Developed microservices handling 10M+ requests",
                            relevanceScore=0.92,
                            lineCount=1
                        ),
                        SelectedBullet(
                            id="bullet-2",
                            text="Optimized database queries reducing latency by 40%",
                            relevanceScore=0.88,
                            lineCount=1
                        )
                    ]
                )
            ],
            education=[],
            projects=[],
            customSections=[]
        )
    
    @pytest.fixture
    def job_description(self):
        """Sample job description for testing."""
        return "Software Engineer with experience in microservices, Python, REST APIs, and team leadership."
    
    @pytest.mark.asyncio
    async def test_optimize_resume_full_flow(self, optimization_service, sample_resume, job_description, selected_resume):
        """Test the full optimization flow (selection + rewriting)."""
        # Mock selection service to return selected resume
        optimization_service.selection_service.select_bullets = AsyncMock(return_value=selected_resume)
        
        # Mock unified optimizer to return rewritten bullets
        optimization_service.unified_optimizer.optimize_resume = AsyncMock(return_value={
            "rankings": [
                {
                    "original": "Developed microservices handling 10M+ requests",
                    "rewritten": "Architected scalable microservices handling 10M+ daily requests with 99.9% uptime",
                    "relevance_score": 0.92,
                    "improvement_reasoning": "Enhanced with quantifiable metrics"
                },
                {
                    "original": "Optimized database queries reducing latency by 40%",
                    "rewritten": "Optimized database queries and caching strategies, reducing API response time by 40%",
                    "relevance_score": 0.88,
                    "improvement_reasoning": "Added technical depth"
                }
            ]
        })
        
        result = await optimization_service.optimize_resume(
            resume=sample_resume,
            job_description=job_description,
            bullets_per_experience=2,
            rewrite_style="professional",
            optimization_mode="strict"
        )
        
        # Verify selection was called
        optimization_service.selection_service.select_bullets.assert_called_once()
        
        # Verify optimizer was called for rewriting
        assert optimization_service.unified_optimizer.optimize_resume.call_count >= 1
        
        # Verify result structure
        assert len(result.experiences) == 1
        assert len(result.experiences[0].selectedBullets) == 2
        
        # Verify rewritten bullets have original and rewritten fields
        for bullet in result.experiences[0].selectedBullets:
            assert bullet.original is not None
            assert bullet.rewritten is not None
            assert bullet.text == bullet.rewritten  # Main text should be rewritten
            assert bullet.relevanceScore > 0
    
    @pytest.mark.asyncio
    async def test_optimize_resume_rewriting_failure(self, optimization_service, sample_resume, job_description, selected_resume):
        """Test that optimization returns original bullets if rewriting fails."""
        # Mock selection service
        optimization_service.selection_service.select_bullets = AsyncMock(return_value=selected_resume)
        
        # Mock unified optimizer to fail
        optimization_service.unified_optimizer.optimize_resume = AsyncMock(side_effect=Exception("LLM API error"))
        
        result = await optimization_service.optimize_resume(
            resume=sample_resume,
            job_description=job_description,
            bullets_per_experience=2
        )
        
        # Should still return bullets (original text, not rewritten)
        assert len(result.experiences) == 1
        assert len(result.experiences[0].selectedBullets) == 2
        
        # Bullets should have original text (no rewriting happened)
        for bullet in result.experiences[0].selectedBullets:
            assert bullet.text is not None
    
    @pytest.mark.asyncio
    async def test_optimize_resume_empty_selection(self, optimization_service, sample_resume, job_description):
        """Test optimization when no bullets are selected."""
        empty_selected = SelectedResume(
            experiences=[
                SelectedExperience(
                    id="exp-1",
                    company="Google",
                    role="Software Engineer",
                    selectedBullets=[]  # No bullets selected
                )
            ]
        )
        
        optimization_service.selection_service.select_bullets = AsyncMock(return_value=empty_selected)
        
        result = await optimization_service.optimize_resume(
            resume=sample_resume,
            job_description=job_description,
            bullets_per_experience=2
        )
        
        assert len(result.experiences) == 1
        assert len(result.experiences[0].selectedBullets) == 0
    
    @pytest.mark.asyncio
    async def test_rewrite_bullets_partial_match(self, optimization_service, job_description):
        """Test rewriting when optimizer doesn't return all bullets."""
        selected_bullets = [
            SelectedBullet(
                id="bullet-1",
                text="Original bullet 1",
                relevanceScore=0.9,
                lineCount=1
            ),
            SelectedBullet(
                id="bullet-2",
                text="Original bullet 2",
                relevanceScore=0.8,
                lineCount=1
            )
        ]
        
        # Mock optimizer to return only one rewritten bullet
        optimization_service.unified_optimizer.optimize_resume = AsyncMock(return_value={
            "rankings": [
                {
                    "original": "Original bullet 1",
                    "rewritten": "Rewritten bullet 1",
                    "relevance_score": 0.9,
                    "improvement_reasoning": "Enhanced"
                }
                # Missing bullet 2
            ]
        })
        
        result = await optimization_service._rewrite_bullets(
            selected_bullets=selected_bullets,
            job_description=job_description,
            rewrite_style="professional"
        )
        
        assert len(result) == 2
        
        # First bullet should be rewritten
        assert result[0].rewritten == "Rewritten bullet 1"
        assert result[0].original == "Original bullet 1"
        
        # Second bullet should keep original (no match found)
        assert result[1].text == "Original bullet 2"
        assert result[1].original == "Original bullet 2"
    
    @pytest.mark.asyncio
    async def test_optimize_resume_all_sections(self, optimization_service, job_description):
        """Test optimization for all resume sections."""
        resume = StructuredResume(
            experiences=[
                Experience(
                    id="exp-1",
                    company="Google",
                    role="Software Engineer",
                    bullets=[Bullet(id="b1", text="Experience bullet")]
                )
            ],
            education=[
                Education(
                    id="edu-1",
                    school="Stanford",
                    degree="B.S.",
                    field="CS",
                    bullets=[Bullet(id="b2", text="Education bullet")]
                )
            ],
            projects=[
                Project(
                    id="proj-1",
                    name="Project",
                    bullets=[Bullet(id="b3", text="Project bullet")]
                )
            ],
            customSections=[
                CustomSection(
                    id="custom-1",
                    title="Skills",
                    bullets=[Bullet(id="b4", text="Skills bullet")]
                )
            ]
        )
        
        # Mock selection to return all sections
        selected_resume = SelectedResume(
            experiences=[
                SelectedExperience(
                    id="exp-1",
                    company="Google",
                    role="Software Engineer",
                    selectedBullets=[
                        SelectedBullet(id="b1", text="Experience bullet", relevanceScore=0.9, lineCount=1)
                    ]
                )
            ],
            education=[
                SelectedEducation(
                    id="edu-1",
                    school="Stanford",
                    degree="B.S.",
                    field="CS",
                    selectedBullets=[
                        SelectedBullet(id="b2", text="Education bullet", relevanceScore=0.8, lineCount=1)
                    ]
                )
            ],
            projects=[
                SelectedProject(
                    id="proj-1",
                    name="Project",
                    selectedBullets=[
                        SelectedBullet(id="b3", text="Project bullet", relevanceScore=0.7, lineCount=1)
                    ]
                )
            ],
            customSections=[
                SelectedCustomSection(
                    id="custom-1",
                    title="Skills",
                    selectedBullets=[
                        SelectedBullet(id="b4", text="Skills bullet", relevanceScore=0.6, lineCount=1)
                    ]
                )
            ]
        )
        
        optimization_service.selection_service.select_bullets = AsyncMock(return_value=selected_resume)
        optimization_service.unified_optimizer.optimize_resume = AsyncMock(return_value={"rankings": []})
        
        result = await optimization_service.optimize_resume(
            resume=resume,
            job_description=job_description,
            bullets_per_experience=1,
            bullets_per_education=1,
            bullets_per_project=1,
            bullets_per_custom=1
        )
        
        assert len(result.experiences) == 1
        assert len(result.education) == 1
        assert len(result.projects) == 1
        assert len(result.customSections) == 1

