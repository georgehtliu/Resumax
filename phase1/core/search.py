"""
Search module for handling similarity search operations.

This module manages the vector store and provides search functionality
for finding similar resume points based on job descriptions.
"""

import chromadb
from typing import List, Tuple, Dict
import os
from .embeddings import EmbeddingGenerator

class VectorSearch:
    """
    Handles vector storage and similarity search operations.
    
    TODO: Explore different vector databases:
    - ChromaDB: Easy to use, good for prototyping
    - FAISS: Facebook's library, very fast for large datasets
    - Pinecone: Managed service, scales well
    - Weaviate: Open source, supports hybrid search
    """
    
    def __init__(self, collection_name: str = "resume_points"):
        """
        Initialize the vector search system.
        
        Args:
            collection_name: Name of the ChromaDB collection to use
        """
        # TODO: Configure ChromaDB client
        # HINT: Consider persistence options - in-memory vs persistent storage
        # HINT: Set up proper collection configuration
        
        self.client = chromadb.Client()
        self.collection_name = collection_name
        self.embedding_generator = EmbeddingGenerator()
        
        # TODO: Initialize or get existing collection
        # HINT: Use self.client.get_or_create_collection()
        try:
            self.collection = self.client.get_collection(name=collection_name)
        except:
            self.collection = self.client.create_collection(name=collection_name)
    
    def add_resume_points(self, resume_points: List[str]) -> None:
        """
        Add resume points to the vector store.
        
        Args:
            resume_points: List of resume bullet points to store
        """
        # TODO: Generate embeddings for all resume points
        # HINT: Use the embedding generator's batch method
        # HINT: Consider adding metadata (like original text) for retrieval
        
        print(f"Generating embeddings for {len(resume_points)} resume points...")
        
        # TODO: Generate embeddings using the embedding generator
        embeddings = self.embedding_generator.generate_embeddings_batch(resume_points)
        
        # TODO: Add to ChromaDB collection
        # HINT: Use collection.add() with embeddings, documents, and IDs
        # HINT: Generate unique IDs for each resume point
        
        if embeddings:
            # Create unique IDs for each resume point
            ids = [f"resume_point_{i}" for i in range(len(resume_points))]
            
            # TODO: Add to collection
            # HINT: collection.add(embeddings=..., documents=..., ids=...)
            self.collection.add(
                embeddings=embeddings,
                documents=resume_points,
                ids=ids
            )
            print(f"Added {len(resume_points)} resume points to vector store")
        else:
            print("No embeddings generated - check your API key and model configuration")
    
    def search_similar(self, job_description: str, top_k: int = 5) -> List[Tuple[str, float]]:
        """
        Search for resume points similar to the job description.
        
        Args:
            job_description: Job description text to match against
            top_k: Number of top matches to return
            
        Returns:
            List of tuples (resume_point, similarity_score)
        """
        # TODO: Generate embedding for job description
        # HINT: Use the embedding generator to create query embedding
        
        print(f"Searching for similar resume points...")
        
        # TODO: Generate embedding for job description
        query_embedding = self.embedding_generator.generate_embedding(job_description)
        
        if not query_embedding:
            print("Failed to generate query embedding")
            return []
        
        # TODO: Query the vector store
        # HINT: Use collection.query() with query_embeddings parameter
        # HINT: Set n_results to get top_k matches
        
        # TODO: Implement the search
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k
        )
        
        # TODO: Format and return results
        # HINT: Extract documents and distances from results
        # HINT: Convert distances to similarity scores (1 - distance)
        
        if results and results['documents'] and results['documents'][0]:
            documents = results['documents'][0]
            distances = results['distances'][0]
            
            # Convert distances to similarity scores
            similarities = [(doc, 1 - dist) for doc, dist in zip(documents, distances)]
            return similarities
        else:
            print("No results found")
            return []
    
    def get_collection_stats(self) -> Dict:
        """
        Get statistics about the vector collection.
        
        Returns:
            Dictionary with collection statistics
        """
        # TODO: Implement collection statistics
        # HINT: Use collection.count() to get number of items
        # HINT: Consider adding more detailed stats
        
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
        
        TODO: Consider if you want to keep this method in production
        """
        # TODO: Implement collection clearing
        # HINT: Use collection.delete() or recreate the collection
        
        try:
            # Delete all items in the collection
            self.collection.delete()
            print("Collection cleared")
        except Exception as e:
            print(f"Error clearing collection: {e}")
