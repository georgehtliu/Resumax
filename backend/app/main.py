"""
FastAPI application for AI Resume Optimizer - Phase 3 Unified Optimizer.

This is the main entry point for the unified optimization API service.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import rag, websocket
import os

# Create FastAPI application
app = FastAPI(
    title="AI Resume Optimizer - Unified Optimization",
    description="Single-agent unified optimization system for resume optimization",
    version="3.0.0",
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

# Include routers
app.include_router(rag.router, prefix="/api/v1", tags=["RAG"])
app.include_router(websocket.router, tags=["WebSocket"])

@app.get("/")
async def root():
    """
    Root endpoint with basic information.
    
    Returns:
        Welcome message and API information
    """
    return {
        "message": "AI Resume Optimizer - Unified Optimization",
        "version": "3.0.0",
        "description": "Single-agent unified optimization system",
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
    
    print("🚀 Starting AI Resume Optimizer - Phase 3 Unified Optimizer")
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
        
        print("🎉 Unified Optimizer ready!")
        
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
    
    print("🛑 Shutting down Unified Optimizer")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)


