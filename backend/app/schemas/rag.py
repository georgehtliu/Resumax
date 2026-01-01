"""
RAG (Retrieval-Augmented Generation) schemas for request/response validation.

These schemas define the data structures for the RAG pipeline:
- RAGRequest: Input from user (job description, parameters)
- RAGResponse: Output with retrieved and rewritten points
- RewrittenPoint: Individual before/after comparison
- StructuredResume: Resume with sections (experiences, education, projects, custom sections)
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Literal
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
    location: Optional[str] = Field(None, description="Job location")
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
    location: Optional[str] = None
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

class LatexRenderRequest(BaseModel):
    """Request to render a resume into LaTeX/PDF."""
    resume: SelectedResume = Field(..., description="Structured resume to render")


class LatexRenderResponse(BaseModel):
    """Response containing the rendered PDF in base64."""
    pdf_base64: str = Field(..., description="Base64-encoded PDF bytes")
    html_content: Optional[str] = Field(None, description="HTML content from pdf2htmlEX")
    rendered_at: datetime = Field(default_factory=datetime.now, description="Timestamp for rendering")


class KeywordMatch(BaseModel):
    """Represents a keyword found in the resume."""
    keyword: str = Field(..., description="The keyword that was found")
    found_in: List[str] = Field(default_factory=list, description="Locations where keyword was found")
    match_count: int = Field(..., description="Number of times keyword appears")
    is_required: bool = Field(False, description="Whether keyword is required based on JD")

class MissingKeyword(BaseModel):
    """Represents a keyword missing from the resume."""
    keyword: str = Field(..., description="The missing keyword")
    is_required: bool = Field(False, description="Whether keyword is required based on JD")
    category: str = Field("other", description="Category of keyword (programming_language, framework, etc.)")

class KeywordScanStatistics(BaseModel):
    """Statistics about keyword matching."""
    total_keywords: int = Field(..., description="Total keywords extracted from JD")
    found_count: int = Field(..., description="Number of keywords found in resume")
    missing_count: int = Field(..., description="Number of keywords missing from resume")
    match_percentage: float = Field(..., description="Percentage of keywords found")

class KeywordScanRequest(BaseModel):
    """Request for keyword scanning."""
    resume: StructuredResume = Field(..., description="Structured resume to scan")
    job_description: str = Field(..., description="Job description to extract keywords from")

class KeywordScanResponse(BaseModel):
    """Response for keyword scanning."""
    found_keywords: List[KeywordMatch] = Field(default_factory=list, description="Keywords found in resume")
    missing_keywords: List[MissingKeyword] = Field(default_factory=list, description="Keywords missing from resume")
    statistics: KeywordScanStatistics = Field(..., description="Match statistics")


# ============================================================================
# RESUME ROASTING SCHEMAS
# ============================================================================

class IssueFeedback(BaseModel):
    """Individual issue or feedback for a bullet point."""
    type: Literal["good", "bad", "improvement", "suggestion", "format", "grammar"] = Field(..., description="Type of feedback")
    category: Literal["content", "format", "grammar"] = Field(..., description="Category of the issue")
    message: str = Field(..., description="Specific feedback message")
    severity: Optional[Literal["critical", "major", "minor"]] = Field(None, description="Severity level for format/grammar issues")

class BulletFeedback(BaseModel):
    """Feedback for a single bullet point."""
    id: str = Field(..., description="Bullet ID")
    text: str = Field(..., description="Original bullet text")
    section: Literal["experience", "project", "education", "custom"] = Field(..., description="Section type")
    sectionTitle: str = Field(..., description="Section title (e.g., company name, project name)")
    issues: List[IssueFeedback] = Field(default_factory=list, description="List of issues/feedback for this bullet")

class GeneralIssue(BaseModel):
    """General issue pattern found across multiple bullets."""
    type: Literal["warning", "info", "error"] = Field(..., description="Issue type")
    category: Literal["content", "format", "grammar"] = Field(..., description="Issue category")
    message: str = Field(..., description="Description of the pattern or issue")
    suggestion: Optional[str] = Field(None, description="Recommendation to fix")
    examples: Optional[List[str]] = Field(None, description="Examples showing the inconsistency or pattern")

class FormatIssue(BaseModel):
    """Format inconsistency found across bullets."""
    issue: str = Field(..., description="Description of the format issue (e.g., 'Date format inconsistency')")
    details: str = Field(..., description="Details about the inconsistency")
    recommendation: str = Field(..., description="Recommended consistent format")
    affectedBullets: List[str] = Field(default_factory=list, description="List of bullet IDs affected by this issue")

class RoastRequest(BaseModel):
    """Request for resume roasting/feedback."""
    resume: StructuredResume = Field(..., description="Structured resume to analyze")

class RoastResponse(BaseModel):
    """Response containing comprehensive resume feedback."""
    tldr: str = Field(..., description="2-3 sentence summary of overall resume quality")
    overallScore: float = Field(..., ge=0, le=10, description="Overall resume score (0-10)")
    totalBullets: int = Field(..., description="Total number of bullets analyzed")
    issuesFound: int = Field(..., description="Total number of issues found")
    strengths: int = Field(..., description="Number of strong, well-written bullets")
    feedback: List[BulletFeedback] = Field(default_factory=list, description="Feedback for each bullet")
    generalIssues: List[GeneralIssue] = Field(default_factory=list, description="General issues/patterns across the resume")
    formatIssues: List[FormatIssue] = Field(default_factory=list, description="Format inconsistencies found")
    processing_time: float = Field(..., description="Processing time in seconds")
    created_at: datetime = Field(default_factory=datetime.now, description="Timestamp")


# ============================================================================
# INTERVIEW QUESTION PREP SCHEMAS
# ============================================================================

class STARFramework(BaseModel):
    """STAR method framework for answering interview questions."""
    situation: str = Field(..., description="Guidance on describing the situation/context")
    task: str = Field(..., description="Guidance on describing the task/goal")
    action: str = Field(..., description="Guidance on describing your actions")
    result: str = Field(..., description="Guidance on describing results/outcomes")

class InterviewQuestion(BaseModel):
    """A single interview question with guidance."""
    question: str = Field(..., description="The interview question")
    whyAsked: str = Field(..., description="Why this question is likely to be asked")
    starFramework: STARFramework = Field(..., description="STAR method framework for answering")
    keyPoints: List[str] = Field(default_factory=list, description="Key points to mention based on resume")

class InterviewQuestionRequest(BaseModel):
    """Request for generating interview questions."""
    item: Dict = Field(..., description="Experience or Project dictionary with bullets")
    itemType: Literal["experience", "project"] = Field(..., description="Type of item")

class InterviewQuestionResponse(BaseModel):
    """Response containing generated interview questions."""
    itemTitle: str = Field(..., description="Title of the experience or project")
    itemType: Literal["experience", "project"] = Field(..., description="Type of item")
    questions: List[InterviewQuestion] = Field(default_factory=list, description="Generated interview questions")
    processing_time: float = Field(..., description="Processing time in seconds")
    created_at: datetime = Field(default_factory=datetime.now, description="Timestamp")


# ============================================================================
# RESUME PARSING SCHEMAS
# ============================================================================

class ParseResumeResponse(BaseModel):
    """Response for resume parsing endpoint."""
    success: bool = Field(..., description="Whether parsing was successful")
    resume: Optional[StructuredResume] = Field(None, description="Parsed structured resume (if successful)")
    raw_text: Optional[str] = Field(None, description="Extracted raw text from resume file")
    warnings: List[str] = Field(default_factory=list, description="Warnings during parsing")
    errors: List[str] = Field(default_factory=list, description="Errors encountered during parsing")
    extraction_quality: Literal["complete", "partial", "minimal", "failed"] = Field(..., description="Quality of extraction")
    extracted_sections: Dict[str, bool] = Field(default_factory=dict, description="Which sections were successfully extracted")
    processing_time: float = Field(..., description="Processing time in seconds")
    created_at: datetime = Field(default_factory=datetime.now, description="Timestamp")
