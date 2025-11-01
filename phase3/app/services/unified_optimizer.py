"""
Unified Resume Optimizer - Single-agent approach for cost efficiency.

This service consolidates multiple optimization tasks into one LLM call:
- Ranking bullets by relevance
- Rewriting bullets for improvement
- Identifying skill/keyword gaps
- Suggesting new bullets (optional)
"""

import json
import requests
from typing import List, Dict, Optional
import os
from dotenv import load_dotenv

load_dotenv()

class UnifiedOptimizer:
    """
    Single-agent optimizer that handles all resume optimization in one call.
    
    This replaces multiple separate LLM calls with a single comprehensive
    optimization that does ranking, rewriting, and gap analysis simultaneously.
    """
    
    def __init__(self, model: str = "gpt-4o-mini"):
        """
        Initialize the unified optimizer.
        
        Args:
            model: OpenAI model to use (gpt-4o-mini is cheaper than gpt-4)
        """
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable is required")
        
        self.api_key = api_key
        self.model = model
    
    async def optimize_resume(
        self,
        bullets: List[str],
        job_description: str,
        mode: str = "strict",
        similarity_scores: Optional[Dict[str, float]] = None
    ) -> Dict:
        """
        Single call that does ranking + rewriting + gap analysis.
        
        Args:
            bullets: List of resume bullet points
            job_description: Target job description
            mode: "strict" (existing only) or "creative" (allow new bullets)
            similarity_scores: Pre-computed similarity scores from vector search
            
        Returns:
            Complete optimization results in structured format:
            {
                "rankings": [
                    {
                        "original": "...",
                        "rewritten": "...",
                        "relevance_score": 0.85,
                        "improvement_reasoning": "..."
                    }
                ],
                "gaps": ["skill1", "skill2"],
                "new_bullets": []  # Only if creative mode
            }
        """
        # Build comprehensive prompt
        prompt = self._build_unified_prompt(bullets, job_description, mode, similarity_scores)
        
        # Call LLM with structured output
        response = await self._call_llm(prompt)
        
        # Parse and validate response
        return self._parse_response(response, mode)
    
    def _build_unified_prompt(
        self, 
        bullets: List[str], 
        job_desc: str, 
        mode: str,
        scores: Optional[Dict[str, float]]
    ) -> str:
        """
        Build single comprehensive prompt for all optimization tasks.
        
        Creates a prompt that requests the LLM to:
        1. Rank bullets by relevance (0.0-1.0)
        2. Rewrite bullets for improvement
        3. Identify skill/keyword gaps
        4. Optionally suggest new bullets (if creative mode)
        """
        # Format bullets with numbers and similarity scores
        bullets_text = []
        for i, bullet in enumerate(bullets, 1):
            score_info = ""
            if scores and bullet in scores:
                score_info = f" (similarity: {scores[bullet]:.2f})"
            bullets_text.append(f"{i}. {bullet}{score_info}")
        
        bullets_str = "\n".join(bullets_text)
        
        # Mode-specific instructions
        mode_instructions = ""
        if mode == "creative":
            mode_instructions = """
            - Suggest 2-3 new resume bullet points that would fill identified gaps
            - Base suggestions on the job requirements and your analysis
            - Make suggestions specific and actionable
            """
        else:
            mode_instructions = """
            - Do NOT suggest new bullets (strict mode: only optimize existing ones)
            - Focus on identifying gaps for user awareness only
            """
        
        prompt = f"""You are an expert resume optimization system. Your task is to optimize resume bullet points for a specific job description.

Job Description:
{job_desc}

Resume Bullet Points:
{bullets_str}

Your tasks:
1. RANK each bullet by relevance to the job description (0.0-1.0 score)
   - 0.9-1.0: Excellent match, highly relevant
   - 0.7-0.9: Good match, relevant
   - 0.5-0.7: Moderate match, somewhat relevant
   - 0.0-0.5: Weak match, not very relevant

2. REWRITE each bullet to better match the job description
   - Add relevant keywords from the job description
   - Improve clarity and impact
   - Maintain authenticity (don't fabricate experiences)
   - Keep similar length (100-150 characters ideal)

3. IDENTIFY GAPS in the resume compared to job requirements
   - List missing skills, technologies, or experiences
   - Be specific (e.g., "Python experience" not just "programming")
   - Focus on what the job description explicitly requires

4. SUGGEST NEW BULLETS (only if creative mode):
{mode_instructions}

Respond with a JSON object in this exact format:
{{
    "rankings": [
        {{
            "original": "original bullet text",
            "rewritten": "improved bullet text",
            "relevance_score": 0.85,
            "improvement_reasoning": "brief explanation of improvements made"
        }}
    ],
    "gaps": ["missing skill 1", "missing skill 2"],
    "new_bullets": []  // Only populate if creative mode, otherwise empty array
}}

IMPORTANT: 
- Return ONLY valid JSON, no other text
- Ensure all bullets are included in rankings
- Relevance scores should be between 0.0 and 1.0
- Be honest about gaps - don't make things up"""
        
        return prompt
    
    async def _call_llm(self, prompt: str) -> str:
        """
        Call OpenAI API with structured JSON output.
        
        Uses REST API to avoid proxy issues and forces JSON output format.
        """
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        
        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "system",
                    "content": "You are a resume optimization expert. Always respond with valid JSON only, no markdown, no code blocks, just pure JSON."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "temperature": 0.7,
            "max_tokens": 3000,
            "response_format": {"type": "json_object"}  # Force JSON output
        }
        
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=60)
            response.raise_for_status()
            response_data = response.json()
            
            content = response_data["choices"][0]["message"]["content"].strip()
            
            # Remove markdown code blocks if present (sometimes LLM adds them despite instructions)
            if content.startswith("```"):
                # Remove ```json or ``` markers
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
    
    def _parse_response(self, response_text: str, mode: str) -> Dict:
        """
        Parse and validate LLM response.
        
        Args:
            response_text: Raw response from LLM
            mode: Optimization mode for validation
            
        Returns:
            Parsed and validated response dictionary
        """
        try:
            # Parse JSON
            data = json.loads(response_text)
            
            # Validate structure
            if "rankings" not in data:
                raise ValueError("Missing 'rankings' field in response")
            
            # Validate rankings structure
            for ranking in data["rankings"]:
                required_fields = ["original", "rewritten", "relevance_score"]
                for field in required_fields:
                    if field not in ranking:
                        raise ValueError(f"Missing required field '{field}' in ranking")
                
                # Validate relevance score range
                if not (0.0 <= ranking["relevance_score"] <= 1.0):
                    ranking["relevance_score"] = max(0.0, min(1.0, ranking["relevance_score"]))
            
            # Ensure gaps field exists
            if "gaps" not in data:
                data["gaps"] = []
            
            # Validate new_bullets based on mode
            if "new_bullets" not in data:
                data["new_bullets"] = []
            
            # In strict mode, new_bullets should be empty
            if mode == "strict" and data.get("new_bullets"):
                data["new_bullets"] = []
            
            return data
            
        except json.JSONDecodeError as e:
            print(f"❌ Failed to parse JSON response: {e}")
            print(f"Response text: {response_text[:500]}")
            # Return default structure
            return {
                "rankings": [],
                "gaps": [],
                "new_bullets": []
            }
        except Exception as e:
            print(f"❌ Error validating response: {e}")
            return {
                "rankings": [],
                "gaps": [],
                "new_bullets": []
            }

