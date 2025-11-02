"""
RAG Service - Main pipeline for Retrieval-Augmented Generation.

This service orchestrates the complete RAG workflow:
1. Retrieve: Use vector search to find relevant resume points
2. Augment: Combine retrieved points with job description context
3. Generate: Use unified optimizer to rank, rewrite, and analyze in one call
"""

from typing import List, Dict, Tuple
from app.core.search import VectorSearch
from app.services.unified_optimizer import UnifiedOptimizer
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
        self.unified_optimizer = UnifiedOptimizer()
    
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
        search_type = "hybrid" if request.use_hybrid else "semantic"
        print(f"🔍 Retrieving top {request.top_k} relevant resume points ({search_type} search)...")
        retrieved_data = await self._retrieve_points(request.job_description, request.top_k, request.use_hybrid)
        
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
        
        # Step 2: Unified optimization (single LLM call for ranking + rewriting + gap analysis)
        print(f"🤖 Optimizing with unified optimizer (mode: {request.optimization_mode})...")
        
        try:
            optimization_result = await self.unified_optimizer.optimize_resume(
                bullets=retrieved_points,
                job_description=request.job_description,
                mode=request.optimization_mode,
                similarity_scores=similarity_scores
            )
        except Exception as e:
            print(f"⚠️ Unified optimization failed: {e}")
            return RAGResponse(
                job_description=request.job_description,
                retrieved_points=retrieved_points,
                rewritten_points=[],
                gaps=[],
                new_bullet_suggestions=[],
                processing_time=time.time() - start_time,
                created_at=datetime.now()
            )
        
        if not optimization_result or "rankings" not in optimization_result:
            print("⚠️ Invalid optimization result")
            return RAGResponse(
                job_description=request.job_description,
                retrieved_points=retrieved_points,
                rewritten_points=[],
                gaps=[],
                new_bullet_suggestions=[],
                processing_time=time.time() - start_time,
                created_at=datetime.now()
            )
        
        print(f"✅ Successfully optimized {len(optimization_result['rankings'])} points")
        
        # Step 3: Convert unified optimization result to RAGResponse format
        processing_time = time.time() - start_time
        
        # Map optimization rankings to RewrittenPoint objects
        # Use similarity scores from vector search, not relevance scores from LLM
        rewritten_points = []
        for ranking in optimization_result["rankings"]:
            original_text = ranking["original"]
            # Use similarity score from vector search (more reliable for retrieval)
            # LLM relevance_score is for ranking, but similarity_score is for search quality
            similarity_score = similarity_scores.get(original_text, ranking.get("relevance_score", 0.0))
            
            rewritten_points.append(RewrittenPoint(
                original=original_text,
                rewritten=ranking["rewritten"],
                similarity_score=round(similarity_score, 3),
                reasoning=ranking.get("improvement_reasoning", "")
            ))
        
        # Extract gaps and new bullet suggestions
        gaps = optimization_result.get("gaps", [])
        new_bullet_suggestions = optimization_result.get("new_bullets", [])
        
        # Only include new bullets if in creative mode
        if request.optimization_mode != "creative":
            new_bullet_suggestions = []
        
        print(f"🎉 Unified optimization completed in {processing_time:.2f} seconds")
        print(f"   - Identified {len(gaps)} gaps")
        print(f"   - Suggested {len(new_bullet_suggestions)} new bullets")
        
        return RAGResponse(
            job_description=request.job_description,
            retrieved_points=retrieved_points,
            rewritten_points=rewritten_points,
            gaps=gaps,
            new_bullet_suggestions=new_bullet_suggestions,
            processing_time=processing_time,
            created_at=datetime.now()
        )
    
    async def _retrieve_points(self, job_description: str, top_k: int, use_hybrid: bool = True) -> List[Tuple[str, float]]:
        """
        Retrieve relevant resume points using vector search (semantic or hybrid).
        
        This implements the "Retrieve" step of RAG.
        
        Args:
            job_description: Job description to match against
            top_k: Number of points to retrieve
            use_hybrid: If True, use hybrid search (semantic + keyword), else semantic only
            
        Returns:
            List of tuples (resume_point_text, similarity_score)
        """
        try:
            results = self.vector_search.search_similar(job_description, top_k, use_hybrid=use_hybrid)
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
                "optimizer_model": self.unified_optimizer.model,
                "pipeline_version": "3.0.0",
                "optimization_type": "unified"
            }
        except Exception as e:
            return {"error": f"Failed to get RAG stats: {e}"}


