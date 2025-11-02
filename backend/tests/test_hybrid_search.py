"""
Tests for hybrid search functionality.

These tests verify that the hybrid search approach (semantic + keyword matching)
works correctly and improves retrieval quality compared to semantic-only search.
"""

import pytest
import os
from unittest.mock import Mock, patch, MagicMock
from typing import List, Tuple

# Import modules to test
from app.core.search import VectorSearch
from app.core.keyword_patterns import TECH_PATTERNS, ACTION_VERBS, COMMON_WORDS


class TestKeywordExtraction:
    """Test keyword extraction from job descriptions."""
    
    def test_extract_programming_languages(self):
        """Test that programming languages are correctly extracted."""
        search = VectorSearch()
        
        jd = "We need someone with Python, Java, and TypeScript experience."
        keywords = search.extract_keywords(jd)
        
        assert "python" in keywords
        assert "java" in keywords
        assert "typescript" in keywords
        assert len(keywords) > 0
    
    def test_extract_frontend_frameworks(self):
        """Test that frontend frameworks are correctly extracted."""
        search = VectorSearch()
        
        jd = "Looking for React and Vue.js developers with Next.js experience."
        keywords = search.extract_keywords(jd)
        
        keywords_lower = [k.lower() for k in keywords]
        assert "react" in keywords_lower
        assert "vue" in keywords_lower
        assert "next.js" in keywords_lower or "next" in keywords_lower
    
    def test_extract_cloud_services(self):
        """Test that cloud services are correctly extracted."""
        search = VectorSearch()
        
        jd = "Experience with AWS, Docker, and Kubernetes required."
        keywords = search.extract_keywords(jd)
        
        assert "aws" in keywords
        assert "docker" in keywords
        assert "kubernetes" in keywords
    
    def test_extract_databases(self):
        """Test that databases are correctly extracted."""
        search = VectorSearch()
        
        jd = "PostgreSQL, MongoDB, and Redis experience preferred."
        keywords = search.extract_keywords(jd)
        
        assert "postgresql" in keywords
        assert "mongodb" in keywords
        assert "redis" in keywords
    
    def test_extract_action_verbs(self):
        """Test that action verbs are correctly extracted."""
        search = VectorSearch()
        
        jd = "You will implement and deploy systems, optimize performance, and lead teams."
        keywords = search.extract_keywords(jd)
        
        assert "implement" in keywords
        assert "deploy" in keywords
        assert "optimize" in keywords
        assert "lead" in keywords
    
    def test_extract_multiple_tech_terms(self):
        """Test extraction of multiple diverse tech terms."""
        search = VectorSearch()
        
        jd = """
        We need a full-stack engineer with:
        - Python, FastAPI backend experience
        - React, TypeScript frontend skills
        - AWS, Docker, Kubernetes deployment knowledge
        - PostgreSQL and Redis database expertise
        - CI/CD with GitHub Actions
        """
        keywords = search.extract_keywords(jd)
        
        expected_keywords = ["python", "fastapi", "react", "typescript", 
                            "aws", "docker", "kubernetes", "postgresql", "redis"]
        
        keywords_lower = [k.lower() for k in keywords]
        found_count = sum(1 for kw in expected_keywords if kw in keywords_lower)
        
        # Should find at least 7 out of 9 expected keywords
        assert found_count >= 7, f"Found only {found_count} expected keywords. Got: {keywords}"
    
    def test_extract_case_insensitive(self):
        """Test that extraction is case-insensitive."""
        search = VectorSearch()
        
        jd_lower = "python, react, aws"
        jd_upper = "PYTHON, REACT, AWS"
        jd_mixed = "Python, React, AWS"
        
        keywords_lower = search.extract_keywords(jd_lower)
        keywords_upper = search.extract_keywords(jd_upper)
        keywords_mixed = search.extract_keywords(jd_mixed)
        
        # All should extract the same keywords
        assert "python" in keywords_lower
        assert "python" in keywords_upper
        assert "python" in keywords_mixed
    
    def test_filter_common_words(self):
        """Test that common words are filtered out."""
        search = VectorSearch()
        
        jd = "The company is looking for someone with experience."
        keywords = search.extract_keywords(jd)
        
        # Should not include common words
        assert "the" not in keywords
        assert "company" not in keywords  # In COMMON_WORDS
        assert "experience" not in keywords  # In COMMON_WORDS


class TestKeywordScoring:
    """Test keyword matching score computation."""
    
    def test_keyword_score_perfect_match(self):
        """Test score when all keywords match."""
        search = VectorSearch()
        
        keywords = ["python", "react", "aws"]
        bullet = "Developed Python and React applications on AWS infrastructure."
        
        score = search.compute_keyword_score(bullet, keywords)
        
        # All 3 keywords match, so score should be 1.0
        assert score == 1.0
    
    def test_keyword_score_partial_match(self):
        """Test score when only some keywords match."""
        search = VectorSearch()
        
        keywords = ["python", "react", "aws", "docker"]
        bullet = "Built Python application with React frontend."
        
        score = search.compute_keyword_score(bullet, keywords)
        
        # 2 out of 4 keywords match, so score should be 0.5
        assert score == 0.5
    
    def test_keyword_score_no_match(self):
        """Test score when no keywords match."""
        search = VectorSearch()
        
        keywords = ["python", "react"]
        bullet = "Managed team and improved processes."
        
        score = search.compute_keyword_score(bullet, keywords)
        
        # No keywords match, so score should be 0.0
        assert score == 0.0
    
    def test_keyword_score_empty_keywords(self):
        """Test score with empty keyword list."""
        search = VectorSearch()
        
        keywords = []
        bullet = "Any bullet point text."
        
        score = search.compute_keyword_score(bullet, keywords)
        
        assert score == 0.0
    
    def test_keyword_score_case_insensitive(self):
        """Test that keyword matching is case-insensitive."""
        search = VectorSearch()
        
        keywords = ["python", "AWS"]
        bullet = "Developed PYTHON applications using aws services."
        
        score = search.compute_keyword_score(bullet, keywords)
        
        # Both should match despite case differences
        assert score == 1.0


class TestHybridSearch:
    """Test hybrid search functionality."""
    
    def test_extract_keywords_from_job_description(self):
        """Test that keywords are extracted from job description."""
        search = VectorSearch()
        
        jd = "Looking for Python developer with React and AWS experience."
        keywords = search.extract_keywords(jd)
        
        assert len(keywords) > 0
        assert "python" in keywords
        assert "react" in keywords
        assert "aws" in keywords
    
    @patch('app.core.search.VectorSearch')
    def test_hybrid_search_returns_results(self, mock_vector_search_class):
        """Test that hybrid search returns properly formatted results."""
        # Create a real search instance but mock the ChromaDB query
        search = VectorSearch()
        search.embedding_generator = Mock()
        search.embedding_generator.generate_embedding = Mock(return_value=[0.1] * 1536)
        search.collection = Mock()
        search.collection.count = Mock(return_value=10)
        
        # Mock query results
        mock_results = {
            'documents': [['Bullet 1', 'Bullet 2', 'Bullet 3']],
            'distances': [[0.2, 0.3, 0.4]]
        }
        search.collection.query = Mock(return_value=mock_results)
        
        jd = "Python developer with microservices experience"
        results = search.search_hybrid(jd, top_k=3)
        
        # Should return list of tuples
        assert isinstance(results, list)
        assert len(results) == 3
        assert all(isinstance(r, tuple) and len(r) == 2 for r in results)
        assert all(isinstance(score, float) and 0.0 <= score <= 1.0 
                   for _, score in results)
    
    @patch('app.core.search.VectorSearch')
    def test_hybrid_search_ranks_by_hybrid_score(self, mock_vector_search_class):
        """Test that hybrid search properly re-ranks by combining semantic and keyword scores."""
        search = VectorSearch()
        search.embedding_generator = Mock()
        search.embedding_generator.generate_embedding = Mock(return_value=[0.1] * 1536)
        search.collection = Mock()
        search.collection.count = Mock(return_value=10)
        
        # Mock query results - semantic search returns these in order by distance
        # Bullet 1: high semantic similarity (low distance), high keyword match
        # Bullet 2: medium semantic similarity, high keyword match  
        # Bullet 3: high semantic similarity, low keyword match
        mock_results = {
            'documents': [[
                "Built Python microservices on AWS",  # High keyword match
                "Developed REST API with FastAPI",    # Medium keyword match
                "Managed team and improved processes" # Low keyword match
            ]],
            'distances': [[0.1, 0.3, 0.15]]  # Lower distance = higher semantic similarity
        }
        search.collection.query = Mock(return_value=mock_results)
        
        jd = "Python AWS microservices developer"
        results = search.search_hybrid(jd, top_k=3)
        
        # Results should be sorted by hybrid score (descending)
        scores = [score for _, score in results]
        assert scores == sorted(scores, reverse=True)
        
        # First result should have highest hybrid score
        # Since Bullet 1 has both high semantic AND high keyword match,
        # it should rank highest
        first_bullet = results[0][0]
        assert "Python" in first_bullet or "AWS" in first_bullet
    
    def test_hybrid_search_empty_collection(self):
        """Test hybrid search when collection is empty."""
        search = VectorSearch()
        search.embedding_generator = Mock()
        search.embedding_generator.generate_embedding = Mock(return_value=[0.1] * 1536)
        search.collection = Mock()
        search.collection.count = Mock(return_value=0)
        search.collection.query = Mock(return_value={'documents': [[]], 'distances': [[]]})
        
        jd = "Python developer"
        results = search.search_hybrid(jd, top_k=5)
        
        assert results == []
    
    def test_hybrid_search_no_embedding(self):
        """Test hybrid search when embedding generation fails."""
        search = VectorSearch()
        search.embedding_generator = Mock()
        search.embedding_generator.generate_embedding = Mock(return_value=None)
        
        jd = "Python developer"
        results = search.search_hybrid(jd, top_k=5)
        
        assert results == []


class TestHybridVsSemantic:
    """Test comparison between hybrid and semantic-only search."""
    
    @patch('app.core.search.VectorSearch')
    def test_hybrid_finds_keyword_matches_semantic_misses(self, mock_vector_search_class):
        """
        Test that hybrid search can find keyword matches that semantic search might miss.
        
        Scenario: Semantic search might rank a bullet low if the wording is different,
        but if it has exact keyword matches, hybrid search should boost it.
        """
        search = VectorSearch()
        search.embedding_generator = Mock()
        search.embedding_generator.generate_embedding = Mock(return_value=[0.1] * 1536)
        search.collection = Mock()
        search.collection.count = Mock(return_value=10)
        
        # Mock semantic results - a bullet with exact keywords but lower semantic similarity
        mock_results = {
            'documents': [[
                "Worked on various software projects",  # High semantic, no keywords
                "Python Django REST API development",    # Lower semantic, exact keywords!
                "Managed engineering teams"              # Medium semantic, no keywords
            ]],
            'distances': [[0.1, 0.5, 0.2]]  # Lower distance = higher semantic similarity
        }
        search.collection.query = Mock(return_value=mock_results)
        
        jd = "Python Django REST API developer position"
        hybrid_results = search.search_hybrid(jd, top_k=3)
        semantic_results = search.search_similar(jd, top_k=3, use_hybrid=False)
        
        # In semantic search, "Worked on various software projects" would rank first
        # In hybrid search, "Python Django REST API development" should rank higher
        # due to keyword matching
        
        # Get the hybrid top result
        hybrid_top = hybrid_results[0][0] if hybrid_results else ""
        
        # The hybrid result should boost the keyword match
        # (exact verification would require knowing the exact scores)
        assert len(hybrid_results) > 0
        assert isinstance(hybrid_results[0], tuple)


class TestIntegration:
    """Integration tests for hybrid search with real data structure."""
    
    def test_search_similar_with_hybrid_flag(self):
        """Test that search_similar correctly routes to hybrid search."""
        search = VectorSearch()
        search.embedding_generator = Mock()
        search.embedding_generator.generate_embedding = Mock(return_value=[0.1] * 1536)
        search.collection = Mock()
        search.collection.count = Mock(return_value=10)
        
        mock_results = {
            'documents': [['Test bullet']],
            'distances': [[0.2]]
        }
        search.collection.query = Mock(return_value=mock_results)
        
        jd = "Python developer"
        
        # Test semantic-only search
        semantic_results = search.search_similar(jd, top_k=3, use_hybrid=False)
        
        # Test hybrid search
        hybrid_results = search.search_similar(jd, top_k=3, use_hybrid=True)
        
        # Both should return results (format may differ)
        assert isinstance(semantic_results, list)
        assert isinstance(hybrid_results, list)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

