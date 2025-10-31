"""
FastAPI application for AI Resume Optimizer - Phase 2 RAG Pipeline.

This is the main entry point for the RAG API service.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import rag
import os

# Create FastAPI application
app = FastAPI(
    title="AI Resume Optimizer - RAG Pipeline",
    description="Retrieval-Augmented Generation for resume optimization",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# TODO: Add CORS middleware
# HINT: Allow all origins for development
# HINT: Configure proper headers and methods
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# TODO: Include routers
# HINT: Add rag router with prefix
app.include_router(rag.router, prefix="/api/v1", tags=["RAG"])

@app.get("/")
async def root():
    """
    Root endpoint with basic information.
    
    Returns:
        Welcome message and API information
    """
    return {
        "message": "AI Resume Optimizer - RAG Pipeline",
        "version": "2.0.0",
        "description": "Retrieval-Augmented Generation for resume optimization",
        "docs": "/docs",
        "health": "/api/v1/health"
    }

@app.on_event("startup")
async def startup_event():
    """
    Startup event handler.
    
    This runs when the application starts up.
    """
    # TODO: Add startup tasks
    # HINT: Initialize vector store
    # HINT: Load resume points from Phase 1
    # HINT: Print startup information
    
    print("🚀 Starting AI Resume Optimizer - RAG Pipeline")
    print("📊 Initializing vector store...")
    
    try:
        # Initialize vector store with Phase 1 data
        from app.core.search import VectorSearch
        from app.core.embeddings import EmbeddingGenerator
        
        # Load resume points from Phase 1
        resume_file = "data/resume_points.txt"
        if os.path.exists(resume_file):
            with open(resume_file, "r") as f:
                resume_points = [line.strip() for line in f if line.strip()]
            
            # Add to vector store
            vector_search = VectorSearch()
            vector_search.add_resume_points(resume_points)
            print(f"✅ Loaded {len(resume_points)} resume points into vector store")
        else:
            print("⚠️ No resume points file found - vector store will be empty")
        
        print("🎉 RAG Pipeline ready!")
        
    except Exception as e:
        print(f"❌ Error during startup: {e}")
        print("⚠️ Continuing without vector store initialization")

@app.on_event("shutdown")
async def shutdown_event():
    """
    Shutdown event handler.
    
    This runs when the application shuts down.
    """
    # TODO: Add shutdown tasks
    # HINT: Clean up resources
    # HINT: Save any pending data
    
    print("🛑 Shutting down RAG Pipeline")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)


