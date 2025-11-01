"""
Test script for Phase 3 Unified Optimizer.

This script tests the unified optimization system to ensure it works correctly.
"""

import asyncio
import os
from app.services.unified_optimizer import UnifiedOptimizer
from app.services.rag_service import RAGService
from app.schemas.rag import RAGRequest

async def test_unified_optimizer():
    """Test the unified optimizer directly."""
    print("🧪 Testing Unified Optimizer...")
    print("=" * 60)
    
    # Check for API key
    if not os.getenv("OPENAI_API_KEY"):
        print("❌ OPENAI_API_KEY not found in environment")
        print("   Please set it in .env file or export it")
        return
    
    optimizer = UnifiedOptimizer(model="gpt-4o-mini")
    
    # Test data
    bullets = [
        "Led development of microservices architecture using Python and Docker",
        "Implemented automated testing pipeline with CI/CD",
        "Built REST APIs for client applications",
        "Managed team of 3 junior developers"
    ]
    
    job_desc = "Senior Software Engineer with experience in microservices, Python, REST APIs, and team leadership. Must have CI/CD experience."
    
    print("\n📝 Test Input:")
    print(f"   Job Description: {job_desc[:80]}...")
    print(f"   Bullets: {len(bullets)} resume points")
    
    try:
        # Test strict mode
        print("\n🔍 Testing STRICT mode...")
        result = await optimizer.optimize_resume(
            bullets=bullets,
            job_description=job_desc,
            mode="strict",
            similarity_scores=None
        )
        
        print(f"✅ Optimization completed!")
        print(f"   - Rankings: {len(result.get('rankings', []))}")
        print(f"   - Gaps identified: {len(result.get('gaps', []))}")
        print(f"   - New bullets: {len(result.get('new_bullets', []))}")
        
        if result.get('rankings'):
            print("\n📊 Sample Ranking:")
            sample = result['rankings'][0]
            print(f"   Original: {sample['original']}")
            print(f"   Rewritten: {sample['rewritten']}")
            print(f"   Relevance: {sample['relevance_score']:.2f}")
        
        if result.get('gaps'):
            print(f"\n🔍 Identified Gaps:")
            for gap in result['gaps'][:3]:
                print(f"   - {gap}")
        
        # Test creative mode
        print("\n" + "=" * 60)
        print("🔍 Testing CREATIVE mode...")
        result_creative = await optimizer.optimize_resume(
            bullets=bullets,
            job_description=job_desc,
            mode="creative",
            similarity_scores=None
        )
        
        print(f"✅ Optimization completed!")
        print(f"   - Rankings: {len(result_creative.get('rankings', []))}")
        print(f"   - Gaps identified: {len(result_creative.get('gaps', []))}")
        print(f"   - New bullets: {len(result_creative.get('new_bullets', []))}")
        
        if result_creative.get('new_bullets'):
            print(f"\n✨ New Bullet Suggestions:")
            for bullet in result_creative['new_bullets'][:3]:
                print(f"   - {bullet}")
        
        print("\n✅ Unified Optimizer test completed successfully!")
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()

async def test_rag_service():
    """Test the complete RAG service with unified optimizer."""
    print("\n" + "=" * 60)
    print("🧪 Testing Complete RAG Service...")
    print("=" * 60)
    
    # Check for API key
    if not os.getenv("OPENAI_API_KEY"):
        print("❌ OPENAI_API_KEY not found in environment")
        return
    
    # Check if resume points file exists
    if not os.path.exists("data/resume_points.txt"):
        print("⚠️ data/resume_points.txt not found - creating sample file")
        os.makedirs("data", exist_ok=True)
        with open("data/resume_points.txt", "w") as f:
            f.write("Led development of microservices architecture using Python and Docker\n")
            f.write("Implemented automated testing pipeline with CI/CD\n")
            f.write("Built REST APIs for client applications\n")
            f.write("Managed team of 3 junior developers\n")
    
    rag_service = RAGService()
    
    # Initialize vector store
    from app.core.search import VectorSearch
    vector_search = VectorSearch()
    
    # Load resume points
    with open("data/resume_points.txt", "r") as f:
        resume_points = [line.strip() for line in f if line.strip()]
    
    vector_search.add_resume_points(resume_points)
    print(f"✅ Loaded {len(resume_points)} resume points")
    
    # Create request
    request = RAGRequest(
        job_description="Senior Software Engineer with experience in microservices, Python, REST APIs, and team leadership.",
        top_k=3,
        rewrite_style="professional",
        optimization_mode="strict"
    )
    
    print(f"\n📝 Processing request...")
    print(f"   Mode: {request.optimization_mode}")
    print(f"   Top K: {request.top_k}")
    
    try:
        result = await rag_service.process_rag_request(request)
        
        print(f"\n✅ RAG pipeline completed!")
        print(f"   - Processing time: {result.processing_time:.2f}s")
        print(f"   - Retrieved points: {len(result.retrieved_points)}")
        print(f"   - Optimized points: {len(result.rewritten_points)}")
        print(f"   - Gaps identified: {len(result.gaps)}")
        print(f"   - New bullets: {len(result.new_bullet_suggestions)}")
        
        if result.rewritten_points:
            print(f"\n📊 Sample Optimization:")
            sample = result.rewritten_points[0]
            print(f"   Original: {sample.original}")
            print(f"   Rewritten: {sample.rewritten}")
            print(f"   Similarity: {sample.similarity_score:.3f}")
            if sample.reasoning:
                print(f"   Reasoning: {sample.reasoning}")
        
        if result.gaps:
            print(f"\n🔍 Identified Gaps:")
            for gap in result.gaps[:5]:
                print(f"   - {gap}")
        
        print("\n✅ RAG Service test completed successfully!")
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()

async def main():
    """Run all tests."""
    print("🚀 Phase 3 Unified Optimizer Test Suite")
    print("=" * 60)
    
    # Test unified optimizer directly
    await test_unified_optimizer()
    
    # Test complete RAG service
    await test_rag_service()
    
    print("\n" + "=" * 60)
    print("🎉 All tests completed!")
    print("=" * 60)

if __name__ == "__main__":
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv()
    
    asyncio.run(main())

