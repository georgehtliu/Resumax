"""
RAG (Retrieval-Augmented Generation) schemas for request/response validation.

These schemas define the data structures for the RAG pipeline:
- RAGRequest: Input from user (job description, parameters)
- RAGResponse: Output with retrieved and rewritten points
- RewrittenPoint: Individual before/after comparison
- StructuredResume: Resume with sections (experiences, education, projects, custom sections)
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
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

# ============================================================================
# STRUCTURED RESUME SCHEMAS (For /select and /optimize endpoints)
# ============================================================================

class Bullet(BaseModel):
    """Individual bullet point."""
    id: str = Field(..., description="Unique identifier for the bullet")
    text: str = Field(..., description="Bullet point text")

class Experience(BaseModel):
    """Work experience entry."""
    id: str = Field(..., description="Unique identifier")
    company: str = Field(..., description="Company name")
    role: str = Field(..., description="Job title/role")
    startDate: Optional[str] = Field(None, description="Start date")
    endDate: Optional[str] = Field(None, description="End date")
    bullets: List[Bullet] = Field(default_factory=list, description="List of bullet points")

class Education(BaseModel):
    """Education entry."""
    id: str = Field(..., description="Unique identifier")
    school: str = Field(..., description="School name")
    degree: str = Field(..., description="Degree type (B.S., M.S., etc.)")
    field: str = Field(..., description="Field of study")
    startDate: Optional[str] = Field(None, description="Start date")
    endDate: Optional[str] = Field(None, description="End date")
    bullets: List[Bullet] = Field(default_factory=list, description="List of bullet points")

class Project(BaseModel):
    """Project entry."""
    id: str = Field(..., description="Unique identifier")
    name: str = Field(..., description="Project name")
    description: Optional[str] = Field(None, description="Project description")
    technologies: Optional[str] = Field(None, description="Technologies used")
    startDate: Optional[str] = Field(None, description="Start date")
    endDate: Optional[str] = Field(None, description="End date")
    bullets: List[Bullet] = Field(default_factory=list, description="List of bullet points")

class CustomSection(BaseModel):
    """Custom section (e.g., Skills, Awards, Certifications)."""
    id: str = Field(..., description="Unique identifier")
    title: str = Field(..., description="Section title")
    subtitle: Optional[str] = Field(None, description="Section subtitle")
    bullets: List[Bullet] = Field(default_factory=list, description="List of bullet points")

class PersonalInfo(BaseModel):
    """Personal information for the resume header."""
    firstName: Optional[str] = Field(None, description="First name")
    lastName: Optional[str] = Field(None, description="Last name")
    email: Optional[str] = Field(None, description="Email address")
    phone: Optional[str] = Field(None, description="Phone number")
    linkedin: Optional[str] = Field(None, description="LinkedIn profile URL")
    github: Optional[str] = Field(None, description="GitHub profile URL")

class SkillGroup(BaseModel):
    """Grouped skills (e.g., Languages, Frameworks)."""
    id: str = Field(..., description="Unique identifier for the skill group")
    title: Optional[str] = Field(None, description="Group title (e.g., Languages)")
    skills: List[str] = Field(default_factory=list, description="List of individual skills")

class StructuredResume(BaseModel):
    """Complete structured resume with all sections."""
    personalInfo: Optional[PersonalInfo] = Field(None, description="Personal information block")
    skills: List[SkillGroup] = Field(default_factory=list, description="Skill groups")
    experiences: List[Experience] = Field(default_factory=list)
    education: List[Education] = Field(default_factory=list)
    projects: List[Project] = Field(default_factory=list)
    customSections: List[CustomSection] = Field(default_factory=list)

class SelectedBullet(BaseModel):
    """Selected bullet with relevance score."""
    id: str = Field(..., description="Bullet ID")
    text: str = Field(..., description="Bullet text (original for select, rewritten for optimize)")
    relevanceScore: float = Field(..., description="Relevance score (0-1)")
    lineCount: Optional[int] = Field(None, description="Estimated LaTeX line count")
    original: Optional[str] = Field(None, description="Original text (only for optimize mode)")
    rewritten: Optional[str] = Field(None, description="Rewritten text (only for optimize mode)")
    reasoning: Optional[str] = Field(None, description="LLM reasoning for rewrite (only for optimize mode)")

class SelectedExperience(BaseModel):
    """Experience with selected bullets."""
    id: str
    company: str
    role: str
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    selectedBullets: List[SelectedBullet] = Field(default_factory=list)

class SelectedEducation(BaseModel):
    """Education with selected bullets."""
    id: str
    school: str
    degree: str
    field: str
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    selectedBullets: List[SelectedBullet] = Field(default_factory=list)

class SelectedProject(BaseModel):
    """Project with selected bullets."""
    id: str
    name: str
    description: Optional[str] = None
    technologies: Optional[str] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    selectedBullets: List[SelectedBullet] = Field(default_factory=list)

class SelectedCustomSection(BaseModel):
    """Custom section with selected bullets."""
    id: str
    title: str
    subtitle: Optional[str] = None
    selectedBullets: List[SelectedBullet] = Field(default_factory=list)

class SelectedResume(BaseModel):
    """Resume with selected bullets."""
    personalInfo: Optional[PersonalInfo] = Field(None, description="Personal information block")
    skills: List[SkillGroup] = Field(default_factory=list, description="Skill groups")
    experiences: List[SelectedExperience] = Field(default_factory=list)
    education: List[SelectedEducation] = Field(default_factory=list)
    projects: List[SelectedProject] = Field(default_factory=list)
    customSections: List[SelectedCustomSection] = Field(default_factory=list)

class SelectionRequest(BaseModel):
    """Request for selecting bullets without rewriting."""
    job_description: str = Field(..., description="Job description to match against")
    resume: StructuredResume = Field(..., description="Structured resume with all bullets")
    bullets_per_experience: int = Field(3, ge=1, le=10, description="Number of bullets to select per experience")
    bullets_per_education: int = Field(2, ge=1, le=5, description="Number of bullets to select per education")
    bullets_per_project: int = Field(2, ge=1, le=5, description="Number of bullets to select per project")
    bullets_per_custom: int = Field(5, ge=1, le=10, description="Number of bullets to select per custom section")

class SelectionResponse(BaseModel):
    """Response for selection endpoint."""
    mode: str = Field("select", description="Mode indicator")
    selectedResume: SelectedResume = Field(..., description="Resume with selected bullets")
    totalLineCount: int = Field(..., description="Total estimated LaTeX lines")
    maxLines: int = Field(50, description="Maximum lines for one page")
    fitsOnePage: bool = Field(..., description="Whether the resume fits on one page")
    gaps: List[str] = Field(default_factory=list, description="Identified skill gaps")
    processing_time: float = Field(..., description="Processing time in seconds")
    created_at: datetime = Field(default_factory=datetime.now, description="Timestamp")

class OptimizationRequest(BaseModel):
    """Request for selecting and rewriting bullets."""
    job_description: str = Field(..., description="Job description to match against")
    resume: StructuredResume = Field(..., description="Structured resume with all bullets")
    bullets_per_experience: int = Field(3, ge=1, le=10, description="Number of bullets to select per experience")
    bullets_per_education: int = Field(2, ge=1, le=5, description="Number of bullets to select per education")
    bullets_per_project: int = Field(2, ge=1, le=5, description="Number of bullets to select per project")
    bullets_per_custom: int = Field(5, ge=1, le=10, description="Number of bullets to select per custom section")
    rewrite_style: str = Field("professional", description="Style for rewriting")
    optimization_mode: str = Field("strict", description="Optimization mode: strict or creative")

class OptimizationResponse(BaseModel):
    """Response for optimization endpoint."""
    mode: str = Field("optimize", description="Mode indicator")
    optimizedResume: SelectedResume = Field(..., description="Resume with selected and rewritten bullets")
    totalLineCount: int = Field(..., description="Total estimated LaTeX lines")
    maxLines: int = Field(50, description="Maximum lines for one page")
    fitsOnePage: bool = Field(..., description="Whether the resume fits on one page")
    gaps: List[str] = Field(default_factory=list, description="Identified skill gaps")
    processing_time: float = Field(..., description="Processing time in seconds")
    created_at: datetime = Field(default_factory=datetime.now, description="Timestamp")


