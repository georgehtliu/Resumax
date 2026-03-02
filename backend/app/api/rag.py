"""
RAG API endpoints for resume optimization.

This module exposes the RAG pipeline through REST API endpoints.
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks, UploadFile, File, Form
from app.schemas.rag import (
    RAGRequest, RAGResponse, SelectionRequest, SelectionResponse,
    OptimizationRequest, OptimizationResponse,
    LatexRenderRequest, LatexRenderResponse,
    KeywordScanRequest, KeywordScanResponse,
    RoastRequest, RoastResponse,
    InterviewQuestionRequest, InterviewQuestionResponse,
    ParseResumeResponse
)
from app.services.rag_service import RAGService
from app.services.selection_service import SelectionService, calculate_total_lines, identify_gaps
from app.services.optimization_service import OptimizationService
from app.services.keyword_scanner import KeywordScanner
from app.services.roast_service import RoastService
from app.services.interview_question_service import InterviewQuestionService
from app.services.resume_parser_service import ResumeParserService
from app.utils.latex import build_resume_latex, render_pdf_from_latex, pdf_bytes_to_base64, render_html_from_pdf
from starlette.responses import StreamingResponse
import json
import os
import time
from datetime import datetime

router = APIRouter()

@router.post("/optimize/flat", response_model=RAGResponse)
async def optimize_resume_flat(request: RAGRequest, background_tasks: BackgroundTasks):
    """
    Legacy RAG endpoint: Optimize flat list of resume points for a job description.
    
    This is the old endpoint that works with flat bullet lists.
    Use /select or /optimize for structured resume format.
    
    This endpoint implements the complete RAG pipeline:
    1. Retrieve relevant resume points using vector search
    2. Augment with job description context
    3. Generate optimized versions using LLM
    
    Args:
        request: RAG request with job description and parameters
        background_tasks: For saving results in background
        
    Returns:
        RAG response with retrieved and rewritten points
    """
    try:
        # TODO: Implement the main RAG endpoint
        # HINT: Use RAGService.process_rag_request()
        # HINT: Handle errors gracefully
        # HINT: Add background task for saving results
        
        print(f"🚀 Processing RAG request for job: {request.job_description[:50]}...")
        
        # Initialize RAG service
        rag_service = RAGService()
        
        # Process the RAG request
        result = await rag_service.process_rag_request(request)
        
        # TODO: Add background task to save results
        # HINT: Use background_tasks.add_task()
        # HINT: Call _save_results function
        background_tasks.add_task(_save_results, result)
        
        print(f"✅ RAG request completed successfully")
        return result
        
    except Exception as e:
        print(f"❌ Error in RAG endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"RAG processing failed: {str(e)}")

@router.get("/health")
async def health_check():
    """
    Health check endpoint for the RAG service.
    
    Returns:
        Service status and version information
    """
    # TODO: Implement health check
    # HINT: Return service status
    # HINT: Include version information
    # HINT: Check if services are available
    
    try:
        rag_service = RAGService()
        stats = await rag_service.get_rag_stats()
        
        return {
            "status": "healthy",
            "service": "RAG Pipeline (Unified Optimizer)",
            "version": "3.0.0",
            "timestamp": datetime.now().isoformat(),
            "stats": stats
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "service": "RAG Pipeline",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

@router.get("/stats")
async def get_stats():
    """
    Get RAG pipeline statistics.
    
    Returns:
        Detailed statistics about the RAG system
    """
    # TODO: Implement stats endpoint
    # HINT: Use RAGService.get_rag_stats()
    # HINT: Include vector store and LLM information
    
    try:
        rag_service = RAGService()
        stats = await rag_service.get_rag_stats()
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")

async def _save_results(result: RAGResponse):
    """
    Save RAG results to JSON file for analysis.
    
    This runs in the background to avoid blocking the API response.
    
    Args:
        result: RAG response to save
    """
    # TODO: Implement result saving
    # HINT: Create filename with timestamp
    # HINT: Save to data/results/ directory
    # HINT: Use result.dict() to convert to dictionary
    # HINT: Handle file writing errors
    
    try:
        # Create results directory if it doesn't exist
        os.makedirs("data/results", exist_ok=True)
        
        # Create filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"data/results/rag_result_{timestamp}.json"
        
        # Convert result to dictionary and save
        result_dict = result.dict()
        result_dict["saved_at"] = datetime.now().isoformat()
        
        with open(filename, "w") as f:
            json.dump(result_dict, f, indent=2, default=str)
        
        print(f"💾 Results saved to {filename}")
        
    except Exception as e:
        print(f"❌ Error saving results: {e}")

@router.get("/results")
async def list_results():
    """
    List all saved RAG results.
    
    Returns:
        List of available result files
    """
    # TODO: Implement results listing
    # HINT: List files in data/results/ directory
    # HINT: Return file names and timestamps
    # HINT: Handle directory not found errors
    
    try:
        results_dir = "data/results"
        if not os.path.exists(results_dir):
            return {"results": [], "message": "No results directory found"}
        
        files = os.listdir(results_dir)
        json_files = [f for f in files if f.endswith('.json')]
        
        # Get file stats
        file_info = []
        for filename in json_files:
            filepath = os.path.join(results_dir, filename)
            stat = os.stat(filepath)
            file_info.append({
                "filename": filename,
                "size": stat.st_size,
                "modified": datetime.fromtimestamp(stat.st_mtime).isoformat()
            })
        
        return {
            "results": sorted(file_info, key=lambda x: x["modified"], reverse=True),
            "count": len(file_info)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list results: {str(e)}")

# ============================================================================
# NEW STRUCTURED ENDPOINTS (/select and /optimize)
# ============================================================================

@router.post("/select", response_model=SelectionResponse)
async def select_bullets(request: SelectionRequest):
    """
    Select top bullets per experience without rewriting.
    
    Fast endpoint - just vector search ranking, no LLM calls.
    
    Args:
        request: Selection request with structured resume and parameters
        
    Returns:
        Selection response with selected bullets (original text preserved)
    """
    start_time = time.time()
    
    try:
        print(f"📋 Selecting bullets for job: {request.job_description[:50]}...")
        
        selection_service = SelectionService()
        
        # Select bullets per section
        selected_resume = await selection_service.select_bullets(
            resume=request.resume,
            job_description=request.job_description,
            bullets_per_experience=request.bullets_per_experience,
            bullets_per_education=request.bullets_per_education,
            bullets_per_project=request.bullets_per_project,
            bullets_per_custom=request.bullets_per_custom
        )
        
        # Calculate total lines
        total_lines = calculate_total_lines(selected_resume)
        max_lines = 42
        fits_one_page = total_lines <= max_lines

        # Identify gaps
        gaps = identify_gaps(selected_resume, request.job_description)

        processing_time = time.time() - start_time

        print(f"✅ Selection completed in {processing_time:.2f} seconds")
        print(f"   - Selected {total_lines} lines (fits one page: {fits_one_page})")
        print(f"   - Identified {len(gaps)} gaps")
        
        return SelectionResponse(
            mode="select",
            selectedResume=selected_resume,
            totalLineCount=total_lines,
            maxLines=max_lines,
            fitsOnePage=fits_one_page,
            gaps=gaps,
            processing_time=processing_time,
            created_at=datetime.now()
        )
        
    except Exception as e:
        print(f"❌ Error in selection endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Selection failed: {str(e)}")

@router.post("/optimize", response_model=OptimizationResponse)
async def optimize_resume_structured(request: OptimizationRequest, background_tasks: BackgroundTasks):
    """
    Select top bullets AND rewrite them with LLM.
    
    Slower endpoint - includes LLM rewriting.
    
    Args:
        request: Optimization request with structured resume and parameters
        background_tasks: For saving results in background
        
    Returns:
        Optimization response with selected and rewritten bullets
    """
    start_time = time.time()
    
    try:
        print(f"✨ Optimizing resume for job: {request.job_description[:50]}...")
        
        optimization_service = OptimizationService()
        
        # Select and rewrite bullets
        optimized_resume = await optimization_service.optimize_resume(
            resume=request.resume,
            job_description=request.job_description,
            bullets_per_experience=request.bullets_per_experience,
            bullets_per_education=request.bullets_per_education,
            bullets_per_project=request.bullets_per_project,
            bullets_per_custom=request.bullets_per_custom,
            rewrite_style=request.rewrite_style,
            optimization_mode=request.optimization_mode
        )
        
        # Calculate total lines
        total_lines = calculate_total_lines(optimized_resume)
        max_lines = 42
        fits_one_page = total_lines <= max_lines
        
        # Identify gaps
        gaps = identify_gaps(optimized_resume, request.job_description)
        
        processing_time = time.time() - start_time
        
        print(f"✅ Optimization completed in {processing_time:.2f} seconds")
        print(f"   - Optimized {total_lines} lines (fits one page: {fits_one_page})")
        print(f"   - Identified {len(gaps)} gaps")
        
        # Save results in background
        # Use model_dump() for Pydantic v2, fallback to dict() for v1
        try:
            resume_dict = optimized_resume.model_dump()
        except AttributeError:
            resume_dict = optimized_resume.dict()
        
        result_dict = {
            "mode": "optimize",
            "job_description": request.job_description,
            "optimized_resume": resume_dict,
            "total_line_count": total_lines,
            "fits_one_page": fits_one_page,
            "gaps": gaps,
            "processing_time": processing_time
        }
        background_tasks.add_task(_save_results, result_dict)
        
        return OptimizationResponse(
            mode="optimize",
            optimizedResume=optimized_resume,
            totalLineCount=total_lines,
            maxLines=max_lines,
            fitsOnePage=fits_one_page,
            gaps=gaps,
            processing_time=processing_time,
            created_at=datetime.now()
        )
        
    except Exception as e:
        print(f"❌ Error in optimization endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Optimization failed: {str(e)}")

async def _save_results(result_dict: dict):
    """
    Save optimization results to JSON file.
    
    Args:
        result_dict: Result dictionary to save
    """
    try:
        os.makedirs("data/results", exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"data/results/optimization_result_{timestamp}.json"
        
        result_dict["saved_at"] = datetime.now().isoformat()
        
        with open(filename, "w") as f:
            json.dump(result_dict, f, indent=2, default=str)
        
        print(f"💾 Results saved to {filename}")
    except Exception as e:
        print(f"❌ Error saving results: {e}")

@router.post("/latex/render", response_model=LatexRenderResponse)
async def render_latex_resume(request: LatexRenderRequest):
    """Compile the provided structured resume into a PDF using tectonic."""
    try:
        latex_source = build_resume_latex(request.resume)
        pdf_bytes = render_pdf_from_latex(latex_source)
        pdf_base64 = pdf_bytes_to_base64(pdf_bytes)
        return LatexRenderResponse(pdf_base64=pdf_base64)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to render LaTeX: {exc}")


@router.post("/latex/render-html")
async def render_latex_resume_html(request: LatexRenderRequest):
    """
    Compile resume to PDF and convert to HTML using pdf2htmlEX for high-fidelity rendering.
    
    Uses Docker if PDF2HTMLEX_USE_DOCKER environment variable is set to "true",
    otherwise tries to use local pdf2htmlEX installation.
    """
    try:
        latex_source = build_resume_latex(request.resume)
        pdf_bytes = render_pdf_from_latex(latex_source)
        html_content = render_html_from_pdf(pdf_bytes)
        
        return {
            "html_content": html_content,
            "rendered_at": datetime.now().isoformat()
        }
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to render HTML: {exc}")

@router.post("/parse-resume", response_model=ParseResumeResponse)
async def parse_resume(file: UploadFile = File(...)):
    """
    Parse a resume file (PDF, DOCX, or TXT) and extract structured data.
    
    This endpoint accepts a file upload and uses LLM to extract structured
    resume information matching the StructuredResume schema.
    
    Args:
        file: Uploaded resume file (PDF, DOCX, or TXT)
        
    Returns:
        ParseResumeResponse with parsed resume data or error information
    """
    try:
        # Validate file type
        allowed_types = [
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/msword",
            "text/plain"
        ]
        
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type: {file.content_type}. Supported types: PDF, DOCX, DOC, TXT"
            )
        
        # Read file data
        file_data = await file.read()
        
        if len(file_data) == 0:
            raise HTTPException(status_code=400, detail="File is empty")
        
        # Check file size (10MB limit)
        max_size = 10 * 1024 * 1024  # 10MB
        if len(file_data) > max_size:
            raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")
        
        # Parse resume
        parser_service = ResumeParserService()
        result = await parser_service.parse_resume(
            file_data=file_data,
            file_type=file.content_type or "application/pdf",
            filename=file.filename or "resume"
        )
        
        return ParseResumeResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error parsing resume: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to parse resume: {str(e)}"
        )

@router.post("/parse-resume-stream")
async def parse_resume_stream(file: UploadFile = File(...)):
    """
    Parse a resume file and stream SSE progress events during processing.

    Returns a text/event-stream with progress steps, then a final complete event.
    """
    # Validate and read file before opening the stream (HTTPException can't be raised mid-stream)
    allowed_types = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
        "text/plain"
    ]

    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file.content_type}. Supported types: PDF, DOCX, DOC, TXT"
        )

    file_data = await file.read()

    if len(file_data) == 0:
        raise HTTPException(status_code=400, detail="File is empty")

    max_size = 10 * 1024 * 1024  # 10MB
    if len(file_data) > max_size:
        raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")

    parser_service = ResumeParserService()

    return StreamingResponse(
        parser_service.parse_resume_stream(
            file_data=file_data,
            file_type=file.content_type or "application/pdf",
            filename=file.filename or "resume"
        ),
        media_type="text/event-stream",
        headers={
            "X-Accel-Buffering": "no",
            "Cache-Control": "no-cache",
        }
    )

@router.post("/keywords/scan", response_model=KeywordScanResponse)
async def scan_keywords(request: KeywordScanRequest):
    """
    Scan resume for keywords from job description.
    
    Extracts keywords from the job description and checks if they appear
    in the resume, providing found keywords, missing keywords, and statistics.
    
    Args:
        request: Keyword scan request with resume and job description
        
    Returns:
        Keyword scan response with found/missing keywords and statistics
    """
    try:
        print(f"🔍 Scanning resume for keywords from JD: {request.job_description[:50]}...")
        
        scanner = KeywordScanner()
        result = scanner.scan_resume(
            resume=request.resume,
            job_description=request.job_description
        )
        
        print(f"✅ Keyword scan completed")
        print(f"   - Found: {result['statistics']['found_count']}/{result['statistics']['total_keywords']} keywords")
        print(f"   - Missing: {result['statistics']['missing_count']} keywords")
        print(f"   - Match: {result['statistics']['match_percentage']:.1f}%")
        
        return KeywordScanResponse(**result)
    except Exception as e:
        print(f"❌ Keyword scan failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to scan keywords: {str(e)}")


@router.post("/coaching/roast", response_model=RoastResponse)
async def roast_resume(request: RoastRequest, background_tasks: BackgroundTasks):
    """
    Provide brutally honest feedback on resume bullets.
    
    Analyzes resume for:
    - Content quality (action verbs, metrics, specificity)
    - Format consistency (dates, capitalization, punctuation)
    - Grammar and spelling errors
    
    Args:
        request: Roast request with structured resume
        background_tasks: For saving results in background
        
    Returns:
        Comprehensive feedback with scores, issues, and suggestions
    """
    start_time = time.time()
    
    try:
        print(f"🔥 Roasting resume...")
        
        roast_service = RoastService()
        
        # Analyze resume and get feedback
        feedback_data = await roast_service.roast_resume(request.resume)
        
        processing_time = time.time() - start_time
        
        print(f"✅ Resume roast completed in {processing_time:.2f} seconds")
        print(f"   - Analyzed {feedback_data.get('totalBullets', 0)} bullets")
        print(f"   - Found {feedback_data.get('issuesFound', 0)} issues")
        print(f"   - Overall score: {feedback_data.get('overallScore', 0):.1f}/10")
        
        # Add processing time and timestamp
        feedback_data["processing_time"] = processing_time
        feedback_data["created_at"] = datetime.now()
        
        # Save results in background (optional)
        # You can add a _save_roast_results function if needed
        
        return RoastResponse(**feedback_data)
    except Exception as e:
        print(f"❌ Resume roast failed: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to roast resume: {str(e)}")


@router.post("/coaching/interview-questions", response_model=InterviewQuestionResponse)
async def generate_interview_questions(request: InterviewQuestionRequest, background_tasks: BackgroundTasks):
    """
    Generate interview questions based on a specific experience or project.
    
    Creates tailored interview questions with STAR method guidance to help
    candidates prepare for interviews.
    
    Args:
        request: Interview question request with experience/project item
        background_tasks: For saving results in background (optional)
        
    Returns:
        Interview question response with questions and STAR frameworks
    """
    start_time = time.time()
    
    try:
        print(f"❓ Generating interview questions for {request.itemType}...")
        
        question_service = InterviewQuestionService()
        
        # Generate questions
        questions_data = await question_service.generate_questions(
            item=request.item,
            item_type=request.itemType
        )
        
        processing_time = time.time() - start_time
        
        print(f"✅ Interview questions generated in {processing_time:.2f} seconds")
        print(f"   - Generated {len(questions_data.get('questions', []))} questions")
        print(f"   - Item: {questions_data.get('itemTitle', 'Unknown')}")
        
        # Add processing time and timestamp
        questions_data["processing_time"] = processing_time
        questions_data["created_at"] = datetime.now()
        
        return InterviewQuestionResponse(**questions_data)
    except Exception as e:
        print(f"❌ Interview question generation failed: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to generate interview questions: {str(e)}")


