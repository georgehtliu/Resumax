#!/usr/bin/env python3
"""
Integration test for hybrid search with actual data.

This test loads resume points and tests hybrid search functionality.
Can be run without mocking (requires OPENAI_API_KEY).
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.search import VectorSearch

# Load environment variables
load_dotenv()


def test_keyword_extraction_integration():
    """Test keyword extraction with real job descriptions."""
    print("\n🧪 Testing Keyword Extraction")
    print("=" * 50)
    
    search = VectorSearch()
    
    test_job_descriptions = [
        "We are looking for a Senior Software Engineer with Python, FastAPI, and AWS experience.",
        "React developer needed with TypeScript, Docker, and Kubernetes knowledge.",
        "Full-stack engineer: Node.js, PostgreSQL, Redis, and microservices architecture.",
        "ML Engineer: Python, PyTorch, TensorFlow, and cloud experience (AWS/GCP).",
        "DevOps Engineer: Terraform, Jenkins, Docker, Kubernetes, and CI/CD pipelines."
    ]
    
    for i, jd in enumerate(test_job_descriptions, 1):
        print(f"\n📝 Test {i}: {jd[:60]}...")
        keywords = search.extract_keywords(jd)
        print(f"   ✅ Extracted {len(keywords)} keywords")
        print(f"   📋 Keywords: {', '.join(keywords[:10])}")
        
        assert len(keywords) > 0, f"Should extract at least one keyword from: {jd}"
        print(f"   ✅ Passed")


def test_keyword_scoring_integration():
    """Test keyword scoring with realistic resume bullets."""
    print("\n🧪 Testing Keyword Scoring")
    print("=" * 50)
    
    search = VectorSearch()
    
    test_cases = [
        {
            "keywords": ["python", "fastapi", "aws"],
            "bullet": "Developed Python microservices using FastAPI on AWS",
            "expected_min": 0.8  # Should have high score
        },
        {
            "keywords": ["react", "typescript", "docker"],
            "bullet": "Built React frontend with TypeScript",
            "expected_min": 0.5  # 2 out of 3 keywords
        },
        {
            "keywords": ["python", "docker"],
            "bullet": "Managed team and improved processes",
            "expected_max": 0.2  # No keywords match
        }
    ]
    
    for i, case in enumerate(test_cases, 1):
        print(f"\n📝 Test Case {i}:")
        print(f"   Keywords: {case['keywords']}")
        print(f"   Bullet: {case['bullet']}")
        
        score = search.compute_keyword_score(case['bullet'], case['keywords'])
        print(f"   Score: {score:.3f}")
        
        if 'expected_min' in case:
            assert score >= case['expected_min'], f"Score {score} below expected minimum {case['expected_min']}"
        if 'expected_max' in case:
            assert score <= case['expected_max'], f"Score {score} above expected maximum {case['expected_max']}"
        
        print(f"   ✅ Passed")


def test_hybrid_vs_semantic_comparison():
    """Compare hybrid search vs semantic-only search (requires API key)."""
    print("\n🧪 Testing Hybrid vs Semantic Search")
    print("=" * 50)
    
    if not os.getenv("OPENAI_API_KEY"):
        print("⚠️  Skipping: OPENAI_API_KEY not set")
        print("   Set OPENAI_API_KEY to run this test")
        return
    
    # Load sample resume points
    resume_points_file = Path(__file__).parent.parent / "data" / "resume_points.txt"
    
    if not resume_points_file.exists():
        print(f"⚠️  Skipping: {resume_points_file} not found")
        print("   Create resume_points.txt with sample bullets to run this test")
        return
    
    # Read resume points
    with open(resume_points_file, 'r') as f:
        resume_points = [line.strip() for line in f if line.strip()]
    
    if len(resume_points) < 5:
        print(f"⚠️  Skipping: Need at least 5 resume points (found {len(resume_points)})")
        return
    
    print(f"📊 Loaded {len(resume_points)} resume points")
    
    # Initialize search
    search = VectorSearch()
    
    # Add resume points to vector store
    print("📝 Adding resume points to vector store...")
    search.add_resume_points(resume_points[:10])  # Use first 10 for testing
    
    # Test job description with specific keywords
    jd = "We need a Python developer with FastAPI, AWS, and Docker experience for microservices architecture."
    
    print(f"\n🔍 Job Description: {jd}")
    
    # Test semantic-only search
    print("\n📊 Semantic-only search:")
    semantic_results = search.search_similar(jd, top_k=5, use_hybrid=False)
    
    for i, (bullet, score) in enumerate(semantic_results, 1):
        print(f"  {i}. [{score:.3f}] {bullet[:60]}...")
    
    # Test hybrid search
    print("\n🔀 Hybrid search (semantic + keyword):")
    hybrid_results = search.search_hybrid(jd, top_k=5)
    
    for i, (bullet, score) in enumerate(hybrid_results, 1):
        print(f"  {i}. [{score:.3f}] {bullet[:60]}...")
    
    # Compare results
    print("\n📈 Comparison:")
    semantic_top = semantic_results[0][0] if semantic_results else None
    hybrid_top = hybrid_results[0][0] if hybrid_results else None
    
    if semantic_top and hybrid_top:
        print(f"   Semantic top: {semantic_top[:50]}...")
        print(f"   Hybrid top: {hybrid_top[:50]}...")
        
        # Hybrid search should find different or better results
        print("\n   ✅ Both searches completed successfully!")
        print("   💡 Hybrid search combines semantic similarity with keyword matching")
    else:
        print("   ⚠️  Could not compare (empty results)")


def main():
    """Run all integration tests."""
    print("\n" + "=" * 60)
    print("🧪 Hybrid Search Integration Tests")
    print("=" * 60)
    
    try:
        test_keyword_extraction_integration()
        test_keyword_scoring_integration()
        test_hybrid_vs_semantic_comparison()
        
        print("\n" + "=" * 60)
        print("✅ All integration tests completed!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()

