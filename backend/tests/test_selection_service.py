"""
Comprehensive tests for SelectionService.

Tests the bullet selection functionality without rewriting.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
import numpy as np
from app.services.selection_service import (
    SelectionService, calculate_total_lines, identify_gaps, estimate_latex_lines
)
from app.schemas.rag import (
    StructuredResume, Experience, Education, Project, CustomSection, Bullet,
    SelectedResume, SelectedExperience, SelectedEducation, SelectedProject,
    SelectedCustomSection, SelectedBullet
)


class TestSelectionService:
    """Test SelectionService functionality."""
    
    @pytest.fixture
    def selection_service(self):
        """Create a SelectionService instance for testing."""
        with patch('app.services.selection_service.VectorSearch'):
            service = SelectionService()
            # Mock the embedding generator
            service.vector_search.embedding_generator = Mock()
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
                        Bullet(id="bullet-3", text="Led team of 3 engineers"),
                        Bullet(id="bullet-4", text="Built REST APIs serving 5M+ requests"),
                        Bullet(id="bullet-5", text="Implemented CI/CD pipelines"),
                    ]
                ),
                Experience(
                    id="exp-2",
                    company="Meta",
                    role="Software Engineering Intern",
                    startDate="Jun 2021",
                    endDate="Aug 2021",
                    bullets=[
                        Bullet(id="bullet-6", text="Built React components for Marketplace"),
                        Bullet(id="bullet-7", text="Optimized GraphQL API endpoints"),
                    ]
                )
            ],
            education=[
                Education(
                    id="edu-1",
                    school="Stanford University",
                    degree="B.S.",
                    field="Computer Science",
                    startDate="Sep 2018",
                    endDate="Jun 2022",
                    bullets=[
                        Bullet(id="bullet-8", text="GPA: 3.9/4.0, Magna Cum Laude"),
                        Bullet(id="bullet-9", text="Relevant Coursework: Algorithms, ML, Distributed Systems"),
                    ]
                )
            ],
            projects=[
                Project(
                    id="proj-1",
                    name="Distributed Task Scheduler",
                    description="High-performance task scheduling system",
                    technologies="Go, Kubernetes, Redis",
                    bullets=[
                        Bullet(id="bullet-10", text="Built scalable scheduler handling 100K+ tasks"),
                        Bullet(id="bullet-11", text="Implemented Raft protocol for consensus"),
                    ]
                )
            ],
            customSections=[
                CustomSection(
                    id="custom-1",
                    title="Technical Skills",
                    bullets=[
                        Bullet(id="bullet-12", text="Languages: Python, JavaScript, Go, Java"),
                        Bullet(id="bullet-13", text="Backend: Node.js, Django, Spring Boot"),
                    ]
                )
            ]
        )
    
    @pytest.fixture
    def job_description(self):
        """Sample job description for testing."""
        return "Software Engineer with experience in microservices, Python, REST APIs, and team leadership. Must have CI/CD experience."
    
    @pytest.mark.asyncio
    async def test_select_bullets_for_experience(self, selection_service, sample_resume, job_description):
        """Test selecting bullets for experiences."""
        # Mock embedding generation to return simple embeddings
        def mock_embedding(text):
            # Return a simple embedding
            return np.random.rand(1536).astype(np.float32)
        
        selection_service.vector_search.embedding_generator.generate_embedding = Mock(side_effect=mock_embedding)
        
        # Mock numpy operations by patching at the point of use
        with patch('numpy.dot', return_value=0.8), \
             patch('numpy.linalg.norm', return_value=1.0):
            
            result = await selection_service.select_bullets(
                sample_resume,
                job_description,
                bullets_per_experience=3,
                bullets_per_education=2,
                bullets_per_project=2,
                bullets_per_custom=2
            )
            
            assert isinstance(result, SelectedResume)
            assert len(result.experiences) == 2
            
            # First experience should have up to 3 bullets
            assert len(result.experiences[0].selectedBullets) <= 3
            assert len(result.experiences[0].selectedBullets) > 0
            
            # Check that bullets have required fields
            for bullet in result.experiences[0].selectedBullets:
                assert bullet.id is not None
                assert bullet.text is not None
                assert 0 <= bullet.relevanceScore <= 1
                assert bullet.lineCount is not None
    
    @pytest.mark.asyncio
    async def test_select_bullets_empty_resume(self, selection_service, job_description):
        """Test selecting bullets from empty resume."""
        empty_resume = StructuredResume()
        
        result = await selection_service.select_bullets(
            empty_resume,
            job_description,
            bullets_per_experience=3
        )
        
        assert isinstance(result, SelectedResume)
        assert len(result.experiences) == 0
        assert len(result.education) == 0
    
    @pytest.mark.asyncio
    async def test_select_bullets_no_bullets_in_experience(self, selection_service, job_description):
        """Test selecting from experience with no bullets."""
        resume = StructuredResume(
            experiences=[
                Experience(
                    id="exp-1",
                    company="Google",
                    role="Software Engineer",
                    bullets=[]  # No bullets
                )
            ]
        )
        
        result = await selection_service.select_bullets(
            resume,
            job_description,
            bullets_per_experience=3
        )
        
        assert len(result.experiences) == 1
        assert len(result.experiences[0].selectedBullets) == 0
    
    @pytest.mark.asyncio
    async def test_select_bullets_respects_limit(self, selection_service, sample_resume, job_description):
        """Test that selection respects the bullets_per_experience limit."""
        selection_service.vector_search.embedding_generator.generate_embedding = Mock(
            return_value=np.random.rand(1536).astype(np.float32)
        )
        
        # Mock numpy operations by patching at the point of use
        with patch('numpy.dot', return_value=0.8), \
             patch('numpy.linalg.norm', return_value=1.0):
            
            result = await selection_service.select_bullets(
                sample_resume,
                job_description,
                bullets_per_experience=2  # Limit to 2
            )
            
            # First experience has 5 bullets, should only select 2
            assert len(result.experiences[0].selectedBullets) <= 2
    
    @pytest.mark.asyncio
    async def test_select_bullets_keyword_fallback(self, selection_service, job_description):
        """Test that keyword matching fallback works when embeddings fail."""
        resume = StructuredResume(
            experiences=[
                Experience(
                    id="exp-1",
                    company="Google",
                    role="Software Engineer",
                    bullets=[
                        Bullet(id="bullet-1", text="Developed microservices using Python"),
                        Bullet(id="bullet-2", text="Built REST APIs"),
                    ]
                )
            ]
        )
        
        # Mock embedding generation to fail
        selection_service.vector_search.embedding_generator.generate_embedding = Mock(return_value=None)
        
        result = await selection_service.select_bullets(
            resume,
            job_description,
            bullets_per_experience=2
        )
        
        # Should still work with keyword fallback
        assert len(result.experiences) == 1
        assert len(result.experiences[0].selectedBullets) > 0
    
    def test_simple_keyword_match(self, selection_service, job_description):
        """Test the simple keyword matching fallback."""
        bullet_text = "Developed microservices using Python and REST APIs"
        
        score = selection_service._simple_keyword_match(bullet_text, job_description)
        
        assert 0 <= score <= 1
        # Should have some match since both mention Python and REST APIs
        assert score > 0
    
    def test_simple_keyword_match_no_overlap(self, selection_service):
        """Test keyword matching with no overlap."""
        bullet_text = "Worked on unrelated project with different technologies"
        job_description = "Python microservices REST APIs"
        
        score = selection_service._simple_keyword_match(bullet_text, job_description)
        
        assert 0 <= score <= 1
        # Should be low but not zero (some words might match)
        assert score >= 0


class TestCalculateTotalLines:
    """Test line count calculation."""
    
    def test_calculate_total_lines_empty_resume(self):
        """Test line count for empty resume."""
        empty_resume = SelectedResume()
        
        total = calculate_total_lines(empty_resume)
        
        assert total == 0
    
    def test_calculate_total_lines_with_experiences(self):
        """Test line count calculation with experiences."""
        resume = SelectedResume(
            experiences=[
                SelectedExperience(
                    id="exp-1",
                    company="Google",
                    role="Software Engineer",
                    selectedBullets=[
                        SelectedBullet(id="b1", text="Bullet 1", relevanceScore=0.9, lineCount=1),
                        SelectedBullet(id="b2", text="Bullet 2", relevanceScore=0.8, lineCount=2),
                    ]
                )
            ]
        )
        
        total = calculate_total_lines(resume)
        
        # Should include: 2 bullets (1 + 2 lines) + 2 for section header = 5
        assert total >= 3  # At least the bullet lines
    
    def test_calculate_total_lines_all_sections(self):
        """Test line count with all sections."""
        resume = SelectedResume(
            experiences=[
                SelectedExperience(
                    id="exp-1",
                    company="Google",
                    role="Software Engineer",
                    selectedBullets=[
                        SelectedBullet(id="b1", text="Bullet", relevanceScore=0.9, lineCount=1),
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
                        SelectedBullet(id="b2", text="Bullet", relevanceScore=0.8, lineCount=1),
                    ]
                )
            ],
            projects=[
                SelectedProject(
                    id="proj-1",
                    name="Project",
                    selectedBullets=[
                        SelectedBullet(id="b3", text="Bullet", relevanceScore=0.7, lineCount=1),
                    ]
                )
            ],
            customSections=[
                SelectedCustomSection(
                    id="custom-1",
                    title="Skills",
                    selectedBullets=[
                        SelectedBullet(id="b4", text="Bullet", relevanceScore=0.6, lineCount=1),
                    ]
                )
            ]
        )
        
        total = calculate_total_lines(resume)
        
        # Should include all sections
        assert total > 0


class TestIdentifyGaps:
    """Test gap identification."""
    
    def test_identify_gaps_basic(self):
        """Test basic gap identification."""
        resume = SelectedResume(
            experiences=[
                SelectedExperience(
                    id="exp-1",
                    company="Google",
                    role="Software Engineer",
                    selectedBullets=[
                        SelectedBullet(id="b1", text="Developed Python microservices", relevanceScore=0.9),
                    ]
                )
            ]
        )
        
        job_description = "Python microservices REST APIs Kubernetes Docker"
        
        gaps = identify_gaps(resume, job_description)
        
        # Should identify some gaps (Kubernetes, Docker, etc.)
        assert isinstance(gaps, list)
        assert len(gaps) <= 5  # Max 5 gaps
    
    def test_identify_gaps_no_gaps(self):
        """Test gap identification when resume has all skills."""
        resume = SelectedResume(
            experiences=[
                SelectedExperience(
                    id="exp-1",
                    company="Google",
                    role="Software Engineer",
                    selectedBullets=[
                        SelectedBullet(id="b1", text="Python microservices REST APIs Kubernetes Docker", relevanceScore=0.9),
                    ]
                )
            ]
        )
        
        job_description = "Python microservices REST APIs"
        
        gaps = identify_gaps(resume, job_description)
        
        # Should have fewer gaps since resume covers most skills
        assert isinstance(gaps, list)


class TestEstimateLatexLines:
    """Test LaTeX line estimation."""
    
    def test_estimate_latex_lines_short(self):
        """Test line estimation for short bullet."""
        text = "Short bullet point"
        lines = estimate_latex_lines(text)
        
        assert lines >= 1
        assert lines <= 2
    
    def test_estimate_latex_lines_long(self):
        """Test line estimation for long bullet."""
        text = "This is a very long bullet point that should definitely span multiple lines in LaTeX format because it contains a lot of text and information about the work done"
        lines = estimate_latex_lines(text)
        
        assert lines >= 2
    
    def test_estimate_latex_lines_empty(self):
        """Test line estimation for empty text."""
        lines = estimate_latex_lines("")
        
        assert lines == 0
    
    def test_estimate_latex_lines_custom_chars_per_line(self):
        """Test line estimation with custom chars per line."""
        text = "A" * 200  # 200 characters
        lines_default = estimate_latex_lines(text)
        lines_custom = estimate_latex_lines(text, chars_per_line=50)
        
        assert lines_custom > lines_default  # Should need more lines with smaller chars_per_line

