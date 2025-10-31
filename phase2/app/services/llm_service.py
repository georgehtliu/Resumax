"""
LLM Service for text generation and rewriting.

This service handles all interactions with OpenAI's language models,
including prompt engineering and response parsing.
"""

import json
import requests
from typing import List, Dict, Optional
import os
from dotenv import load_dotenv

load_dotenv()

class LLMService:
    """
    Service for interacting with OpenAI's language models.
    
    This handles the "Generate" part of the RAG pipeline.
    """
    
    def __init__(self, model: str = "gpt-3.5-turbo"):
        """
        Initialize the LLM service.
        
        Args:
            model: OpenAI model to use (gpt-3.5-turbo, gpt-4, etc.)
        """
        # Validate API key
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable is required")
        
        self.api_key = api_key
        self.model = model
    
    async def rewrite_resume_points(self, 
                                  job_description: str, 
                                  resume_points: List[str],
                                  style: str = "professional") -> List[Dict]:
        """
        Rewrite resume points to better match job description.
        
        This is the core "Generate" step in the RAG pipeline.
        
        Args:
            job_description: Target job description
            resume_points: List of resume points to rewrite
            style: Writing style (professional, technical, concise)
            
        Returns:
            List of dictionaries with original, rewritten, and reasoning
        """
        # TODO: Create an effective prompt
        # HINT: Include job description as context
        # HINT: Ask for specific improvements
        # HINT: Request JSON format output
        # HINT: Include style instructions
        
        prompt = f"""
        You are a resume optimization expert. Rewrite the following resume bullet points to better match the job description.

        Job Description:
        {job_description}

        Original Resume Points:
        {chr(10).join(f"- {point}" for point in resume_points)}

        Instructions:
        - Make each point more relevant to the job requirements
        - Use keywords from the job description
        - Maintain the original meaning but improve impact
        - Keep each point concise but impactful
        - Style: {style}
        - Add quantifiable results where possible

        Return as JSON array with this exact format:
        [
            {{
                "original": "original text",
                "rewritten": "improved text",
                "reasoning": "why this change was made"
            }}
        ]
        """
        
        try:
            # Call OpenAI API using REST endpoint to avoid proxy/client issues
            url = "https://api.openai.com/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            }
            payload = {
                "model": self.model,
                "messages": [
                    {"role": "system", "content": "You are a resume optimization expert. Always respond with valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.7,
                "max_tokens": 2000
            }
            
            response = requests.post(url, headers=headers, json=payload, timeout=60)
            response.raise_for_status()
            response_data = response.json()
            
            # Extract content from response
            content = response_data["choices"][0]["message"]["content"].strip()
            
            # Remove any markdown formatting if present
            if content.startswith("```json"):
                content = content[7:-3]
            elif content.startswith("```"):
                content = content[3:-3]
            
            result = json.loads(content)
            
            # TODO: Validate the response format
            # HINT: Check if it's a list
            # HINT: Check if each item has required keys
            
            if not isinstance(result, list):
                raise ValueError("Response is not a list")
            
            for item in result:
                if not all(key in item for key in ["original", "rewritten", "reasoning"]):
                    raise ValueError("Missing required keys in response")
            
            return result
            
        except json.JSONDecodeError as e:
            print(f"JSON parsing error: {e}")
            print(f"Raw response: {content}")
            return []
        except Exception as e:
            print(f"Error in LLM service: {e}")
            return []
    
    async def analyze_job_requirements(self, job_description: str) -> Dict[str, List[str]]:
        """
        Analyze job description to extract key requirements.
        
        This is an optional helper method for better prompting.
        
        Args:
            job_description: Job description to analyze
            
        Returns:
            Dictionary with extracted requirements
        """
        # TODO: Implement job analysis
        # HINT: Use LLM to extract skills, technologies, experience level
        # HINT: Return structured data for better prompting
        
        prompt = f"""
        Analyze this job description and extract key requirements:
        
        {job_description}
        
        Return as JSON with these categories:
        {{
            "skills": ["skill1", "skill2"],
            "technologies": ["tech1", "tech2"],
            "experience_level": "entry/mid/senior",
            "key_phrases": ["phrase1", "phrase2"]
        }}
        """
        
        try:
            # Call OpenAI API using REST endpoint
            url = "https://api.openai.com/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            }
            payload = {
                "model": self.model,
                "messages": [
                    {"role": "system", "content": "You are a job analysis expert. Always respond with valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.3
            }
            
            response = requests.post(url, headers=headers, json=payload, timeout=60)
            response.raise_for_status()
            response_data = response.json()
            
            content = response_data["choices"][0]["message"]["content"].strip()
            if content.startswith("```json"):
                content = content[7:-3]
            elif content.startswith("```"):
                content = content[3:-3]
            
            return json.loads(content)
        except Exception as e:
            print(f"Error analyzing job requirements: {e}")
            return {"skills": [], "technologies": [], "experience_level": "mid", "key_phrases": []}


