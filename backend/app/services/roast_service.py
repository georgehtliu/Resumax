"""
Resume Roast Service - Brutally honest resume feedback.

Analyzes resume bullets for:
- Content quality (action verbs, metrics, specificity)
- Format consistency (dates, capitalization, punctuation)
- Grammar and spelling errors
"""

import json
import requests
from typing import List, Dict, Optional
import os
from dotenv import load_dotenv
from app.schemas.rag import StructuredResume

load_dotenv()

class RoastService:
    """
    Service for providing comprehensive, honest resume feedback.
    
    Single LLM call that analyzes all bullets for content, format, and grammar issues.
    """
    
    def __init__(self, model: str = "gpt-4o-mini"):
        """
        Initialize the roast service.
        
        Args:
            model: OpenAI model to use (gpt-4o-mini is cost-effective)
        """
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable is required")
        
        self.api_key = api_key
        self.model = model
    
    async def roast_resume(self, resume: StructuredResume) -> Dict:
        """
        Analyze resume and provide comprehensive feedback.
        
        Args:
            resume: Structured resume with all sections and bullets
            
        Returns:
            Complete roast feedback dictionary
        """
        # Count total bullets for dynamic token calculation
        total_bullets = self._count_bullets(resume)
        
        # Build comprehensive prompt
        prompt = self._build_roast_prompt(resume)
        
        # Call LLM with dynamic token limits
        response = await self._call_llm(prompt, estimated_bullets=total_bullets)
        
        # Parse and validate response
        return self._parse_response(response)
    
    def _count_bullets(self, resume: StructuredResume) -> int:
        """Count total number of bullets in resume."""
        count = 0
        if resume.experiences:
            count += sum(len(exp.bullets) for exp in resume.experiences)
        if resume.projects:
            count += sum(len(proj.bullets) for proj in resume.projects)
        if resume.education:
            count += sum(len(edu.bullets) for edu in resume.education)
        if resume.customSections:
            count += sum(len(section.bullets) for section in resume.customSections)
        return count
    
    def _format_bullets_with_context(self, resume: StructuredResume) -> str:
        """Format bullets with section context for better analysis."""
        sections = []
        
        # Experiences
        if resume.experiences:
            sections.append("=== WORK EXPERIENCES ===")
            for exp in resume.experiences:
                section_title = f"{exp.role or 'Position'} at {exp.company or 'Company'}"
                if exp.startDate and exp.endDate:
                    section_title += f" ({exp.startDate} - {exp.endDate})"
                sections.append(f"\n{section_title}:")
                for bullet in exp.bullets:
                    sections.append(f"  [{bullet.id}] {bullet.text}")
        
        # Projects
        if resume.projects:
            sections.append("\n=== PROJECTS ===")
            for proj in resume.projects:
                section_title = f"{proj.name or 'Project'}"
                if proj.technologies:
                    section_title += f" ({proj.technologies})"
                sections.append(f"\n{section_title}:")
                for bullet in proj.bullets:
                    sections.append(f"  [{bullet.id}] {bullet.text}")
        
        # Education
        if resume.education:
            sections.append("\n=== EDUCATION ===")
            for edu in resume.education:
                section_title = f"{edu.degree or ''} in {edu.field or ''} at {edu.school or 'School'}"
                if edu.startDate and edu.endDate:
                    section_title += f" ({edu.startDate} - {edu.endDate})"
                sections.append(f"\n{section_title}:")
                for bullet in edu.bullets:
                    sections.append(f"  [{bullet.id}] {bullet.text}")
        
        # Custom Sections
        if resume.customSections:
            sections.append("\n=== CUSTOM SECTIONS ===")
            for section in resume.customSections:
                section_title = f"{section.title or 'Section'}"
                if section.subtitle:
                    section_title += f" ({section.subtitle})"
                sections.append(f"\n{section_title}:")
                for bullet in section.bullets:
                    sections.append(f"  [{bullet.id}] {bullet.text}")
        
        return "\n".join(sections)
    
    def _build_roast_prompt(self, resume: StructuredResume) -> str:
        """
        Build concise, focused prompt for resume roasting.
        
        Analyzes content quality, format consistency, and grammar/spelling.
        Optimized for speed by focusing on critical issues only.
        """
        bullets_text = self._format_bullets_with_context(resume)
        
        prompt = f"""Analyze this resume and provide concise, focused feedback.

BULLETS:
{bullets_text}

IMPORTANT: Flag only the 2 MOST CRITICAL issues per bullet (max 2 to keep response concise). Priority order:
1. Grammar/spelling errors (CRITICAL - flag immediately)
2. Missing quantifiable metrics (MAJOR - if bullet has no numbers)
3. Weak action verbs like "worked on", "helped", "participated" (MAJOR)

For each bullet, provide ONLY the most impactful feedback. Skip minor suggestions. Be extremely concise in issue messages (1 sentence max per issue).

Check format consistency across ALL bullets for:
- Date formats ("Jan 2020" vs "January 2020" vs "01/2020")
- Capitalization (tech terms, company names)
- Verb tense consistency
- Punctuation consistency

Return JSON in this format:
{{
    "tldr": "2 sentence summary of overall quality and main issues",
    "overallScore": 0-10 (5=average, 7+=good),
    "totalBullets": number,
    "issuesFound": total count,
    "strengths": count of strong bullets,
    "feedback": [
        {{
            "id": "bullet-id",
            "text": "original text",
            "section": "experience|project|education|custom",
            "sectionTitle": "section name",
            "issues": [
                {{"type": "bad|grammar|format", "category": "content|format|grammar", "message": "concise issue"}}
            ]
        }}
    ],
    "generalIssues": [
        {{"type": "warning", "category": "content|format", "message": "pattern", "suggestion": "fix", "examples": []}}
    ],
    "formatIssues": [
        {{"issue": "type", "details": "what's wrong", "recommendation": "how to fix", "affectedBullets": ["id"]}}
    ]
}}

Be concise and direct. Flag only critical/major issues. Return valid JSON only."""
        
        return prompt
    
    async def _call_llm(self, prompt: str, estimated_bullets: int = 20) -> str:
        """
        Call OpenAI API with structured JSON output.
        
        Uses REST API and forces JSON output format.
        Optimized for speed with dynamic token limits.
        
        Args:
            prompt: The prompt to send to the LLM
            estimated_bullets: Number of bullets being analyzed (for dynamic token calculation)
        """
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        
        # Dynamic max_tokens: ~150 tokens per bullet for concise feedback
        # Base of 2000 tokens for structure, plus 150 per bullet
        # Cap at 6000 tokens to handle large resumes (but still reasonable)
        # For very large resumes (>50 bullets), we cap at 6000 to avoid excessive costs
        max_tokens = min(6000, max(2000, estimated_bullets * 150))
        
        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "system",
                    "content": "You are a resume reviewer. Return only valid JSON, no markdown, no code blocks."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "temperature": 0.5,  # Lower temperature for faster, more focused responses
            "max_tokens": max_tokens,
            "response_format": {"type": "json_object"}  # Force JSON output
        }
        
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=90)
            response.raise_for_status()
            response_data = response.json()
            
            content = response_data["choices"][0]["message"]["content"].strip()
            
            # Remove markdown code blocks if present (sometimes LLM adds them despite instructions)
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
            
            # Validate required top-level fields
            required_fields = ["tldr", "overallScore", "totalBullets", "issuesFound", "strengths", "feedback", "generalIssues", "formatIssues"]
            for field in required_fields:
                if field not in data:
                    print(f"⚠️ Missing field '{field}' in response, setting default")
                    if field == "tldr":
                        data[field] = "Analysis completed."
                    elif field in ["overallScore", "totalBullets", "issuesFound", "strengths"]:
                        data[field] = 0
                    else:
                        data[field] = []
            
            # Validate overallScore range
            if not (0.0 <= data["overallScore"] <= 10.0):
                data["overallScore"] = max(0.0, min(10.0, data["overallScore"]))
            
            # Validate feedback structure
            if not isinstance(data["feedback"], list):
                data["feedback"] = []
            
            # Validate generalIssues and formatIssues
            if not isinstance(data["generalIssues"], list):
                data["generalIssues"] = []
            if not isinstance(data["formatIssues"], list):
                data["formatIssues"] = []
            
            return data
            
        except json.JSONDecodeError as e:
            print(f"❌ Failed to parse JSON response: {e}")
            print(f"Response text length: {len(response_text)} chars")
            print(f"Response text (first 1000 chars): {response_text[:1000]}")
            
            # Check if response might be truncated (common error patterns)
            if "Unterminated string" in str(e) or len(response_text) > 5000:
                print(f"⚠️ Response appears truncated. This may indicate max_tokens limit was exceeded.")
                return {
                    "tldr": "The resume is too large to analyze completely. The response was truncated. Please try with fewer bullets or contact support.",
                    "overallScore": 0.0,
                    "totalBullets": 0,
                    "issuesFound": 0,
                    "strengths": 0,
                    "feedback": [],
                    "generalIssues": [{
                        "type": "error",
                        "category": "system",
                        "message": "Response was truncated due to size. Please reduce the number of bullets analyzed.",
                        "suggestion": "Try analyzing fewer sections at a time."
                    }],
                    "formatIssues": []
                }
            
            # Return default structure for other JSON errors
            return {
                "tldr": "Error parsing feedback. Please try again.",
                "overallScore": 0.0,
                "totalBullets": 0,
                "issuesFound": 0,
                "strengths": 0,
                "feedback": [],
                "generalIssues": [],
                "formatIssues": []
            }
        except Exception as e:
            print(f"❌ Error validating response: {e}")
            return {
                "tldr": "Error processing feedback. Please try again.",
                "overallScore": 0.0,
                "totalBullets": 0,
                "issuesFound": 0,
                "strengths": 0,
                "feedback": [],
                "generalIssues": [],
                "formatIssues": []
            }

