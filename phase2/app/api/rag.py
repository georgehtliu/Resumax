"""
RAG API endpoints for resume optimization.

This module exposes the RAG pipeline through REST API endpoints.
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from app.schemas.rag import RAGRequest, RAGResponse
from app.services.rag_service import RAGService
import json
import os
from datetime import datetime

router = APIRouter()

@router.post("/optimize", response_model=RAGResponse)
async def optimize_resume(request: RAGRequest, background_tasks: BackgroundTasks):
    """
    Main RAG endpoint: Optimize resume points for a job description.
    
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
            "service": "RAG Pipeline",
            "version": "2.0.0",
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


