"""
Interview Question Prep Service - Generate interview questions based on resume bullets.

Uses a single LLM call to generate relevant interview questions with STAR method guidance.
"""

import json
import requests
from typing import List, Dict, Optional
import os
from dotenv import load_dotenv
from app.schemas.rag import StructuredResume, Experience, Project

load_dotenv()

class InterviewQuestionService:
    """
    Service for generating interview questions based on resume experiences or projects.
    
    Single LLM call that analyzes bullets and generates relevant questions with STAR method guidance.
    """
    
    def __init__(self, model: str = "gpt-4o-mini"):
        """
        Initialize the interview question service.
        
        Args:
            model: OpenAI model to use (gpt-4o-mini is cost-effective)
        """
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable is required")
        
        self.api_key = api_key
        self.model = model
    
    async def generate_questions(
        self,
        item: Dict,
        item_type: str  # 'experience' or 'project'
    ) -> Dict:
        """
        Generate interview questions for a specific experience or project.
        
        Args:
            item: Experience or Project dictionary with bullets
            item_type: Type of item ('experience' or 'project')
            
        Returns:
            Dictionary with generated questions and STAR method guidance
        """
        # Build prompt
        prompt = self._build_question_prompt(item, item_type)
        
        # Call LLM
        response = await self._call_llm(prompt)
        
        # Parse and validate response
        return self._parse_response(response)
    
    def _build_question_prompt(self, item: Dict, item_type: str) -> str:
        """Build prompt for generating interview questions."""
        
        # Format item details
        if item_type == 'experience':
            title = f"{item.get('role', 'Position')} at {item.get('company', 'Company')}"
            if item.get('startDate') and item.get('endDate'):
                title += f" ({item.get('startDate')} - {item.get('endDate')})"
            context = f"Work Experience: {title}"
            if item.get('location'):
                context += f"\nLocation: {item.get('location')}"
        else:  # project
            title = item.get('name', 'Project')
            context = f"Project: {title}"
            if item.get('description'):
                context += f"\nDescription: {item.get('description')}"
            if item.get('technologies'):
                context += f"\nTechnologies: {item.get('technologies')}"
        
        # Format bullets
        bullets = item.get('bullets', [])
        bullets_text = []
        for i, bullet in enumerate(bullets, 1):
            bullet_text = bullet.get('text') if isinstance(bullet, dict) else str(bullet)
            bullets_text.append(f"{i}. {bullet_text}")
        
        bullets_str = "\n".join(bullets_text) if bullets_text else "No bullet points provided."
        
        prompt = f"""Generate interview questions based on this resume {item_type}.

CONTEXT:
{context}

BULLET POINTS:
{bullets_str}

Generate 5-8 relevant interview questions that an interviewer might ask about this {item_type}. 
Focus on questions that:
1. Explore the specific accomplishments mentioned in the bullets
2. Ask about challenges, problem-solving, and decision-making
3. Probe into technical details, tools, and methodologies mentioned
4. Understand impact, results, and quantifiable outcomes
5. Assess collaboration, leadership, and teamwork (if applicable)

For each question, provide:
- The question itself
- A brief explanation of why this question is likely to be asked
- A STAR method framework (Situation, Task, Action, Result) with guidance on how to answer
- Key points to mention based on the resume bullets

Return JSON in this format:
{{
    "itemTitle": "{title}",
    "itemType": "{item_type}",
    "questions": [
        {{
            "question": "What question would an interviewer ask?",
            "whyAsked": "Why this question is relevant based on the resume",
            "starFramework": {{
                "situation": "Guidance on describing the situation/context",
                "task": "Guidance on describing the task/goal",
                "action": "Guidance on describing your actions (reference specific bullets)",
                "result": "Guidance on describing results/outcomes (use metrics from bullets)"
            }},
            "keyPoints": ["Point 1 from bullets", "Point 2 from bullets", "Point 3 from bullets"]
        }}
    ]
}}

Be specific and reference details from the bullet points. Make questions realistic and tailored to this {item_type}.
Return valid JSON only."""
        
        return prompt
    
    async def _call_llm(self, prompt: str) -> str:
        """
        Call OpenAI API with structured JSON output.
        
        Uses REST API and forces JSON output format.
        """
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        
        # Estimate tokens: ~200-300 tokens per question, base 1000 for structure
        # 5-8 questions = ~2000-3500 tokens, so 4000 should be safe
        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "system",
                    "content": "You are an interview preparation expert. Generate realistic interview questions based on resume content. Return only valid JSON, no markdown, no code blocks."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "temperature": 0.7,  # Slightly creative for varied questions
            "max_tokens": 4000,
            "response_format": {"type": "json_object"}  # Force JSON output
        }
        
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=90)
            response.raise_for_status()
            response_data = response.json()
            
            content = response_data["choices"][0]["message"]["content"].strip()
            
            # Remove markdown code blocks if present
            if content.startswith("```"):
                lines = content.split("\n")
                content = "\n".join([line for line in lines if not line.strip().startswith("```")])
            
            return content
            
        except requests.exceptions.RequestException as e:
            print(f"❌ API request failed: {e}")
            if hasattr(e, 'response') and e.response is not None:
                print(f"Response: {e.response.text}")
            raise
        except Exception as e:
            print(f"❌ Unexpected error in LLM call: {e}")
            raise
    
    def _parse_response(self, response_text: str) -> Dict:
        """
        Parse and validate LLM response.
        
        Args:
            response_text: Raw response from LLM
            
        Returns:
            Parsed and validated response dictionary
        """
        try:
            # Parse JSON
            data = json.loads(response_text)
            
            # Validate required fields
            if "questions" not in data:
                data["questions"] = []
            
            if "itemTitle" not in data:
                data["itemTitle"] = "Unknown"
            
            if "itemType" not in data:
                data["itemType"] = "experience"
            
            # Validate questions structure
            if isinstance(data["questions"], list):
                for question in data["questions"]:
                    # Ensure required fields exist
                    if "question" not in question:
                        question["question"] = "Question not provided"
                    if "whyAsked" not in question:
                        question["whyAsked"] = ""
                    if "starFramework" not in question:
                        question["starFramework"] = {
                            "situation": "",
                            "task": "",
                            "action": "",
                            "result": ""
                        }
                    if "keyPoints" not in question:
                        question["keyPoints"] = []
            
            return data
            
        except json.JSONDecodeError as e:
            print(f"❌ Failed to parse JSON response: {e}")
            print(f"Response text (first 500 chars): {response_text[:500]}")
            return {
                "itemTitle": "Error",
                "itemType": "experience",
                "questions": []
            }
        except Exception as e:
            print(f"❌ Error validating response: {e}")
            return {
                "itemTitle": "Error",
                "itemType": "experience",
                "questions": []
            }

