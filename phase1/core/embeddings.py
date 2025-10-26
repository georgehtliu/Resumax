"""
Embeddings module for generating and comparing text embeddings.

This module handles the core functionality of converting text to vector representations
and computing similarity between different texts.
"""

import openai
import numpy as np
from typing import List, Tuple
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class EmbeddingGenerator:
    """
    Handles generation of text embeddings using OpenAI's embedding models.
    
    TODO: Research different embedding models and their trade-offs:
    - text-embedding-3-small: Fast, cost-effective, good for most use cases
    - text-embedding-3-large: More accurate, higher cost, better for complex tasks
    - text-embedding-ada-002: Legacy model, still widely used
    """
    
    def __init__(self, model_name: str = "text-embedding-3-small"):
        """
        Initialize the embedding generator.
        
        Args:
            model_name: OpenAI embedding model to use
        """
        # Validate API key
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable is required")
        
        self.client = openai.OpenAI(api_key=api_key)
        self.model_name = model_name
        
        # HINT: Different models have different embedding dimensions
        # text-embedding-3-small: 1536 dimensions
        # text-embedding-3-large: 3072 dimensions
        self.embedding_dimensions = self._get_embedding_dimensions()
    
    def _get_embedding_dimensions(self) -> int:
        """
        Get the expected embedding dimensions for the current model.
        
        TODO: Implement logic to determine embedding dimensions based on model
        HINT: You can either hardcode known dimensions or make a test API call
        """
        # Model-specific embedding dimensions
        model_dimensions = {
            "text-embedding-3-small": 1536,
            "text-embedding-3-large": 3072,
            "text-embedding-ada-002": 1536
        }
        return model_dimensions.get(self.model_name, 1536)
    
    def generate_embedding(self, text: str) -> List[float]:
        """
        Generate embedding for a single text string.
        
        Args:
            text: Input text to embed
            
        Returns:
            List of float values representing the embedding vector
        """
        # TODO: Implement OpenAI API call to generate embedding
        # HINT: Use self.client.embeddings.create() with model and input parameters
        # HINT: Handle potential API errors (rate limits, invalid input, etc.)
        
        try:
            # TODO: Replace this placeholder with actual API call
            response = self.client.embeddings.create(
                model=self.model_name,
                input=text
            )
            return response.data[0].embedding
        except Exception as e:
            print(f"Error generating embedding: {e}")
            # TODO: Decide on error handling strategy
            return None
    
    def generate_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for multiple texts efficiently.
        
        Args:
            texts: List of input texts to embed
            
        Returns:
            List of embedding vectors
        """
        # TODO: Implement batch processing
        # HINT: OpenAI API supports batch requests - more efficient than individual calls
        # HINT: Consider rate limiting and chunking for large batches
        
        embeddings = []
        for text in texts:
            embedding = self.generate_embedding(text)
            if embedding:
                embeddings.append(embedding)
            else:
                # TODO: Handle failed embeddings - skip, retry, or use fallback?
                embeddings.append([0.0] * self.embedding_dimensions)
        
        return embeddings
    
    def compute_similarity(self, embedding1: List[float], embedding2: List[float]) -> float:
        """
        Compute cosine similarity between two embeddings.
        
        Args:
            embedding1: First embedding vector
            embedding2: Second embedding vector
            
        Returns:
            Cosine similarity score between -1 and 1
        """
        # TODO: Implement cosine similarity calculation
        # HINT: Use numpy for efficient vector operations
        # Formula: cos(θ) = (A · B) / (||A|| * ||B||)
        
        # Convert to numpy arrays for easier computation
        vec1 = np.array(embedding1)
        vec2 = np.array(embedding2)
        
        # TODO: Implement the cosine similarity formula
        # HINT: np.dot() for dot product, np.linalg.norm() for magnitude
        dot_product = np.dot(vec1, vec2)
        magnitude1 = np.linalg.norm(vec1)
        magnitude2 = np.linalg.norm(vec2)
        
        if magnitude1 == 0 or magnitude2 == 0:
            return 0.0
        
        similarity = dot_product / (magnitude1 * magnitude2)
        return float(similarity)
    
    def find_most_similar(self, query_embedding: List[float], 
                         candidate_embeddings: List[List[float]], 
                         top_k: int = 5) -> List[Tuple[int, float]]:
        """
        Find the most similar embeddings to a query embedding.
        
        Args:
            query_embedding: The query embedding to compare against
            candidate_embeddings: List of candidate embeddings
            top_k: Number of top matches to return
            
        Returns:
            List of tuples (index, similarity_score) sorted by similarity
        """
        # TODO: Implement similarity search
        # HINT: Compute similarity for each candidate and sort by score
        # HINT: Consider using numpy for vectorized operations for better performance
        
        similarities = []
        for i, candidate in enumerate(candidate_embeddings):
            similarity = self.compute_similarity(query_embedding, candidate)
            similarities.append((i, similarity))
        
        # Sort by similarity score (descending)
        similarities.sort(key=lambda x: x[1], reverse=True)
        
        return similarities[:top_k]
