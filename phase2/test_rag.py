#!/usr/bin/env python3
"""
Test script for the RAG pipeline.

This script helps you test the RAG functionality without using the API.
"""

import asyncio
import os
from dotenv import load_dotenv
from app.services.rag_service import RAGService
from app.schemas.rag import RAGRequest

# Load environment variables
load_dotenv()

async def test_rag_pipeline():
    """Test the complete RAG pipeline."""
    
    print("🧪 Testing RAG Pipeline")
    print("=" * 50)
    
    # Check if API key is set
    if not os.getenv("OPENAI_API_KEY"):
        print("❌ Error: OPENAI_API_KEY not found in environment")
        print("💡 Please add your API key to .env file")
        return
    
    # Create test request
    test_request = RAGRequest(
        job_description="We are looking for a Senior Software Engineer with experience in microservices, REST APIs, and team leadership.",
        top_k=3,
        rewrite_style="professional"
    )
    
    print(f"📝 Job Description: {test_request.job_description}")
    print(f"🔍 Retrieving top {test_request.top_k} points")
    print(f"✍️ Rewrite style: {test_request.rewrite_style}")
    print()
    
    try:
        # Initialize RAG service
        rag_service = RAGService()
        
        # Process the request
        result = await rag_service.process_rag_request(test_request)
        
        # Display results
        print("🎯 Results:")
        print("-" * 30)
        
        print(f"📊 Retrieved {len(result.retrieved_points)} points:")
        for i, point in enumerate(result.retrieved_points, 1):
            print(f"  {i}. {point}")
        
        print(f"\n🤖 Rewritten {len(result.rewritten_points)} points:")
        for i, point in enumerate(result.rewritten_points, 1):
            print(f"  {i}. Original: {point.original}")
            print(f"     Rewritten: {point.rewritten}")
            if point.reasoning:
                print(f"     Reasoning: {point.reasoning}")
            print()
        
        print(f"⏱️ Processing time: {result.processing_time:.2f} seconds")
        print("✅ RAG pipeline test completed successfully!")
        
    except Exception as e:
        print(f"❌ Error during RAG pipeline test: {e}")
        print("💡 Check your setup and try again")

if __name__ == "__main__":
    asyncio.run(test_rag_pipeline())


