"""
Search module for handling similarity search operations.

This module manages the vector store and provides search functionality
for finding similar resume points based on job descriptions.
"""

import chromadb
from chromadb.config import Settings
from typing import List, Tuple, Dict
import os
import re
from .embeddings import EmbeddingGenerator
from .keyword_patterns import TECH_PATTERNS, ACTION_VERBS, COMMON_WORDS

class VectorSearch:
    """
    Handles vector storage and similarity search operations.
    
    Supports both semantic-only and hybrid search (semantic + keyword matching).
    """
    
    def __init__(self, collection_name: str = "resume_points"):
        """
        Initialize the vector search system.
        
        Args:
            collection_name: Name of the ChromaDB collection to use
        """
        # Use a local DuckDB+Parquet persistent client (no HTTP, no proxies)
        # Data will be stored under ./chroma_db
        os.makedirs("chroma_db", exist_ok=True)
        try:
            settings = Settings(
                chroma_db_impl="duckdb+parquet",
                persist_directory="chroma_db",
                anonymized_telemetry=False
            )
            self.client = chromadb.Client(settings)
        except Exception:
            # Fallback to in-memory client
            self.client = chromadb.Client(Settings(anonymized_telemetry=False))
        self.collection_name = collection_name
        self.embedding_generator = EmbeddingGenerator()
        
        try:
            self.collection = self.client.get_or_create_collection(name=collection_name)
        except Exception:
            # As a last resort, create explicitly
            self.collection = self.client.create_collection(name=collection_name)
    
    def add_resume_points(self, resume_points: List[str]) -> None:
        """
        Add resume points to the vector store.
        
        Args:
            resume_points: List of resume bullet points to store
        """
        print(f"Generating embeddings for {len(resume_points)} resume points...")
        
        embeddings = self.embedding_generator.generate_embeddings_batch(resume_points)
        
        if embeddings:
            # Create unique IDs for each resume point
            ids = [f"resume_point_{i}" for i in range(len(resume_points))]
            
            self.collection.add(
                embeddings=embeddings,
                documents=resume_points,
                ids=ids
            )
            print(f"Added {len(resume_points)} resume points to vector store")
        else:
            print("No embeddings generated - check your API key and model configuration")
    
    def search_similar(self, job_description: str, top_k: int = 5, use_hybrid: bool = False) -> List[Tuple[str, float]]:
        """
        Search for resume points similar to the job description.
        
        Args:
            job_description: Job description text to match against
            top_k: Number of top matches to return
            use_hybrid: If True, use hybrid search (semantic + keyword), else semantic only
            
        Returns:
            List of tuples (resume_point, similarity_score)
        """
        if use_hybrid:
            return self.search_hybrid(job_description, top_k)
        
        print(f"Searching for similar resume points (semantic only)...")
        
        # Generate embedding for job description
        query_embedding = self.embedding_generator.generate_embedding(job_description)
        
        if not query_embedding:
            print("Failed to generate query embedding")
            return []
        
        # Query the vector store
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k
        )
        
        # Format and return results
        if results and results['documents'] and results['documents'][0]:
            documents = results['documents'][0]
            distances = results['distances'][0]
            
            # Convert distances to similarity scores (1 - distance)
            similarities = [(doc, 1 - dist) for doc, dist in zip(documents, distances)]
            return similarities
        else:
            print("No results found")
            return []
    
    def extract_keywords(self, text: str) -> List[str]:
        """
        Extract important keywords from text (FREE - no API calls).
        
        Extracts:
        - Technical skills (Python, React, AWS, etc.)
        - Common tech terms (API, microservices, Kubernetes, etc.)
        - Action verbs (implement, deploy, optimize, etc.)
        
        Args:
            text: Text to extract keywords from
            
        Returns:
            List of extracted keywords (lowercase, deduplicated)
        """
        keywords = []
        
        # Extract tech terms using patterns from keyword_patterns module
        for pattern in TECH_PATTERNS:
            matches = re.findall(pattern, text, re.IGNORECASE)
            keywords.extend([m.lower() for m in matches])
        
        # Extract action verbs if present
        text_lower = text.lower()
        for verb in ACTION_VERBS:
            if verb in text_lower:
                keywords.append(verb)
        
        # Extract standalone capitalized terms (likely tech skills)
        capitalized_terms = re.findall(r'\b[A-Z][a-z]{2,}\b', text)
        # Filter out common words that aren't tech skills
        tech_terms = [term.lower() for term in capitalized_terms if term not in COMMON_WORDS]
        keywords.extend(tech_terms[:15])  # Limit to top 15 to catch more tech terms
        
        return list(set(keywords))  # Remove duplicates
    
    def compute_keyword_score(self, bullet: str, keywords: List[str]) -> float:
        """
        Compute keyword matching score for a bullet point.
        
        Args:
            bullet: Resume bullet point text
            keywords: List of keywords to match against
            
        Returns:
            Keyword match score between 0.0 and 1.0
        """
        if not keywords:
            return 0.0
        
        bullet_lower = bullet.lower()
        matches = sum(1 for keyword in keywords if keyword.lower() in bullet_lower)
        
        # Normalize: matches / total keywords
        return matches / len(keywords) if len(keywords) > 0 else 0.0
    
    def search_hybrid(self, job_description: str, top_k: int = 5) -> List[Tuple[str, float]]:
        """
        Hybrid search combining semantic similarity + keyword matching.
        
        Strategy:
        1. Extract keywords from JD (FREE - regex, no API)
        2. Get semantic matches via vector search (retrieve more candidates)
        3. Re-rank by combining: 70% semantic + 30% keyword
        
        Args:
            job_description: Job description text to match against
            top_k: Number of top matches to return
            
        Returns:
            List of tuples (resume_point, hybrid_score)
        """
        print(f"🔍 Hybrid search: Extracting keywords (FREE)...")
        
        # Step 1: Extract keywords (FREE, fast)
        keywords = self.extract_keywords(job_description)
        print(f"   Found {len(keywords)} keywords: {', '.join(keywords[:10])}")
        
        # Step 2: Get more candidates from semantic search (retrieve 2x for re-ranking)
        print(f"   Getting semantic candidates...")
        query_embedding = self.embedding_generator.generate_embedding(job_description)
        
        if not query_embedding:
            print("   Failed to generate query embedding")
            return []
        
        # Retrieve more candidates than needed for better re-ranking
        candidate_k = min(top_k * 2, self.collection.count())
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=candidate_k
        )
        
        if not results or not results['documents'] or not results['documents'][0]:
            print("   No semantic results found")
            return []
        
        documents = results['documents'][0]
        distances = results['distances'][0]
        
        # Step 3: Re-rank with hybrid scoring
        print(f"   Re-ranking {len(documents)} candidates with hybrid scoring...")
        
        hybrid_scores = []
        for doc, distance in zip(documents, distances):
            # Semantic score: convert distance to similarity (0-1)
            semantic_score = 1 - distance
            
            # Keyword score (0-1)
            keyword_score = self.compute_keyword_score(doc, keywords)
            
            # Hybrid score: weighted combination
            # 70% semantic (catches meaning) + 30% keyword (catches exact matches)
            hybrid_score = (0.7 * semantic_score) + (0.3 * keyword_score)
            
            hybrid_scores.append((doc, hybrid_score))
        
        # Sort by hybrid score (descending) and return top_k
        hybrid_scores.sort(key=lambda x: x[1], reverse=True)
        
        print(f"✅ Hybrid search complete: {len(hybrid_scores)} candidates ranked")
        
        return hybrid_scores[:top_k]
    
    def get_collection_stats(self) -> Dict:
        """
        Get statistics about the vector collection.
        
        Returns:
            Dictionary with collection statistics
        """
        try:
            count = self.collection.count()
            return {
                "total_points": count,
                "collection_name": self.collection_name,
                "embedding_model": self.embedding_generator.model_name
            }
        except Exception as e:
            return {"error": f"Failed to get stats: {e}"}
    
    def clear_collection(self) -> None:
        """
        Clear all data from the collection.
        """
        try:
            # Get all IDs and delete them
            all_items = self.collection.get()
            if all_items['ids']:
                self.collection.delete(ids=all_items['ids'])
            print("Collection cleared")
        except Exception as e:
            print(f"Error clearing collection: {e}")
