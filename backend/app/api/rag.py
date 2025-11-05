"""
RAG API endpoints for resume optimization.

This module exposes the RAG pipeline through REST API endpoints.
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from app.schemas.rag import (
    RAGRequest, RAGResponse, SelectionRequest, SelectionResponse,
    OptimizationRequest, OptimizationResponse
)
from app.services.rag_service import RAGService
from app.services.selection_service import SelectionService, calculate_total_lines, identify_gaps
from app.services.optimization_service import OptimizationService
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
        max_lines = 50
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
        max_lines = 50
        fits_one_page = total_lines <= max_lines
        
        # Identify gaps
        gaps = identify_gaps(optimized_resume, request.job_description)
        
        processing_time = time.time() - start_time
        
        print(f"✅ Optimization completed in {processing_time:.2f} seconds")
        print(f"   - Optimized {total_lines} lines (fits one page: {fits_one_page})")
        print(f"   - Identified {len(gaps)} gaps")
        
        # Save results in background
        result_dict = {
            "mode": "optimize",
            "job_description": request.job_description,
            "optimized_resume": optimized_resume.dict(),
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


