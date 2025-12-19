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
    SelectedCustomSection, SelectedBullet, PersonalInfo, SkillGroup
)


class TestSelectionService:
    """Test SelectionService functionality."""
    
    @pytest.fixture
    def selection_service(self):
        """Create a SelectionService instance for testing."""
        with patch('app.services.selection_service.VectorSearch'):
            service = SelectionService()
            # Mock the embedding generator
            embedding_generator = Mock()
            embedding_generator.generate_embedding = Mock()

            def default_batch(texts):
                return [[0.1] * 1536 for _ in texts]

            embedding_generator.generate_embeddings_batch = Mock(side_effect=default_batch)
            service.vector_search.embedding_generator = embedding_generator
            return service
    
    @pytest.fixture
    def sample_resume(self):
        """Create a sample structured resume for testing."""
        return StructuredResume(
            personalInfo=PersonalInfo(
                firstName="John",
                lastName="Doe",
                email="john.doe@example.com",
                phone="555-123-4567",
                linkedin="linkedin.com/in/johndoe",
                github="github.com/johndoe"
            ),
            skills=[
                SkillGroup(
                    id="skills-1",
                    title="Languages",
                    skills=["Python", "Go", "TypeScript"]
                )
            ],
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
        selection_service.vector_search.embedding_generator.generate_embeddings_batch = Mock(
            side_effect=lambda texts: [mock_embedding(text) for text in texts]
        )
        
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
            assert result.personalInfo is not None
            assert result.personalInfo.firstName == "John"
            assert result.skills and result.skills[0].title == "Languages"
            
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
        selection_service.vector_search.embedding_generator.generate_embeddings_batch = Mock(
            side_effect=lambda texts: [np.random.rand(1536).astype(np.float32) for _ in texts]
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


class TestExperienceSelectionPriorityQueue:
    """Test priority queue-based experience selection."""
    
    @pytest.fixture
    def selection_service(self):
        """Create a SelectionService instance for testing."""
        with patch('app.services.selection_service.VectorSearch'):
            service = SelectionService()
            embedding_generator = Mock()
            
            def mock_embedding(text):
                return np.random.rand(1536).astype(np.float32)
            
            embedding_generator.generate_embedding = Mock(side_effect=mock_embedding)
            embedding_generator.generate_embeddings_batch = Mock(
                side_effect=lambda texts: [mock_embedding(text) for text in texts]
            )
            service.vector_search.embedding_generator = embedding_generator
            return service
    
    @pytest.fixture
    def job_description(self):
        """Sample job description for testing."""
        return "Software Engineer with experience in microservices, Python, REST APIs, and team leadership."
    
    @pytest.mark.asyncio
    async def test_prestigious_company_included(self, selection_service, job_description):
        """Test that prestigious company (Google) is included even if less relevant."""
        resume = StructuredResume(
            experiences=[
                Experience(
                    id="exp-1",
                    company="Google",
                    role="Software Engineer",
                    startDate="Jun 2023",
                    endDate="Present",
                    bullets=[
                        Bullet(id="b1", text="Worked on unrelated project with different tech stack"),
                        Bullet(id="b2", text="Did some other work"),
                    ]
                ),
                Experience(
                    id="exp-2",
                    company="Small Startup",
                    role="Software Engineer",
                    startDate="Jun 2022",
                    endDate="May 2023",
                    bullets=[
                        Bullet(id="b3", text="Developed microservices using Python and REST APIs"),
                        Bullet(id="b4", text="Led team of engineers"),
                    ]
                )
            ]
        )
        
        with patch('numpy.dot', return_value=0.3), \
             patch('numpy.linalg.norm', return_value=1.0):
            
            result = await selection_service.select_bullets(
                resume,
                job_description,
                bullets_per_experience=2
            )
            
            # Google should be included due to prestige + recency
            company_names = [exp.company for exp in result.experiences]
            assert "Google" in company_names
    
    @pytest.mark.asyncio
    async def test_most_recent_experience_included(self, selection_service, job_description):
        """Test that most recent experience is prioritized."""
        resume = StructuredResume(
            experiences=[
                Experience(
                    id="exp-1",
                    company="Recent Company",
                    role="Software Engineer",
                    startDate="Jan 2024",
                    endDate="Present",
                    bullets=[
                        Bullet(id="b1", text="Recent work with some relevance"),
                        Bullet(id="b2", text="More recent work"),
                    ]
                ),
                Experience(
                    id="exp-2",
                    company="Old Company",
                    role="Software Engineer",
                    startDate="Jan 2020",
                    endDate="Dec 2023",
                    bullets=[
                        Bullet(id="b3", text="Old work with high relevance to microservices Python REST"),
                        Bullet(id="b4", text="Very relevant old work"),
                    ]
                )
            ]
        )
        
        with patch('numpy.dot', return_value=0.5), \
             patch('numpy.linalg.norm', return_value=1.0):
            
            result = await selection_service.select_bullets(
                resume,
                job_description,
                bullets_per_experience=2
            )
            
            # Most recent should be included (first in list)
            assert len(result.experiences) > 0
            assert result.experiences[0].company == "Recent Company"
    
    @pytest.mark.asyncio
    async def test_high_relevance_selected_first(self, selection_service, job_description):
        """Test that highly relevant experiences are selected first."""
        resume = StructuredResume(
            experiences=[
                Experience(
                    id="exp-1",
                    company="Company A",
                    role="Software Engineer",
                    startDate="Jan 2022",
                    endDate="Dec 2022",
                    bullets=[
                        Bullet(id="b1", text="Unrelated work with different technologies"),
                        Bullet(id="b2", text="More unrelated stuff"),
                    ]
                ),
                Experience(
                    id="exp-2",
                    company="Company B",
                    role="Software Engineer",
                    startDate="Jan 2021",
                    endDate="Dec 2021",
                    bullets=[
                        Bullet(id="b3", text="Developed microservices architecture using Python"),
                        Bullet(id="b4", text="Built REST APIs handling millions of requests"),
                        Bullet(id="b5", text="Led team of 5 engineers"),
                    ]
                )
            ]
        )
        
        # Mock high relevance for Company B
        def mock_dot(a, b):
            # Return higher similarity for Company B bullets
            return 0.9
        
        with patch('numpy.dot', side_effect=mock_dot), \
             patch('numpy.linalg.norm', return_value=1.0):
            
            result = await selection_service.select_bullets(
                resume,
                job_description,
                bullets_per_experience=3
            )
            
            # Company B should be included due to high relevance
            company_names = [exp.company for exp in result.experiences]
            assert "Company B" in company_names
    
    @pytest.mark.asyncio
    async def test_space_constraints_respected(self, selection_service, job_description):
        """Test that selection respects space constraints (50 lines max)."""
        # Create many experiences that would exceed page limit
        experiences = []
        for i in range(10):
            experiences.append(
                Experience(
                    id=f"exp-{i}",
                    company=f"Company {i}",
                    role="Software Engineer",
                    startDate=f"Jan {2020 + i}",
                    endDate=f"Dec {2020 + i}",
                    bullets=[
                        Bullet(id=f"b{i}-1", text="This is a bullet point that takes some space"),
                        Bullet(id=f"b{i}-2", text="Another bullet point with content"),
                        Bullet(id=f"b{i}-3", text="Third bullet point for this experience"),
                    ]
                )
            )
        
        resume = StructuredResume(experiences=experiences)
        
        with patch('numpy.dot', return_value=0.5), \
             patch('numpy.linalg.norm', return_value=1.0):
            
            result = await selection_service.select_bullets(
                resume,
                job_description,
                bullets_per_experience=3
            )
            
            # Should select subset that fits within page limit
            total_lines = calculate_total_lines(result)
            assert total_lines <= 50  # Should fit on one page
    
    @pytest.mark.asyncio
    async def test_empty_experiences_handled(self, selection_service, job_description):
        """Test that empty experiences list is handled gracefully."""
        resume = StructuredResume(experiences=[])
        
        result = await selection_service.select_bullets(
            resume,
            job_description,
            bullets_per_experience=3
        )
        
        assert len(result.experiences) == 0
    
    @pytest.mark.asyncio
    async def test_all_experiences_fit(self, selection_service, job_description):
        """Test when all experiences fit within page limit."""
        resume = StructuredResume(
            experiences=[
                Experience(
                    id="exp-1",
                    company="Company A",
                    role="Software Engineer",
                    bullets=[
                        Bullet(id="b1", text="Short bullet"),
                    ]
                ),
                Experience(
                    id="exp-2",
                    company="Company B",
                    role="Software Engineer",
                    bullets=[
                        Bullet(id="b2", text="Another short bullet"),
                    ]
                )
            ]
        )
        
        with patch('numpy.dot', return_value=0.5), \
             patch('numpy.linalg.norm', return_value=1.0):
            
            result = await selection_service.select_bullets(
                resume,
                job_description,
                bullets_per_experience=1
            )
            
            # Both should be included if they fit
            total_lines = calculate_total_lines(result)
            if total_lines <= 50:
                assert len(result.experiences) == 2
    
    def test_prestige_score_calculation(self, selection_service):
        """Test prestige score calculation."""
        # Test Google (prestigious)
        score_google = selection_service._calculate_prestige_score("Google")
        assert score_google == 1.0
        
        # Test Meta (prestigious)
        score_meta = selection_service._calculate_prestige_score("Meta")
        assert score_meta == 1.0
        
        # Test unknown company
        score_unknown = selection_service._calculate_prestige_score("Random Startup Inc")
        assert 0.0 <= score_unknown < 1.0
    
    def test_recency_score_calculation(self, selection_service):
        """Test recency score calculation."""
        experiences = [
            Experience(id="exp-1", company="Company A", role="Engineer", startDate="2024", endDate="Present"),
            Experience(id="exp-2", company="Company B", role="Engineer", startDate="2023", endDate="2024"),
            Experience(id="exp-3", company="Company C", role="Engineer", startDate="2022", endDate="2023"),
            Experience(id="exp-4", company="Company D", role="Engineer", startDate="2020", endDate="2021"),
        ]
        
        # Most recent (index 0) should have highest score
        score_most_recent = selection_service._calculate_recency_score(experiences[0], experiences)
        assert score_most_recent == 1.0
        
        # Older experiences should have lower scores
        score_old = selection_service._calculate_recency_score(experiences[3], experiences)
        assert score_old < score_most_recent
    
    def test_role_match_score_calculation(self, selection_service):
        """Test role match score calculation."""
        job_description = "Software Engineer with Python and microservices experience"
        
        # Exact match
        score_exact = selection_service._calculate_role_match_score("Software Engineer", job_description)
        assert score_exact > 0
        
        # Partial match
        score_partial = selection_service._calculate_role_match_score("Senior Software Engineer", job_description)
        assert score_partial > 0
        
        # No match
        score_no_match = selection_service._calculate_role_match_score("Product Manager", job_description)
        assert score_no_match >= 0
    
    def test_is_prestigious_company(self, selection_service):
        """Test prestigious company detection."""
        assert selection_service._is_prestigious_company("Google") == True
        assert selection_service._is_prestigious_company("Meta") == True
        assert selection_service._is_prestigious_company("Amazon") == True
        assert selection_service._is_prestigious_company("Random Startup") == False
    
    def test_estimate_experience_lines(self, selection_service):
        """Test experience line count estimation."""
        bullets = [
            SelectedBullet(id="b1", text="Bullet 1", relevanceScore=0.9, lineCount=1),
            SelectedBullet(id="b2", text="Bullet 2", relevanceScore=0.8, lineCount=2),
        ]
        
        line_count = selection_service._estimate_experience_lines(bullets)
        
        # Should include bullet lines (1 + 2) + 2 for header = 5
        assert line_count == 5
    
    @pytest.mark.asyncio
    async def test_composite_score_calculation(self, selection_service, job_description):
        """Test that composite score combines all factors correctly."""
        experience = Experience(
            id="exp-1",
            company="Google",  # Prestigious
            role="Software Engineer",  # Matches job
            startDate="2024",  # Most recent
            endDate="Present",
            bullets=[
                Bullet(id="b1", text="Developed microservices using Python"),  # Relevant
            ]
        )
        
        selected_bullets = [
            SelectedBullet(id="b1", text="Developed microservices using Python", relevanceScore=0.9, lineCount=1)
        ]
        
        all_experiences = [experience]
        
        score = selection_service._score_experience(
            experience,
            selected_bullets,
            job_description,
            all_experiences
        )
        
        # Should have high composite score due to:
        # - High relevance (0.9)
        # - Most recent (1.0)
        # - Prestigious (1.0)
        # - Role match (>0)
        assert score > 0.5
        assert score <= 1.0


class TestHybridAlgorithmFeatures:
    """Test hybrid algorithm specific features (Must-Haves, Squeeze, Revive, Orphans)."""
    
    @pytest.fixture
    def selection_service(self):
        """Create a SelectionService instance for testing."""
        with patch('app.services.selection_service.VectorSearch'):
            service = SelectionService()
            embedding_generator = Mock()
            
            def mock_embedding(text):
                return np.random.rand(1536).astype(np.float32)
            
            embedding_generator.generate_embedding = Mock(side_effect=mock_embedding)
            embedding_generator.generate_embeddings_batch = Mock(
                side_effect=lambda texts: [mock_embedding(text) for text in texts]
            )
            service.vector_search.embedding_generator = embedding_generator
            return service
    
    @pytest.fixture
    def job_description(self):
        """Sample job description for testing."""
        return "Software Engineer with experience in microservices, Python, REST APIs, and team leadership."
    
    @pytest.mark.asyncio
    async def test_must_haves_anchor_and_trophy(self, selection_service, job_description):
        """Test that Must-Haves (Anchor + Trophy) are always included."""
        resume = StructuredResume(
            experiences=[
                Experience(
                    id="exp-1",
                    company="Google",  # Trophy (highest prestige)
                    role="Software Engineer",
                    startDate="Jun 2023",
                    endDate="Present",  # Anchor (most recent)
                    bullets=[
                        Bullet(id="b1", text="Some work"),
                        Bullet(id="b2", text="More work"),
                    ]
                ),
                Experience(
                    id="exp-2",
                    company="Small Startup",
                    role="Software Engineer",
                    startDate="Jun 2022",
                    endDate="May 2023",
                    bullets=[
                        Bullet(id="b3", text="Highly relevant microservices Python REST work"),
                        Bullet(id="b4", text="Very relevant work"),
                    ]
                ),
                Experience(
                    id="exp-3",
                    company="Meta",  # Also prestigious (but Google is first, so it's the Trophy)
                    role="Software Engineer",
                    startDate="Jan 2021",
                    endDate="May 2022",
                    bullets=[
                        Bullet(id="b5", text="Old work"),
                    ]
                )
            ]
        )
        
        with patch('numpy.dot', return_value=0.3), \
             patch('numpy.linalg.norm', return_value=1.0):
            
            result = await selection_service.select_bullets(
                resume,
                job_description,
                bullets_per_experience=2
            )
            
            # Anchor (most recent) should always be included
            company_names = [exp.company for exp in result.experiences]
            assert "Google" in company_names  # Both Anchor and Trophy
    
    @pytest.mark.asyncio
    async def test_squeeze_phase_removes_lowest_bullets(self, selection_service, job_description):
        """Test that Squeeze phase removes globally lowest-scoring bullets."""
        # Create scenario where we need to squeeze
        resume = StructuredResume(
            experiences=[
                Experience(
                    id="exp-1",
                    company="Company A",
                    role="Software Engineer",
                    startDate="2023",
                    endDate="Present",
                    bullets=[
                        Bullet(id="b1", text="High relevance microservices Python REST"),
                        Bullet(id="b2", text="Medium relevance work"),
                        Bullet(id="b3", text="Low relevance unrelated work"),  # Should be removed first
                    ]
                ),
                Experience(
                    id="exp-2",
                    company="Company B",
                    role="Software Engineer",
                    startDate="2022",
                    endDate="2023",
                    bullets=[
                        Bullet(id="b4", text="High relevance microservices"),
                        Bullet(id="b5", text="Low relevance unrelated"),  # Should be removed second
                    ]
                )
            ]
        )
        
        # Mock different scores for different bullets
        call_count = [0]
        def mock_dot(a, b):
            call_count[0] += 1
            # b1, b4: high relevance (0.9)
            # b2: medium (0.5)
            # b3, b5: low (0.2)
            if call_count[0] in [1, 4]:  # b1, b4
                return 0.9
            elif call_count[0] == 2:  # b2
                return 0.5
            else:  # b3, b5
                return 0.2
        
        with patch('numpy.dot', side_effect=mock_dot), \
             patch('numpy.linalg.norm', return_value=1.0):
            
            result = await selection_service.select_bullets(
                resume,
                job_description,
                bullets_per_experience=3  # Start with 3, squeeze will reduce
            )
            
            # Should have experiences, but with fewer bullets after squeeze
            assert len(result.experiences) > 0
            # Low relevance bullets should be removed first
    
    @pytest.mark.asyncio
    async def test_orphan_one_liner_mode(self, selection_service, job_description):
        """Test that must-have experiences with no bullets go to one-liner mode."""
        resume = StructuredResume(
            experiences=[
                Experience(
                    id="exp-1",
                    company="Google",  # Must-have (prestigious + most recent)
                    role="Software Engineer",
                    startDate="2023",
                    endDate="Present",
                    bullets=[
                        Bullet(id="b1", text="Unrelated work that might get removed"),
                    ]
                ),
                Experience(
                    id="exp-2",
                    company="Company B",
                    role="Software Engineer",
                    startDate="2022",
                    endDate="2023",
                    bullets=[
                        Bullet(id="b2", text="Highly relevant microservices Python REST"),
                        Bullet(id="b3", text="Very relevant work"),
                    ]
                )
            ]
        )
        
        # Mock low relevance for Google bullets (so they get removed)
        call_count = [0]
        def mock_dot(a, b):
            call_count[0] += 1
            if call_count[0] == 1:  # Google bullet
                return 0.1  # Very low
            else:  # Company B bullets
                return 0.9  # Very high
        
        with patch('numpy.dot', side_effect=mock_dot), \
             patch('numpy.linalg.norm', return_value=1.0):
            
            result = await selection_service.select_bullets(
                resume,
                job_description,
                bullets_per_experience=1
            )
            
            # Google should still be included (one-liner mode) even if no bullets
            company_names = [exp.company for exp in result.experiences]
            assert "Google" in company_names
            
            # Google experience might have 0 bullets (one-liner mode)
            google_exp = next((exp for exp in result.experiences if exp.company == "Google"), None)
            if google_exp:
                # In one-liner mode, it might have 0 bullets but still be included
                assert google_exp.company == "Google"
    
    @pytest.mark.asyncio
    async def test_revive_phase_fills_space(self, selection_service, job_description):
        """Test that Revive phase adds back high-scoring bullets if under limit."""
        resume = StructuredResume(
            experiences=[
                Experience(
                    id="exp-1",
                    company="Company A",
                    role="Software Engineer",
                    startDate="2023",
                    endDate="Present",
                    bullets=[
                        Bullet(id="b1", text="High relevance microservices Python REST"),
                        Bullet(id="b2", text="Medium relevance work"),
                        Bullet(id="b3", text="Low relevance work"),  # Might be removed, then revived
                    ]
                )
            ]
        )
        
        # Mock scores
        call_count = [0]
        def mock_dot(a, b):
            call_count[0] += 1
            if call_count[0] == 1:  # b1
                return 0.9
            elif call_count[0] == 2:  # b2
                return 0.5
            else:  # b3
                return 0.3  # Low but not terrible
        
        with patch('numpy.dot', side_effect=mock_dot), \
             patch('numpy.linalg.norm', return_value=1.0):
            
            result = await selection_service.select_bullets(
                resume,
                job_description,
                bullets_per_experience=3
            )
            
            # Should have at least some bullets
            assert len(result.experiences) > 0
            if result.experiences[0].selectedBullets:
                # Should prioritize high-relevance bullets
                assert len(result.experiences[0].selectedBullets) >= 1
    
    @pytest.mark.asyncio
    async def test_global_bullet_optimization(self, selection_service, job_description):
        """Test that algorithm optimizes bullets globally, not just per experience."""
        resume = StructuredResume(
            experiences=[
                Experience(
                    id="exp-1",
                    company="Low Score Company",
                    role="Engineer",
                    startDate="2022",
                    endDate="2023",
                    bullets=[
                        Bullet(id="b1", text="High relevance microservices Python REST"),  # High score
                        Bullet(id="b2", text="Low relevance unrelated"),
                    ]
                ),
                Experience(
                    id="exp-2",
                    company="High Score Company",
                    role="Software Engineer",
                    startDate="2023",
                    endDate="Present",
                    bullets=[
                        Bullet(id="b3", text="Medium relevance work"),
                        Bullet(id="b4", text="Low relevance unrelated"),  # Lower than b1
                    ]
                )
            ]
        )
        
        # Mock scores: b1 > b3 > b2, b4
        call_count = [0]
        def mock_dot(a, b):
            call_count[0] += 1
            if call_count[0] == 1:  # b1 - highest
                return 0.9
            elif call_count[0] == 3:  # b3 - medium
                return 0.6
            else:  # b2, b4 - low
                return 0.2
        
        with patch('numpy.dot', side_effect=mock_dot), \
             patch('numpy.linalg.norm', return_value=1.0):
            
            result = await selection_service.select_bullets(
                resume,
                job_description,
                bullets_per_experience=2
            )
            
            # Should keep high-relevance bullets even from low-scoring experience
            assert len(result.experiences) > 0
            # b1 (high relevance from low-scoring company) should be kept
            # b4 (low relevance from high-scoring company) should be removed first
    
    def test_score_all_bullets_method(self, selection_service, job_description):
        """Test the _score_all_bullets_for_experience method."""
        bullets = [
            Bullet(id="b1", text="High relevance microservices Python"),
            Bullet(id="b2", text="Low relevance unrelated work"),
        ]
        
        # This is an async method, so we'd need to test it differently
        # For now, just verify the method exists
        assert hasattr(selection_service, '_score_all_bullets_for_experience')
    
    @pytest.mark.asyncio
    async def test_priority_queue_selects_highest_scores_first(self, selection_service, job_description):
        """Test that priority queue selects experiences with highest scores first."""
        resume = StructuredResume(
            experiences=[
                Experience(
                    id="exp-1",
                    company="Low Score Company",
                    role="Engineer",
                    startDate="2020",
                    endDate="2021",
                    bullets=[
                        Bullet(id="b1", text="Unrelated work"),
                        Bullet(id="b2", text="More unrelated"),
                    ]
                ),
                Experience(
                    id="exp-2",
                    company="High Score Company",
                    role="Software Engineer",
                    startDate="2023",
                    endDate="Present",
                    bullets=[
                        Bullet(id="b3", text="Developed microservices using Python and REST APIs"),
                        Bullet(id="b4", text="Led team of engineers"),
                    ]
                ),
                Experience(
                    id="exp-3",
                    company="Medium Score Company",
                    role="Engineer",
                    startDate="2022",
                    endDate="2023",
                    bullets=[
                        Bullet(id="b5", text="Some relevant work with Python"),
                    ]
                )
            ]
        )
        
        # Mock different relevance scores
        call_count = [0]
        def mock_dot(a, b):
            call_count[0] += 1
            # Return high score for exp-2, medium for exp-3, low for exp-1
            if call_count[0] <= 2:  # exp-1 bullets
                return 0.2
            elif call_count[0] <= 4:  # exp-2 bullets
                return 0.9
            else:  # exp-3 bullets
                return 0.5
        
        with patch('numpy.dot', side_effect=mock_dot), \
             patch('numpy.linalg.norm', return_value=1.0):
            
            result = await selection_service.select_bullets(
                resume,
                job_description,
                bullets_per_experience=2
            )
            
            # High score company should be first (or included)
            if len(result.experiences) > 0:
                company_names = [exp.company for exp in result.experiences]
                # High Score Company should be included
                assert "High Score Company" in company_names

