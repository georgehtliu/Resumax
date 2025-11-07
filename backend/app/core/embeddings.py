"""
Embeddings module for generating and comparing text embeddings.

This module handles the core functionality of converting text to vector representations
and computing similarity between different texts.
"""

import openai
import requests
import numpy as np
from typing import List, Tuple, Optional
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
        # Defer OpenAI client creation to first use to avoid startup issues
        # (e.g., proxy configuration problems during app startup)
        self._api_key: Optional[str] = os.getenv("OPENAI_API_KEY")
        if not self._api_key:
            raise ValueError("OPENAI_API_KEY environment variable is required")
        self.client: Optional[openai.OpenAI] = None  # Not used in REST fallback
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
            # REST fallback to avoid httpx/proxy incompatibilities
            url = "https://api.openai.com/v1/embeddings"
            headers = {
                "Authorization": f"Bearer {self._api_key}",
                "Content-Type": "application/json",
            }
            payload = {"model": self.model_name, "input": text}
            resp = requests.post(url, headers=headers, json=payload, timeout=30)
            resp.raise_for_status()
            data = resp.json()
            return data["data"][0]["embedding"]
        except Exception as e:
            print(f"Error generating embedding: {e}")
            # TODO: Decide on error handling strategy
            return None
    
    def generate_embeddings_batch(self, texts: List[str], batch_size: int = 64) -> List[List[float]]:
        """
        Generate embeddings for multiple texts efficiently using batched API calls.
        
        Args:
            texts: List of input texts to embed
            batch_size: Maximum number of texts to send per API request
            
        Returns:
            List of embedding vectors aligned with the input order
        """
        if not texts:
            return []

        embeddings: List[List[float]] = []
        url = "https://api.openai.com/v1/embeddings"
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }

        for start in range(0, len(texts), batch_size):
            batch = texts[start:start + batch_size]
            try:
                payload = {"model": self.model_name, "input": batch}
                resp = requests.post(url, headers=headers, json=payload, timeout=30)
                resp.raise_for_status()
                data = resp.json().get("data", [])

                if not data:
                    raise ValueError("No embedding data returned from API")

                # Preserve order: OpenAI returns embeddings in the same order as inputs
                for item in data:
                    embeddings.append(item.get("embedding", [0.0] * self.embedding_dimensions))
            except Exception as exc:
                print(f"Error generating batch embeddings: {exc}")
                # Fallback: append zero vectors for each item in the failed batch
                zero_vector = [0.0] * self.embedding_dimensions
                embeddings.extend([zero_vector for _ in batch])

        # Ensure the returned list aligns with the input length
        if len(embeddings) < len(texts):
            zero_vector = [0.0] * self.embedding_dimensions
            embeddings.extend([zero_vector for _ in range(len(texts) - len(embeddings))])
        elif len(embeddings) > len(texts):
            embeddings = embeddings[:len(texts)]

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
