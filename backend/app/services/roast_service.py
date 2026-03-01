"""
Resume Roast Service - Brutally honest resume feedback.

Analyzes resume bullets for:
- Content quality (action verbs, metrics, specificity)
- Format consistency (dates, capitalization, punctuation)
- Grammar and spelling errors
"""

import json
import requests
import asyncio
from typing import List, Dict, Optional, Tuple
import os
from dotenv import load_dotenv
from app.schemas.rag import (
    StructuredResume, Experience, Project, Education, CustomSection
)

load_dotenv()

class RoastService:
    """
    Service for providing comprehensive, honest resume feedback.
    
    Uses chunking to process large resumes in parallel for faster analysis.
    """
    
    def __init__(self, model: str = "gpt-4o-mini", chunk_size: int = 20):
        """
        Initialize the roast service.
        
        Args:
            model: OpenAI model to use (gpt-4o-mini is cost-effective)
            chunk_size: Number of bullets per chunk for parallel processing
        """
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable is required")
        
        self.api_key = api_key
        self.model = model
        self.chunk_size = chunk_size
    
    async def roast_resume(self, resume: StructuredResume) -> Dict:
        """
        Analyze resume and provide comprehensive feedback.
        
        Uses chunking for parallel processing to speed up large resumes.
        
        Args:
            resume: Structured resume with all sections and bullets
            
        Returns:
            Complete roast feedback dictionary
        """
        # Count total bullets
        total_bullets = self._count_bullets(resume)
        
        # For small resumes, use single call (faster for small cases)
        if total_bullets <= self.chunk_size:
            prompt = self._build_roast_prompt(resume)
            response = await self._call_llm(prompt, estimated_bullets=total_bullets)
            return self._parse_response(response)
        
        # For large resumes, use chunking for parallel processing
        print(f"📦 Chunking resume with {total_bullets} bullets into parallel chunks...")
        chunks = self._chunk_resume(resume)
        print(f"   Created {len(chunks)} chunks for parallel processing")
        
        # Process chunks in parallel
        chunk_results = await asyncio.gather(*[
            self._roast_chunk(chunk, chunk_idx, len(chunks))
            for chunk_idx, chunk in enumerate(chunks)
        ])
        
        # Merge results from all chunks
        merged_result = self._merge_chunk_results(chunk_results, total_bullets)
        
        return merged_result
    
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
    
    def _chunk_resume(self, resume: StructuredResume) -> List[StructuredResume]:
        """
        Split resume into chunks for parallel processing.
        
        Tries to keep sections together when possible, but splits large sections
        across multiple chunks.
        
        Returns:
            List of StructuredResume chunks
        """
        chunks = []
        current_chunk_bullets = 0
        current_chunk = StructuredResume(
            personalInfo=resume.personalInfo,
            skills=resume.skills,
            experiences=[],
            education=[],
            projects=[],
            customSections=[]
        )
        
        # Process experiences
        for exp in resume.experiences:
            if len(exp.bullets) == 0:
                continue
                
            # If adding this experience would exceed chunk size, start new chunk
            if current_chunk_bullets > 0 and current_chunk_bullets + len(exp.bullets) > self.chunk_size:
                chunks.append(current_chunk)
                current_chunk = StructuredResume(
                    personalInfo=None,
                    skills=[],
                    experiences=[],
                    education=[],
                    projects=[],
                    customSections=[]
                )
                current_chunk_bullets = 0
            
            # If single experience is larger than chunk size, split it
            if len(exp.bullets) > self.chunk_size:
                # Split this experience across chunks
                for i in range(0, len(exp.bullets), self.chunk_size):
                    exp_chunk = Experience(
                        id=exp.id,
                        company=exp.company,
                        role=exp.role,
                        location=exp.location,
                        startDate=exp.startDate,
                        endDate=exp.endDate,
                        bullets=exp.bullets[i:i + self.chunk_size]
                    )
                    if current_chunk_bullets == 0:
                        current_chunk.experiences.append(exp_chunk)
                        current_chunk_bullets = len(exp_chunk.bullets)
                    else:
                        chunks.append(current_chunk)
                        current_chunk = StructuredResume(
                            personalInfo=None,
                            skills=[],
                            experiences=[exp_chunk],
                            education=[],
                            projects=[],
                            customSections=[]
                        )
                        current_chunk_bullets = len(exp_chunk.bullets)
            else:
                current_chunk.experiences.append(exp)
                current_chunk_bullets += len(exp.bullets)
        
        # Process projects
        for proj in resume.projects:
            if len(proj.bullets) == 0:
                continue
                
            if current_chunk_bullets > 0 and current_chunk_bullets + len(proj.bullets) > self.chunk_size:
                chunks.append(current_chunk)
                current_chunk = StructuredResume(
                    personalInfo=None,
                    skills=[],
                    experiences=[],
                    education=[],
                    projects=[],
                    customSections=[]
                )
                current_chunk_bullets = 0
            
            if len(proj.bullets) > self.chunk_size:
                for i in range(0, len(proj.bullets), self.chunk_size):
                    proj_chunk = Project(
                        id=proj.id,
                        name=proj.name,
                        description=proj.description,
                        technologies=proj.technologies,
                        url=proj.url,
                        startDate=proj.startDate,
                        endDate=proj.endDate,
                        bullets=proj.bullets[i:i + self.chunk_size]
                    )
                    if current_chunk_bullets == 0:
                        current_chunk.projects.append(proj_chunk)
                        current_chunk_bullets = len(proj_chunk.bullets)
                    else:
                        chunks.append(current_chunk)
                        current_chunk = StructuredResume(
                            personalInfo=None,
                            skills=[],
                            experiences=[],
                            education=[],
                            projects=[proj_chunk],
                            customSections=[]
                        )
                        current_chunk_bullets = len(proj_chunk.bullets)
            else:
                current_chunk.projects.append(proj)
                current_chunk_bullets += len(proj.bullets)
        
        # Process education
        for edu in resume.education:
            if len(edu.bullets) == 0:
                continue
                
            if current_chunk_bullets > 0 and current_chunk_bullets + len(edu.bullets) > self.chunk_size:
                chunks.append(current_chunk)
                current_chunk = StructuredResume(
                    personalInfo=None,
                    skills=[],
                    experiences=[],
                    education=[],
                    projects=[],
                    customSections=[]
                )
                current_chunk_bullets = 0
            
            if len(edu.bullets) > self.chunk_size:
                for i in range(0, len(edu.bullets), self.chunk_size):
                    edu_chunk = Education(
                        id=edu.id,
                        school=edu.school,
                        degree=edu.degree,
                        field=edu.field,
                        startDate=edu.startDate,
                        endDate=edu.endDate,
                        bullets=edu.bullets[i:i + self.chunk_size]
                    )
                    if current_chunk_bullets == 0:
                        current_chunk.education.append(edu_chunk)
                        current_chunk_bullets = len(edu_chunk.bullets)
                    else:
                        chunks.append(current_chunk)
                        current_chunk = StructuredResume(
                            personalInfo=None,
                            skills=[],
                            experiences=[],
                            education=[edu_chunk],
                            projects=[],
                            customSections=[]
                        )
                        current_chunk_bullets = len(edu_chunk.bullets)
            else:
                current_chunk.education.append(edu)
                current_chunk_bullets += len(edu.bullets)
        
        # Process custom sections
        for section in resume.customSections:
            if len(section.bullets) == 0:
                continue
                
            if current_chunk_bullets > 0 and current_chunk_bullets + len(section.bullets) > self.chunk_size:
                chunks.append(current_chunk)
                current_chunk = StructuredResume(
                    personalInfo=None,
                    skills=[],
                    experiences=[],
                    education=[],
                    projects=[],
                    customSections=[]
                )
                current_chunk_bullets = 0
            
            if len(section.bullets) > self.chunk_size:
                for i in range(0, len(section.bullets), self.chunk_size):
                    section_chunk = CustomSection(
                        id=section.id,
                        title=section.title,
                        subtitle=section.subtitle,
                        bullets=section.bullets[i:i + self.chunk_size]
                    )
                    if current_chunk_bullets == 0:
                        current_chunk.customSections.append(section_chunk)
                        current_chunk_bullets = len(section_chunk.bullets)
                    else:
                        chunks.append(current_chunk)
                        current_chunk = StructuredResume(
                            personalInfo=None,
                            skills=[],
                            experiences=[],
                            education=[],
                            projects=[],
                            customSections=[section_chunk]
                        )
                        current_chunk_bullets = len(section_chunk.bullets)
            else:
                current_chunk.customSections.append(section)
                current_chunk_bullets += len(section.bullets)
        
        # Add final chunk if it has content
        if current_chunk_bullets > 0:
            chunks.append(current_chunk)
        
        return chunks
    
    async def _roast_chunk(self, chunk: StructuredResume, chunk_idx: int, total_chunks: int) -> Dict:
        """
        Process a single chunk of the resume.
        
        Args:
            chunk: Resume chunk to process
            chunk_idx: Index of this chunk (0-based)
            total_chunks: Total number of chunks
            
        Returns:
            Roast feedback for this chunk
        """
        chunk_bullets = self._count_bullets(chunk)
        print(f"   Processing chunk {chunk_idx + 1}/{total_chunks} ({chunk_bullets} bullets)...")
        
        prompt = self._build_roast_prompt(chunk)
        response = await self._call_llm(prompt, estimated_bullets=chunk_bullets)
        result = self._parse_response(response)
        
        # Add chunk metadata
        result["chunk_idx"] = chunk_idx
        result["chunk_bullets"] = chunk_bullets
        
        return result
    
    def _merge_chunk_results(self, chunk_results: List[Dict], total_bullets: int) -> Dict:
        """
        Merge results from multiple chunks into a single response.
        
        Args:
            chunk_results: List of roast results from each chunk
            total_bullets: Total number of bullets across all chunks
            
        Returns:
            Merged roast feedback dictionary
        """
        # Aggregate metrics
        total_issues = sum(r.get("issuesFound", 0) for r in chunk_results)
        total_strengths = sum(r.get("strengths", 0) for r in chunk_results)
        
        # Calculate weighted average score
        scores = []
        bullet_counts = []
        for r in chunk_results:
            score = r.get("overallScore", 0)
            bullets = r.get("totalBullets", 0)
            if bullets > 0:
                scores.append(score)
                bullet_counts.append(bullets)
        
        if scores:
            # Weighted average by bullet count
            weighted_score = sum(s * b for s, b in zip(scores, bullet_counts)) / sum(bullet_counts)
        else:
            weighted_score = 0.0
        
        # Combine all feedback
        all_feedback = []
        for r in chunk_results:
            all_feedback.extend(r.get("feedback", []))
        
        # Combine general issues (deduplicate similar ones)
        all_general_issues = []
        seen_general_issues = set()
        for r in chunk_results:
            for issue in r.get("generalIssues", []):
                issue_key = f"{issue.get('category', '')}:{issue.get('message', '')}"
                if issue_key not in seen_general_issues:
                    all_general_issues.append(issue)
                    seen_general_issues.add(issue_key)
        
        # Combine format issues (merge affected bullets)
        format_issues_map = {}
        for r in chunk_results:
            for issue in r.get("formatIssues", []):
                issue_type = issue.get("issue", "unknown")
                if issue_type not in format_issues_map:
                    format_issues_map[issue_type] = {
                        "issue": issue_type,
                        "details": issue.get("details", ""),
                        "recommendation": issue.get("recommendation", ""),
                        "affectedBullets": []
                    }
                format_issues_map[issue_type]["affectedBullets"].extend(
                    issue.get("affectedBullets", [])
                )
        
        # Combine TLDR summaries
        tldr_parts = [r.get("tldr", "") for r in chunk_results if r.get("tldr")]
        combined_tldr = " ".join(tldr_parts[:2])  # Use first 2 summaries to keep it concise
        
        return {
            "tldr": combined_tldr or f"Analyzed {total_bullets} bullets across {len(chunk_results)} sections.",
            "overallScore": round(weighted_score, 1),
            "totalBullets": total_bullets,
            "issuesFound": total_issues,
            "strengths": total_strengths,
            "feedback": all_feedback,
            "generalIssues": all_general_issues,
            "formatIssues": list(format_issues_map.values())
        }
    
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
                {{
                    "type": "good|bad|improvement|suggestion|format|grammar",
                    "category": "content|format|grammar",
                    "message": "concise issue"
                }}
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

CRITICAL: For issue "type" field, you MUST use ONLY one of these exact values:
- "good" - for well-written bullets with no issues
- "bad" - for bullets with content problems (missing metrics, weak verbs, vague language)
- "improvement" - for bullets that need improvement but aren't terrible
- "suggestion" - for optional improvements
- "format" - for formatting inconsistencies
- "grammar" - for grammar/spelling errors

DO NOT create custom types like "missing metrics" - use "bad" or "improvement" instead.

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
    
    def _normalize_issue_type(self, issue_type: str) -> str:
        """
        Normalize invalid issue types to valid schema types.
        
        Args:
            issue_type: The issue type from LLM (may be invalid)
            
        Returns:
            Valid issue type: "good", "bad", "improvement", "suggestion", "format", or "grammar"
        """
        issue_type_lower = issue_type.lower()
        
        # Map common invalid types to valid ones
        type_mapping = {
            # Missing metrics -> bad (content issue)
            "missing metrics": "bad",
            "no metrics": "bad",
            "missing numbers": "bad",
            "no quantifiable": "bad",
            
            # Weak verbs -> bad or improvement
            "weak verb": "bad",
            "weak action verb": "bad",
            "passive verb": "improvement",
            
            # Grammar/spelling -> grammar
            "spelling": "grammar",
            "spelling error": "grammar",
            "typo": "grammar",
            "grammar error": "grammar",
            
            # Format issues -> format
            "formatting": "format",
            "format issue": "format",
            "inconsistent": "format",
            "inconsistency": "format",
            
            # Vague language -> bad
            "vague": "bad",
            "unclear": "bad",
            "too generic": "bad",
        }
        
        # Check exact match first
        if issue_type_lower in type_mapping:
            return type_mapping[issue_type_lower]
        
        # Check if any key phrase matches
        for key, value in type_mapping.items():
            if key in issue_type_lower:
                return value
        
        # Default to "bad" for unknown types (safest fallback)
        return "bad"
    
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
            
            # Normalize issue types in feedback (fix invalid types from LLM)
            valid_issue_types = {"good", "bad", "improvement", "suggestion", "format", "grammar"}
            for feedback_item in data["feedback"]:
                if isinstance(feedback_item, dict) and "issues" in feedback_item:
                    for issue in feedback_item.get("issues", []):
                        if isinstance(issue, dict) and "type" in issue:
                            issue_type = issue["type"]
                            if issue_type not in valid_issue_types:
                                # Map invalid types to valid ones
                                normalized_type = self._normalize_issue_type(issue_type)
                                print(f"⚠️ Normalized invalid issue type '{issue_type}' to '{normalized_type}'")
                                issue["type"] = normalized_type
            
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

