"""
Comprehensive integration tests for /select and /optimize API endpoints.

Tests the full API workflow including request/response validation.
"""

import pytest
from fastapi import FastAPI
from starlette.testclient import TestClient
from unittest.mock import patch, AsyncMock, Mock
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.api import rag
from app.schemas.rag import (
    StructuredResume, Experience, Education, Project, CustomSection, Bullet,
    SelectedResume, SelectedExperience, SelectedEducation, SelectedProject,
    SelectedCustomSection, SelectedBullet
)


@pytest.fixture
def app():
    """Create a FastAPI app for testing without startup events."""
    test_app = FastAPI()
    test_app.include_router(rag.router, prefix="/api/v1", tags=["RAG"])
    return test_app


@pytest.fixture
def client(app):
    """Create a test client for the FastAPI app."""
    # Use starlette's TestClient directly
    return TestClient(app)


@pytest.fixture
def sample_structured_resume():
    """Create a sample structured resume for API testing."""
    return {
        "experiences": [
            {
                "id": "exp-1",
                "company": "Google",
                "role": "Software Engineer II",
                "startDate": "Jun 2022",
                "endDate": "Present",
                "bullets": [
                    {"id": "bullet-1", "text": "Developed microservices handling 10M+ daily requests using Python, Go, and Kubernetes"},
                    {"id": "bullet-2", "text": "Optimized database queries and caching strategies, reducing API response time by 40%"},
                    {"id": "bullet-3", "text": "Led a team of 3 engineers to ship a new recommendation feature"},
                    {"id": "bullet-4", "text": "Implemented comprehensive CI/CD pipelines using Jenkins and Docker"},
                    {"id": "bullet-5", "text": "Designed and built RESTful and gRPC APIs serving 5M+ requests per day"},
                ]
            },
            {
                "id": "exp-2",
                "company": "Meta",
                "role": "Software Engineering Intern",
                "startDate": "Jun 2021",
                "endDate": "Aug 2021",
                "bullets": [
                    {"id": "bullet-6", "text": "Built React components for Facebook Marketplace"},
                    {"id": "bullet-7", "text": "Optimized GraphQL API endpoints and data fetching strategies"},
                ]
            }
        ],
        "education": [
            {
                "id": "edu-1",
                "school": "Stanford University",
                "degree": "B.S.",
                "field": "Computer Science",
                "startDate": "Sep 2018",
                "endDate": "Jun 2022",
                "bullets": [
                    {"id": "bullet-8", "text": "GPA: 3.9/4.0, Magna Cum Laude"},
                    {"id": "bullet-9", "text": "Relevant Coursework: Algorithms & Data Structures, Machine Learning, Distributed Systems"},
                ]
            }
        ],
        "projects": [
            {
                "id": "proj-1",
                "name": "Distributed Task Scheduler",
                "description": "High-performance distributed task scheduling system",
                "technologies": "Go, Kubernetes, Redis, PostgreSQL",
                "bullets": [
                    {"id": "bullet-10", "text": "Built scalable task scheduler handling 100K+ concurrent tasks"},
                    {"id": "bullet-11", "text": "Implemented distributed consensus algorithm using Raft protocol"},
                ]
            }
        ],
        "customSections": [
            {
                "id": "custom-1",
                "title": "Technical Skills",
                "bullets": [
                    {"id": "bullet-12", "text": "Languages: Python, JavaScript, TypeScript, Go, Java"},
                    {"id": "bullet-13", "text": "Backend: Node.js, Express, Django, Spring Boot, GraphQL, gRPC"},
                ]
            }
        ]
    }


@pytest.fixture
def job_description():
    """Sample job description for testing."""
    return "Software Engineer position focusing on microservices architecture, Python development, REST APIs, and team leadership. Experience with CI/CD pipelines and Kubernetes required."


class TestSelectEndpoint:
    """Test the /api/v1/select endpoint."""
    
    def test_select_endpoint_success(self, client, sample_structured_resume, job_description):
        """Test successful selection request."""
        with patch('app.api.rag.SelectionService') as mock_selection_service:
            # Mock the selection service
            mock_service = Mock()
            mock_service.select_bullets = AsyncMock(return_value=SelectedResume(
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
                                text="Developed microservices handling 10M+ daily requests",
                                relevanceScore=0.92,
                                lineCount=1
                            ),
                            SelectedBullet(
                                id="bullet-2",
                                text="Optimized database queries and caching strategies",
                                relevanceScore=0.88,
                                lineCount=1
                            )
                        ]
                    )
                ]
            ))
            
            mock_selection_service.return_value = mock_service
            
            request_data = {
                "job_description": job_description,
                "resume": sample_structured_resume,
                "bullets_per_experience": 3,
                "bullets_per_education": 2,
                "bullets_per_project": 2,
                "bullets_per_custom": 5
            }
            
            response = client.post("/api/v1/select", json=request_data)
            
            assert response.status_code == 200
            data = response.json()
            
            # Verify response structure
            assert data["mode"] == "select"
            assert "selectedResume" in data
            assert "totalLineCount" in data
            assert "maxLines" in data
            assert "fitsOnePage" in data
            assert "gaps" in data
            assert "processing_time" in data
            assert "created_at" in data
            
            # Verify selected resume structure
            selected_resume = data["selectedResume"]
            assert "experiences" in selected_resume
            assert len(selected_resume["experiences"]) > 0
    
    def test_select_endpoint_missing_job_description(self, client, sample_structured_resume):
        """Test selection endpoint with missing job description."""
        request_data = {
            "resume": sample_structured_resume,
            "bullets_per_experience": 3
        }
        
        response = client.post("/api/v1/select", json=request_data)
        
        assert response.status_code == 422  # Validation error
    
    def test_select_endpoint_missing_resume(self, client, job_description):
        """Test selection endpoint with missing resume."""
        request_data = {
            "job_description": job_description,
            "bullets_per_experience": 3
        }
        
        response = client.post("/api/v1/select", json=request_data)
        
        assert response.status_code == 422  # Validation error
    
    def test_select_endpoint_invalid_bullets_per_experience(self, client, sample_structured_resume, job_description):
        """Test selection endpoint with invalid bullets_per_experience value."""
        request_data = {
            "job_description": job_description,
            "resume": sample_structured_resume,
            "bullets_per_experience": 0  # Invalid: must be >= 1
        }
        
        response = client.post("/api/v1/select", json=request_data)
        
        assert response.status_code == 422  # Validation error
    
    def test_select_endpoint_empty_resume(self, client, job_description):
        """Test selection endpoint with empty resume."""
        request_data = {
            "job_description": job_description,
            "resume": {
                "experiences": [],
                "education": [],
                "projects": [],
                "customSections": []
            },
            "bullets_per_experience": 3
        }
        
        with patch('app.api.rag.SelectionService') as mock_selection_service:
            mock_service = Mock()
            mock_service.select_bullets = AsyncMock(return_value=SelectedResume())
            mock_selection_service.return_value = mock_service
            
            response = client.post("/api/v1/select", json=request_data)
            
            assert response.status_code == 200
            data = response.json()
            assert data["totalLineCount"] == 0
            assert len(data["selectedResume"]["experiences"]) == 0
    
    def test_select_endpoint_error_handling(self, client, sample_structured_resume, job_description):
        """Test selection endpoint error handling."""
        with patch('app.api.rag.SelectionService') as mock_selection_service:
            # Mock service to raise an error
            mock_service = Mock()
            mock_service.select_bullets = AsyncMock(side_effect=Exception("Selection failed"))
            mock_selection_service.return_value = mock_service
            
            request_data = {
                "job_description": job_description,
                "resume": sample_structured_resume,
                "bullets_per_experience": 3
            }
            
            response = client.post("/api/v1/select", json=request_data)
            
            assert response.status_code == 500
            assert "Selection failed" in response.json()["detail"]


class TestOptimizeEndpoint:
    """Test the /api/v1/optimize endpoint."""
    
    def test_optimize_endpoint_success(self, client, sample_structured_resume, job_description):
        """Test successful optimization request."""
        with patch('app.api.rag.OptimizationService') as mock_optimization_service:
            # Mock the optimization service
            mock_service = Mock()
            mock_service.optimize_resume = AsyncMock(return_value=SelectedResume(
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
                                text="Architected scalable microservices handling 10M+ daily requests",
                                relevanceScore=0.92,
                                lineCount=1,
                                original="Developed microservices handling 10M+ daily requests",
                                rewritten="Architected scalable microservices handling 10M+ daily requests",
                                reasoning="Enhanced with quantifiable metrics"
                            )
                        ]
                    )
                ]
            ))
            
            mock_optimization_service.return_value = mock_service
            
            request_data = {
                "job_description": job_description,
                "resume": sample_structured_resume,
                "bullets_per_experience": 3,
                "bullets_per_education": 2,
                "bullets_per_project": 2,
                "bullets_per_custom": 5,
                "rewrite_style": "professional",
                "optimization_mode": "strict"
            }
            
            response = client.post("/api/v1/optimize", json=request_data)
            
            assert response.status_code == 200
            data = response.json()
            
            # Verify response structure
            assert data["mode"] == "optimize"
            assert "optimizedResume" in data
            assert "totalLineCount" in data
            assert "maxLines" in data
            assert "fitsOnePage" in data
            assert "gaps" in data
            assert "processing_time" in data
            assert "created_at" in data
            
            # Verify optimized resume has rewritten bullets
            optimized_resume = data["optimizedResume"]
            if len(optimized_resume["experiences"]) > 0:
                bullets = optimized_resume["experiences"][0]["selectedBullets"]
                if len(bullets) > 0:
                    # Should have original and rewritten fields
                    assert "original" in bullets[0]
                    assert "rewritten" in bullets[0]
    
    def test_optimize_endpoint_missing_optional_fields(self, client, sample_structured_resume, job_description):
        """Test optimization endpoint with missing optional fields (should use defaults)."""
        with patch('app.api.rag.OptimizationService') as mock_optimization_service:
            mock_service = Mock()
            mock_service.optimize_resume = AsyncMock(return_value=SelectedResume())
            mock_optimization_service.return_value = mock_service
            
            request_data = {
                "job_description": job_description,
                "resume": sample_structured_resume
                # Missing optional fields - should use defaults
            }
            
            response = client.post("/api/v1/optimize", json=request_data)
            
            assert response.status_code == 200
    
    def test_optimize_endpoint_invalid_rewrite_style(self, client, sample_structured_resume, job_description):
        """Test optimization endpoint with invalid rewrite_style."""
        request_data = {
            "job_description": job_description,
            "resume": sample_structured_resume,
            "rewrite_style": "invalid_style"  # Should still work, just use it
        }
        
        # This should actually work (not validate enum), but test it
        with patch('app.api.rag.OptimizationService') as mock_optimization_service:
            mock_service = Mock()
            mock_service.optimize_resume = AsyncMock(return_value=SelectedResume())
            mock_optimization_service.return_value = mock_service
            
            response = client.post("/api/v1/optimize", json=request_data)
            
            # Should still work (rewrite_style is just a string)
            assert response.status_code in [200, 422]
    
    def test_optimize_endpoint_error_handling(self, client, sample_structured_resume, job_description):
        """Test optimization endpoint error handling."""
        with patch('app.api.rag.OptimizationService') as mock_optimization_service:
            # Mock service to raise an error
            mock_service = Mock()
            mock_service.optimize_resume = AsyncMock(side_effect=Exception("Optimization failed"))
            mock_optimization_service.return_value = mock_service
            
            request_data = {
                "job_description": job_description,
                "resume": sample_structured_resume,
                "bullets_per_experience": 3
            }
            
            response = client.post("/api/v1/optimize", json=request_data)
            
            assert response.status_code == 500
            assert "Optimization failed" in response.json()["detail"]


class TestEndpointsComparison:
    """Test comparison between /select and /optimize endpoints."""
    
    def test_select_vs_optimize_response_difference(self, client, sample_structured_resume, job_description):
        """Test that select and optimize return different structures."""
        with patch('app.api.rag.SelectionService') as mock_selection, \
             patch('app.api.rag.OptimizationService') as mock_optimization:
            
            # Mock selection service
            mock_sel_service = Mock()
            mock_sel_service.select_bullets = AsyncMock(return_value=SelectedResume(
                experiences=[
                    SelectedExperience(
                        id="exp-1",
                        company="Google",
                        role="Software Engineer",
                        selectedBullets=[
                            SelectedBullet(
                                id="b1",
                                text="Original bullet text",
                                relevanceScore=0.9,
                                lineCount=1
                            )
                        ]
                    )
                ]
            ))
            mock_selection.return_value = mock_sel_service
            
            # Mock optimization service
            mock_opt_service = Mock()
            mock_opt_service.optimize_resume = AsyncMock(return_value=SelectedResume(
                experiences=[
                    SelectedExperience(
                        id="exp-1",
                        company="Google",
                        role="Software Engineer",
                        selectedBullets=[
                            SelectedBullet(
                                id="b1",
                                text="Rewritten bullet text",
                                relevanceScore=0.9,
                                lineCount=1,
                                original="Original bullet text",
                                rewritten="Rewritten bullet text",
                                reasoning="Enhanced"
                            )
                        ]
                    )
                ]
            ))
            mock_optimization.return_value = mock_opt_service
            
            request_data = {
                "job_description": job_description,
                "resume": sample_structured_resume,
                "bullets_per_experience": 1
            }
            
            # Test select endpoint
            select_response = client.post("/api/v1/select", json=request_data)
            assert select_response.status_code == 200
            select_data = select_response.json()
            assert select_data["mode"] == "select"
            
            # Test optimize endpoint
            optimize_response = client.post("/api/v1/optimize", json=request_data)
            assert optimize_response.status_code == 200
            optimize_data = optimize_response.json()
            assert optimize_data["mode"] == "optimize"
            
            # Verify difference in response structure
            if len(select_data["selectedResume"]["experiences"]) > 0:
                select_bullet = select_data["selectedResume"]["experiences"][0]["selectedBullets"][0]
                # Select mode should NOT have rewritten field
                assert "rewritten" not in select_bullet or select_bullet.get("rewritten") is None
            
            if len(optimize_data["optimizedResume"]["experiences"]) > 0:
                optimize_bullet = optimize_data["optimizedResume"]["experiences"][0]["selectedBullets"][0]
                # Optimize mode SHOULD have rewritten field
                assert "rewritten" in optimize_bullet
                assert "original" in optimize_bullet

