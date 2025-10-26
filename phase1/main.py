"""
Main entry point for the AI Resume Optimizer Phase 1.

This script demonstrates how to:
1. Load resume points and job description from files
2. Generate embeddings for text
3. Store embeddings in a vector database
4. Perform similarity search
5. Display top matching resume points

TODO: Complete the missing implementations in embeddings.py and search.py
"""

import os
from core.embeddings import EmbeddingGenerator
from core.search import VectorSearch

def load_text_file(file_path: str) -> str:
    """
    Load text content from a file.
    
    Args:
        file_path: Path to the text file
        
    Returns:
        File content as string
    """
    # TODO: Add error handling for missing files
    # HINT: Use try/except with FileNotFoundError
    
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            return file.read().strip()
    except FileNotFoundError:
        print(f"Error: File {file_path} not found")
        return ""
    except Exception as e:
        print(f"Error reading file {file_path}: {e}")
        return ""

def load_resume_points(file_path: str) -> list:
    """
    Load resume points from file, splitting by lines.
    
    Args:
        file_path: Path to resume points file
        
    Returns:
        List of resume point strings
    """
    content = load_text_file(file_path)
    if not content:
        return []
    
    # TODO: Consider different splitting strategies
    # HINT: Some resume points might be separated by different delimiters
    # HINT: Consider cleaning up whitespace and empty lines
    
    resume_points = [line.strip() for line in content.split('\n') if line.strip()]
    return resume_points

def main():
    """
    Main function that orchestrates the embedding and search process.
    """
    print("🚀 AI Resume Optimizer - Phase 1: Embeddings & Similarity Search")
    print("=" * 60)
    
    # TODO: Add configuration options
    # HINT: Consider making file paths configurable
    # HINT: Add options for embedding model selection
    
    # File paths
    resume_file = "data/resume_points.txt"
    job_file = "data/job_description.txt"
    
    # Load data
    print("📄 Loading data...")
    resume_points = load_resume_points(resume_file)
    job_description = load_text_file(job_file)
    
    if not resume_points:
        print("❌ No resume points loaded. Check your data file.")
        return
    
    if not job_description:
        print("❌ No job description loaded. Check your data file.")
        return
    
    print(f"✅ Loaded {len(resume_points)} resume points")
    print(f"✅ Loaded job description ({len(job_description)} characters)")
    
    # Check environment variables
    if not os.getenv("OPENAI_API_KEY"):
        print("❌ Error: OPENAI_API_KEY environment variable is required")
        print("💡 Please create a .env file with your OpenAI API key")
        return
    
    # Initialize components
    print("\n🔧 Initializing components...")
    
    try:
        embedding_gen = EmbeddingGenerator()
        vector_search = VectorSearch()
        
        print("✅ Embedding generator initialized")
        print("✅ Vector search initialized")
        
        # Add resume points to vector store
        print(f"\n📊 Adding resume points to vector store...")
        vector_search.add_resume_points(resume_points)
        
        # Get collection stats
        stats = vector_search.get_collection_stats()
        print(f"📈 Collection stats: {stats}")
        
        # Perform similarity search
        print(f"\n🔍 Searching for similar resume points...")
        print(f"Job description: {job_description[:100]}...")
        
        # TODO: Make top_k configurable
        top_k = 5
        similar_points = vector_search.search_similar(job_description, top_k=top_k)
        
        # Display results
        print(f"\n🎯 Top {len(similar_points)} matching resume points:")
        print("-" * 50)
        
        for i, (resume_point, similarity) in enumerate(similar_points, 1):
            print(f"{i}. {resume_point}")
            print(f"   Similarity: {similarity:.3f}")
            print()
        
        # TODO: Add analysis and insights
        # HINT: Calculate average similarity
        # HINT: Identify the best matching categories
        # HINT: Suggest improvements based on low-scoring matches
        
        if similar_points:
            avg_similarity = sum(score for _, score in similar_points) / len(similar_points)
            print(f"📊 Average similarity: {avg_similarity:.3f}")
            
            # TODO: Add more detailed analysis
            # HINT: Categorize matches by similarity ranges
            # HINT: Identify gaps in the resume points
        
        print("\n✅ Process completed successfully!")
        
    except Exception as e:
        print(f"❌ Error during processing: {e}")
        print("💡 Check your OpenAI API key and try again")

if __name__ == "__main__":
    main()
