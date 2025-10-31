"""
RAG Service - Main pipeline for Retrieval-Augmented Generation.

This service orchestrates the complete RAG workflow:
1. Retrieve: Use vector search to find relevant resume points
2. Augment: Combine retrieved points with job description context
3. Generate: Use LLM to rewrite points for better job match
"""

from typing import List, Dict, Tuple
from app.core.search import VectorSearch
from app.services.llm_service import LLMService
from app.schemas.rag import RAGRequest, RAGResponse, RewrittenPoint
import time
from datetime import datetime

class RAGService:
    """
    Main RAG pipeline service.
    
    This coordinates the retrieval, augmentation, and generation steps.
    """
    
    def __init__(self):
        """Initialize the RAG service with required components."""
        self.vector_search = VectorSearch()
        self.llm_service = LLMService()
    
    async def process_rag_request(self, request: RAGRequest) -> RAGResponse:
        """
        Complete RAG pipeline: Retrieve → Augment → Generate
        
        This is the main method that orchestrates the entire RAG process.
        
        Args:
            request: RAG request with job description and parameters
            
        Returns:
            Complete RAG response with retrieved and rewritten points
        """
        start_time = time.time()
        
        # Step 1: Retrieve relevant resume points with similarity scores
        print(f"🔍 Retrieving top {request.top_k} relevant resume points...")
        retrieved_data = await self._retrieve_points(request.job_description, request.top_k)
        
        if not retrieved_data:
            print("⚠️ No resume points retrieved - check your vector store")
            return RAGResponse(
                job_description=request.job_description,
                retrieved_points=[],
                rewritten_points=[],
                processing_time=time.time() - start_time,
                created_at=datetime.now()
            )
        
        # Extract points and create score mapping
        retrieved_points = [point for point, score in retrieved_data]
        similarity_scores = {point: score for point, score in retrieved_data}
        
        print(f"✅ Retrieved {len(retrieved_points)} resume points")
        
        # Step 2: Augment with LLM rewriting
        # TODO: Use LLM service to rewrite points
        # HINT: Call llm_service.rewrite_resume_points()
        # HINT: Pass job description, retrieved points, and style
        print(f"🤖 Rewriting points with {request.rewrite_style} style...")
        rewritten_data = await self.llm_service.rewrite_resume_points(
            request.job_description,
            retrieved_points,
            request.rewrite_style
        )
        
        if not rewritten_data:
            print("⚠️ LLM rewriting failed - check your API key and model")
            return RAGResponse(
                job_description=request.job_description,
                retrieved_points=retrieved_points,
                rewritten_points=[],
                processing_time=time.time() - start_time,
                created_at=datetime.now()
            )
        
        print(f"✅ Successfully rewritten {len(rewritten_data)} points")
        
        # Step 3: Generate final response
        # TODO: Create RAGResponse with all data
        # HINT: Include processing time and metadata
        # HINT: Convert rewritten_data to RewrittenPoint objects
        
        processing_time = time.time() - start_time
        
        # Convert to RewrittenPoint objects with actual similarity scores
        rewritten_points = []
        for i, item in enumerate(rewritten_data):
            # Match original text to get similarity score
            original_text = item["original"]
            # Use similarity score from retrieval, or 0.0 if not found (shouldn't happen)
            score = similarity_scores.get(original_text, 0.0)
            
            rewritten_points.append(RewrittenPoint(
                original=original_text,
                rewritten=item["rewritten"],
                similarity_score=round(score, 3),  # Round to 3 decimal places
                reasoning=item.get("reasoning", "")
            ))
        
        print(f"🎉 RAG pipeline completed in {processing_time:.2f} seconds")
        
        return RAGResponse(
            job_description=request.job_description,
            retrieved_points=retrieved_points,
            rewritten_points=rewritten_points,
            processing_time=processing_time,
            created_at=datetime.now()
        )
    
    async def _retrieve_points(self, job_description: str, top_k: int) -> List[Tuple[str, float]]:
        """
        Retrieve relevant resume points using Phase 1 vector search.
        
        This implements the "Retrieve" step of RAG.
        
        Args:
            job_description: Job description to match against
            top_k: Number of points to retrieve
            
        Returns:
            List of tuples (resume_point_text, similarity_score)
        """
        try:
            results = self.vector_search.search_similar(job_description, top_k)
            if not results:
                print("⚠️ No results from vector search")
                return []
            
            # Return tuples of (point, score) for mapping later
            return results
            
        except Exception as e:
            print(f"❌ Error in vector search: {e}")
            return []
    
    async def get_rag_stats(self) -> Dict:
        """
        Get statistics about the RAG pipeline.
        
        Returns:
            Dictionary with pipeline statistics
        """
        # TODO: Implement RAG statistics
        # HINT: Get vector store stats
        # HINT: Add LLM model info
        # HINT: Include processing metrics
        
        try:
            vector_stats = self.vector_search.get_collection_stats()
            return {
                "vector_store": vector_stats,
                "llm_model": self.llm_service.model,
                "pipeline_version": "2.0.0"
            }
        except Exception as e:
            return {"error": f"Failed to get RAG stats: {e}"}


