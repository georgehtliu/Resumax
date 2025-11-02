"""
RAG (Retrieval-Augmented Generation) schemas for request/response validation.

These schemas define the data structures for the RAG pipeline:
- RAGRequest: Input from user (job description, parameters)
- RAGResponse: Output with retrieved and rewritten points
- RewrittenPoint: Individual before/after comparison
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class RAGRequest(BaseModel):
    """
    Request schema for RAG optimization.
    
    This defines what the user sends to the API.
    """
    job_description: str = Field(..., description="Job description to match against")
    top_k: int = Field(5, ge=1, le=20, description="Number of resume points to retrieve")
    rewrite_style: str = Field("professional", description="Style for rewriting (professional, technical, concise)")
    optimization_mode: str = Field("strict", description="Optimization mode: 'strict' (existing only) or 'creative' (allow new bullets)")
    use_hybrid: bool = Field(True, description="Use hybrid search (semantic + keyword) instead of semantic only")
    
    class Config:
        schema_extra = {
            "example": {
                "job_description": "We are looking for a Senior Software Engineer with experience in microservices, REST APIs, and team leadership.",
                "top_k": 5,
                "rewrite_style": "professional",
                "optimization_mode": "strict"
            }
        }

class RewrittenPoint(BaseModel):
    """
    Individual resume point with before/after comparison.
    
    This represents one resume bullet point that has been optimized.
    """
    original: str = Field(..., description="Original resume point text")
    rewritten: str = Field(..., description="Optimized resume point text")
    similarity_score: float = Field(..., description="Similarity score from retrieval")
    reasoning: Optional[str] = Field(None, description="LLM reasoning for the rewrite")
    
    class Config:
        schema_extra = {
            "example": {
                "original": "Built compiler optimization for MLIR",
                "rewritten": "Optimized compiler IR for AI hardware acceleration",
                "similarity_score": 0.85,
                "reasoning": "Added AI context to match job requirements"
            }
        }

class RAGResponse(BaseModel):
    """
    Complete RAG pipeline response.
    
    This contains all the results from the RAG process, including
    optimized bullets, identified gaps, and optional new bullet suggestions.
    """
    job_description: str = Field(..., description="Original job description")
    retrieved_points: List[str] = Field(..., description="Points retrieved from vector search")
    rewritten_points: List[RewrittenPoint] = Field(..., description="Optimized resume points")
    gaps: List[str] = Field(default_factory=list, description="Skill/keyword gaps identified in the resume")
    new_bullet_suggestions: List[str] = Field(default_factory=list, description="AI-generated bullet suggestions (only if creative mode)")
    processing_time: float = Field(..., description="Total processing time in seconds")
    created_at: datetime = Field(..., description="Timestamp of processing")
    
    class Config:
        schema_extra = {
            "example": {
                "job_description": "Senior Software Engineer with microservices experience",
                "retrieved_points": ["Led development of microservices architecture"],
                "rewritten_points": [
                    {
                        "original": "Led development of microservices architecture",
                        "rewritten": "Architected scalable microservices solutions reducing system latency by 40%",
                        "similarity_score": 0.87,
                        "reasoning": "Added quantifiable impact and technical depth"
                    }
                ],
                "gaps": ["Kubernetes experience", "CI/CD pipeline design"],
                "new_bullet_suggestions": [],
                "processing_time": 2.34,
                "created_at": "2024-01-15T10:30:00Z"
            }
        }


