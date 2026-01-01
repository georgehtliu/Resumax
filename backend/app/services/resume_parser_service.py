"""
Resume Parser Service for extracting structured data from resume files.

This service handles parsing of PDF, DOCX, and TXT files using gpt-4o-mini
to extract structured resume data matching the StructuredResume schema.
Fast, reliable, and works with all resume formats.
"""

import os
import re
import uuid
import time
import json
import requests
from typing import Optional, Dict, List
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

try:
    import pdfplumber
    PDFPLUMBER_AVAILABLE = True
except ImportError:
    PDFPLUMBER_AVAILABLE = False

try:
    from docx import Document
    DOCX_AVAILABLE = True
except ImportError:
    DOCX_AVAILABLE = False


class ResumeParserService:
    """
    Service for parsing resume files and extracting structured data.
    
    Supports PDF, DOCX, and TXT formats. Uses gpt-4o-mini to extract structured
    data from extracted text - reliable and works with all resume formats.
    """
    
    def __init__(self):
        """Initialize the resume parser service."""
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable is required")
        self.api_key = api_key
        self.model = "gpt-4o-mini"  # Fast, cheap model for parsing
    
    async def parse_resume(self, file_data: bytes, file_type: str, filename: str = "") -> Dict:
        """
        Parse a resume file and extract structured data.
        
        Args:
            file_data: Raw file bytes
            file_type: MIME type (application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document, text/plain)
            filename: Original filename (for logging)
            
        Returns:
            Dictionary matching ParseResumeResponse schema
        """
        start_time = time.time()
        errors = []
        warnings = []
        raw_text = None
        
        try:
            # Step 1: Extract text from file
            print(f"📄 Extracting text from {file_type} file...")
            raw_text = await self._extract_text(file_data, file_type)
            
            if not raw_text or len(raw_text.strip()) < 50:
                return {
                    "success": False,
                    "resume": None,
                    "raw_text": raw_text,
                    "warnings": warnings,
                    "errors": ["Could not extract sufficient text from resume. File may be corrupted, image-based, or encrypted."],
                    "extraction_quality": "failed",
                    "extracted_sections": {},
                    "processing_time": time.time() - start_time,
                    "created_at": datetime.now()
                }
            
            print(f"✅ Extracted {len(raw_text)} characters of text")
            
            # Step 2: Extract structured data using LLM
            try:
                print("🤖 Extracting structured data with gpt-4o-mini...")
                structured_resume = await self._extract_with_llm(raw_text)
                extracted_sections = self._check_extracted_sections(structured_resume)
                
                # Check if extraction is meaningful
                if self._is_minimal_extraction(structured_resume):
                    warnings.append("Resume parsed but very little information was extracted. Please review and add details manually.")
                    return {
                        "success": True,
                        "resume": structured_resume,
                        "raw_text": raw_text,
                        "warnings": warnings,
                        "errors": [],
                        "extraction_quality": "minimal",
                        "extracted_sections": extracted_sections,
                        "processing_time": time.time() - start_time,
                        "created_at": time.time()
                    }
                
                # Check if all sections were extracted
                all_sections = all(extracted_sections.values())
                quality = "complete" if all_sections else "partial"
                
                if not all_sections:
                    missing = [k for k, v in extracted_sections.items() if not v]
                    warnings.append(f"Some sections were not found: {', '.join(missing)}. You can add them manually.")
                
                return {
                    "success": True,
                    "resume": structured_resume,
                    "raw_text": raw_text,
                    "warnings": warnings,
                    "errors": [],
                    "extraction_quality": quality,
                    "extracted_sections": extracted_sections,
                    "processing_time": time.time() - start_time,
                    "created_at": time.time()
                }
                
            except Exception as llm_error:
                # LLM failed, but we have text
                error_msg = str(llm_error)
                warnings.append(f"Could not automatically structure resume: {error_msg}")
                errors.append("Automatic structuring failed. Please review the extracted text and enter manually.")
                return {
                    "success": False,
                    "resume": None,
                    "raw_text": raw_text,
                    "warnings": warnings,
                    "errors": errors,
                    "extraction_quality": "failed",
                    "extracted_sections": {},
                    "processing_time": time.time() - start_time,
                    "created_at": datetime.now()
                }
                
        except Exception as e:
            # Complete failure
            error_msg = str(e)
            print(f"❌ Resume parsing failed: {error_msg}")
            return {
                "success": False,
                "resume": None,
                "raw_text": raw_text,
                "warnings": warnings,
                "errors": [f"Failed to parse resume: {error_msg}"],
                "extraction_quality": "failed",
                "extracted_sections": {},
                "processing_time": time.time() - start_time,
                "created_at": time.time()
            }
    
    async def _extract_text(self, file_data: bytes, file_type: str) -> str:
        """
        Extract text from file based on type.
        
        Args:
            file_data: Raw file bytes
            file_type: MIME type
            
        Returns:
            Extracted text string
        """
        if file_type == "application/pdf":
            return await self._extract_from_pdf(file_data)
        elif file_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document" or file_type == "application/msword":
            return await self._extract_from_docx(file_data)
        elif file_type == "text/plain":
            return file_data.decode('utf-8', errors='ignore')
        else:
            raise ValueError(f"Unsupported file type: {file_type}")
    
    async def _extract_from_pdf(self, file_data: bytes) -> str:
        """Extract text from PDF file."""
        if not PDFPLUMBER_AVAILABLE:
            raise ImportError("pdfplumber is not installed. Install it with: pip install pdfplumber")
        
        try:
            import io
            pdf_file = io.BytesIO(file_data)
            text_parts = []
            
            with pdfplumber.open(pdf_file) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text_parts.append(page_text)
            
            return "\n\n".join(text_parts)
        except Exception as e:
            raise Exception(f"Failed to extract text from PDF: {str(e)}")
    
    async def _extract_from_docx(self, file_data: bytes) -> str:
        """Extract text from DOCX file."""
        if not DOCX_AVAILABLE:
            raise ImportError("python-docx is not installed. Install it with: pip install python-docx")
        
        try:
            import io
            docx_file = io.BytesIO(file_data)
            doc = Document(docx_file)
            
            text_parts = []
            for paragraph in doc.paragraphs:
                if paragraph.text.strip():
                    text_parts.append(paragraph.text)
            
            return "\n\n".join(text_parts)
        except Exception as e:
            raise Exception(f"Failed to extract text from DOCX: {str(e)}")
    
    async def _extract_with_llm(self, raw_text: str) -> Dict:
        """
        Extract structured resume data using gpt-4o-mini.
        Simple, reliable approach that works for all resume formats.
        
        Args:
            raw_text: Extracted text from resume file
            
        Returns:
            Dictionary matching StructuredResume schema
        """
        if not self.api_key:
            raise ValueError("OPENAI_API_KEY is required for resume parsing")
        
        # Use full text but limit to reasonable size for cost/speed
        # Most resumes are 2000-5000 chars, so 8000 is a good limit
        text_sample = raw_text[:8000]
        
        prompt = f"""Extract structured resume information from the following resume text.
Return a JSON object matching this exact structure:

{{
    "personalInfo": {{
        "firstName": "string or null",
        "lastName": "string or null",
        "email": "string or null",
        "phone": "string or null",
        "linkedin": "string or null",
        "github": "string or null"
    }},
    "skills": [
        {{
            "id": "unique-id",
            "title": "group title (e.g., 'Programming Languages', 'Frameworks')",
            "skills": ["skill1", "skill2", ...]
        }}
    ],
    "experiences": [
        {{
            "id": "unique-id",
            "company": "company name",
            "role": "job title",
            "location": "location or null",
            "startDate": "date string or null",
            "endDate": "date string or null",
            "bullets": [
                {{
                    "id": "unique-id",
                    "text": "bullet point text"
                }}
            ]
        }}
    ],
    "education": [
        {{
            "id": "unique-id",
            "school": "school name",
            "degree": "degree type (e.g., 'Bachelor of Science')",
            "field": "field of study",
            "startDate": "date string or null",
            "endDate": "date string or null",
            "bullets": [
                {{
                    "id": "unique-id",
                    "text": "bullet point text"
                }}
            ]
        }}
    ],
    "projects": [
        {{
            "id": "unique-id",
            "name": "project name",
            "description": "description or null",
            "technologies": "technologies used or null",
            "startDate": "date string or null",
            "endDate": "date string or null",
            "bullets": [
                {{
                    "id": "unique-id",
                    "text": "bullet point text"
                }}
            ]
        }}
    ],
    "customSections": []
}}

Resume Text:
{text_sample}

Instructions:
- Extract all available information accurately
- Generate unique IDs for all items (use UUIDs or simple unique strings)
- If information is missing, use null
- Group skills logically (Languages, Frameworks, Tools, etc.)
- Preserve bullet points exactly as written
- Dates can be in any format found in the resume
- Return ONLY valid JSON, no markdown, no code blocks"""

        try:
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
                        "content": "You are a resume parsing expert. Always respond with valid JSON only, no markdown, no code blocks, just pure JSON."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                "temperature": 0.3,  # Lower temperature for more accurate extraction
                "max_tokens": 4000,  # Enough for comprehensive resumes
                "response_format": {"type": "json_object"}
            }
            
            response = requests.post(url, headers=headers, json=payload, timeout=30)
            response.raise_for_status()
            response_data = response.json()
            
            content = response_data["choices"][0]["message"]["content"].strip()
            
            # Remove markdown code blocks if present
            if content.startswith("```"):
                lines = content.split("\n")
                content = "\n".join([line for line in lines if not line.strip().startswith("```")])
            
            parsed_data = json.loads(content)
            
            # Normalize the data
            return self._normalize_resume_data(parsed_data)
            
        except json.JSONDecodeError as e:
            print(f"❌ JSON parsing error: {e}")
            print(f"Raw response: {content[:500]}")
            raise Exception(f"Failed to parse LLM response as JSON: {str(e)}")
        except requests.exceptions.RequestException as e:
            print(f"❌ API request failed: {e}")
            raise Exception(f"LLM API request failed: {str(e)}")
        except Exception as e:
            print(f"❌ Unexpected error in LLM extraction: {e}")
            raise
    
    # Legacy rule-based methods kept for reference but not used in main flow
    # (Removed to simplify code - using pure LLM approach)
        """
        Calculate confidence score (0-1) for rule-based extraction.
        
        Args:
            result: Parsed resume data
            raw_text: Original text
            
        Returns:
            Confidence score between 0.0 and 1.0
        """
        score = 0.0
        max_score = 0.0
        
        # Personal info (20% weight)
        max_score += 0.2
        personal_info = result.get("personalInfo", {})
        if personal_info.get("email"):
            score += 0.1
        if personal_info.get("phone"):
            score += 0.05
        if personal_info.get("firstName") or personal_info.get("lastName"):
            score += 0.05
        
        # Experiences (40% weight) - most important
        max_score += 0.4
        experiences = result.get("experiences", [])
        if len(experiences) > 0:
            score += 0.2
            # Check if experiences have bullets (indicates good parsing)
            has_bullets = any(len(exp.get("bullets", [])) > 0 for exp in experiences)
            if has_bullets:
                score += 0.2
            # Check if experiences have company/role (indicates structure)
            has_structure = any(exp.get("company") or exp.get("role") for exp in experiences)
            if has_structure:
                score += 0.1
        
        # Education (20% weight)
        max_score += 0.2
        education = result.get("education", [])
        if len(education) > 0:
            score += 0.2
        
        # Skills (20% weight)
        max_score += 0.2
        skills = result.get("skills", [])
        if len(skills) > 0:
            score += 0.2
        
        return min(1.0, score / max_score) if max_score > 0 else 0.0
    
    def _extract_personal_info(self, text: str) -> Dict:
        """Extract personal information from resume header."""
        info = {}
        
        # Email
        email_match = re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text)
        if email_match:
            info["email"] = email_match.group(0)
        
        # Phone (various formats)
        phone_patterns = [
            r'\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}',  # US format
            r'\+?\d{1,3}[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}',  # International
        ]
        for pattern in phone_patterns:
            phone_match = re.search(pattern, text[:500])  # Check first 500 chars
            if phone_match:
                info["phone"] = phone_match.group(0).strip()
                break
        
        # LinkedIn
        linkedin_match = re.search(r'(?:linkedin\.com/in/|linkedin\.com/pub/)([a-zA-Z0-9-]+)', text, re.IGNORECASE)
        if linkedin_match:
            info["linkedin"] = f"linkedin.com/in/{linkedin_match.group(1)}"
        
        # GitHub
        github_match = re.search(r'(?:github\.com/)([a-zA-Z0-9-]+)', text, re.IGNORECASE)
        if github_match:
            info["github"] = f"github.com/{github_match.group(1)}"
        
        # Name (usually first two words in first line, if capitalized)
        first_lines = text.split('\n')[:3]
        for line in first_lines:
            words = line.strip().split()
            if len(words) >= 2 and words[0][0].isupper() and words[1][0].isupper():
                # Check if it's not a section header
                if not any(keyword in line.lower() for keyword in ['experience', 'education', 'skills', 'summary']):
                    info["firstName"] = words[0]
                    info["lastName"] = words[1]
                    break
        
        return info
    
    def _detect_sections(self, lines: List[str]) -> Dict[str, int]:
        """Detect section headers and return their line indices."""
        return self._detect_sections_improved(lines)
    
    def _detect_sections_improved(self, lines: List[str]) -> Dict[str, int]:
        """
        Improved section detection with multiple strategies.
        
        Args:
            lines: List of text lines from resume
            
        Returns:
            Dictionary mapping section names to line indices
        """
        section_keywords = {
            'experience': ['experience', 'work experience', 'employment', 'work history', 
                          'professional experience', 'career', 'positions'],
            'education': ['education', 'academic', 'university', 'college', 'degree', 
                         'schooling', 'qualifications'],
            'projects': ['projects', 'project', 'portfolio', 'side projects', 'personal projects'],
            'skills': ['skills', 'technical skills', 'technologies', 'competencies', 
                      'expertise', 'proficiencies', 'tools'],
            'summary': ['summary', 'objective', 'profile', 'about'],
        }
        
        section_indices = {}
        
        for i, line in enumerate(lines):
            line_clean = re.sub(r'^[-•\s:#]+', '', line.lower().strip())
            
            # Strategy 1: Exact keyword match
            for section, keywords in section_keywords.items():
                if any(keyword == line_clean for keyword in keywords):
                    section_indices[section] = i
                    break
            
            # Strategy 2: Keyword in line (if short enough to be a header)
            if len(line_clean) < 50:
                for section, keywords in section_keywords.items():
                    if any(keyword in line_clean for keyword in keywords):
                        # Check if it looks like a header (all caps, title case, or standalone)
                        if (line.strip().isupper() or 
                            line.strip().istitle() or
                            (i > 0 and lines[i-1].strip() == '')):  # Preceded by blank line
                            section_indices[section] = i
                            break
        
        return section_indices
    
    def _extract_experiences_improved(self, lines: List[str], section_indices: Dict[str, int]) -> List[Dict]:
        """
        Improved experience extraction with better pattern matching.
        
        Args:
            lines: List of text lines
            section_indices: Dictionary of section line indices
            
        Returns:
            List of experience dictionaries
        """
        experiences = []
        start_idx = section_indices.get('experience', 0)
        end_idx = len(lines)
        
        for section, idx in section_indices.items():
            if section != 'experience' and idx > start_idx:
                end_idx = min(end_idx, idx)
        
        exp_lines = lines[start_idx:end_idx]
        current_exp = None
        bullets = []
        i = 0
        
        while i < len(exp_lines):
            line = exp_lines[i]
            
            # Skip section header
            if i == 0 and 'experience' in line.lower():
                i += 1
                continue
            
            # Check if this is a new experience entry
            is_new_exp = self._is_experience_header(line)
            
            if is_new_exp:
                # Save previous
                if current_exp and (current_exp.get("company") or current_exp.get("role")):
                    current_exp["bullets"] = bullets
                    experiences.append(current_exp)
                
                # Parse the line
                current_exp = self._parse_experience_line(line)
                bullets = []
            elif current_exp:
                # Check if it's a continuation line (location, dates, etc.)
                if not current_exp.get("location") and self._is_location(line):
                    current_exp["location"] = line.strip()
                elif not current_exp.get("startDate") and re.search(r'\d{4}', line):
                    dates = self._extract_dates(line)
                    if dates:
                        current_exp["startDate"] = dates[0]
                        if len(dates) > 1:
                            current_exp["endDate"] = dates[1]
                else:
                    # Bullet point
                    bullet = self._extract_bullet(line)
                    if bullet:
                        bullets.append(bullet)
            
            i += 1
        
        # Add last experience
        if current_exp and (current_exp.get("company") or current_exp.get("role")):
            current_exp["bullets"] = bullets
            experiences.append(current_exp)
        
        return experiences
    
    def _extract_experiences(self, lines: List[str], section_indices: Dict[str, int]) -> List[Dict]:
        """Legacy method - redirects to improved version."""
        return self._extract_experiences_improved(lines, section_indices)
    
    def _is_experience_header(self, line: str) -> bool:
        """Check if a line looks like an experience header."""
        # Pattern 1: Date range at start or end of line
        date_pattern = r'(\w+\s+\d{4}|\d{1,2}/\d{4}|\d{4})\s*[-–—]\s*(Present|Current|Now|\w+\s+\d{4}|\d{1,2}/\d{4}|\d{4})'
        if re.search(date_pattern, line):
            return True
        
        # Pattern 2: Company name (capitalized, possibly with Inc/LLC/etc)
        company_pattern = r'^([A-Z][A-Za-z0-9\s&.,-]+(?:Inc|LLC|Corp|Ltd|Company|Co\.|Technologies|Systems|Solutions)?)'
        if re.match(company_pattern, line) and len(line) < 100:
            return True
        
        # Pattern 3: Job title keywords
        title_keywords = ['engineer', 'developer', 'manager', 'analyst', 'intern', 
                         'associate', 'director', 'lead', 'senior', 'junior', 
                         'architect', 'consultant', 'specialist', 'coordinator']
        if any(keyword in line.lower() for keyword in title_keywords) and len(line) < 80:
            return True
        
        return False
    
    def _parse_experience_line(self, line: str) -> Dict:
        """Parse a single experience header line."""
        exp = {
            "id": f"exp-{uuid.uuid4().hex[:8]}",
            "company": "",
            "role": "",
            "location": None,
            "startDate": None,
            "endDate": None,
            "bullets": []
        }
        
        # Try different separators
        separators = [' | ', ' - ', ' – ', ' — ', ' |', ' -', ' at ', ' @ ']
        parts = [line]
        
        for sep in separators:
            if sep in line:
                parts = line.split(sep)
                break
        
        # Extract dates first
        dates = self._extract_dates(line)
        if dates:
            exp["startDate"] = dates[0]
            if len(dates) > 1:
                exp["endDate"] = dates[1]
        
        # Remove dates from parts for easier parsing
        for i, part in enumerate(parts):
            parts[i] = re.sub(r'\w+\s+\d{4}.*', '', part).strip()
        
        # Identify company, role, location
        for part in parts:
            part = part.strip()
            if not part:
                continue
            
            if self._is_location(part):
                exp["location"] = part
            elif self._is_job_title(part):
                if not exp["role"]:
                    exp["role"] = part
            else:
                if not exp["company"]:
                    exp["company"] = part
                elif not exp["role"]:
                    exp["role"] = part
        
        return exp
    
    def _is_location(self, text: str) -> bool:
        """Check if text looks like a location."""
        location_indicators = [
            r'\b(CA|NY|TX|WA|FL|IL|MA|ON|BC|UK|USA|US)\b',  # States/provinces
            r'\b(Remote|Hybrid|On-site)\b',
            r',\s*[A-Z]{2}\s*\d{5}',  # City, ST ZIP
            r'\b(San Francisco|New York|Los Angeles|Toronto|Vancouver|London)\b'
        ]
        return any(re.search(pattern, text, re.IGNORECASE) for pattern in location_indicators)
    
    def _is_job_title(self, text: str) -> bool:
        """Check if text looks like a job title."""
        title_patterns = [
            r'\b(Engineer|Developer|Manager|Analyst|Intern|Associate|Director|Lead|Senior|Junior|Architect)\b',
            r'\b(Software|Senior|Junior|Lead|Principal)\s+\w+',
        ]
        return any(re.search(pattern, text, re.IGNORECASE) for pattern in title_patterns)
    
    def _extract_dates(self, text: str) -> List[str]:
        """Extract date ranges from text."""
        # Pattern: "Jan 2020 - Dec 2022" or "2020-2022" or "01/2020 - 12/2022"
        patterns = [
            r'(\w+\s+\d{4})\s*[-–—]\s*(Present|Current|Now|\w+\s+\d{4})',
            r'(\d{4})\s*[-–—]\s*(Present|Current|Now|\d{4})',
            r'(\d{1,2}/\d{4})\s*[-–—]\s*(Present|Current|Now|\d{1,2}/\d{4})',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                end_date = match.group(2)
                if end_date not in ['Present', 'Current', 'Now']:
                    return [match.group(1), end_date]
                else:
                    return [match.group(1), 'Present']
        
        return []
    
    def _extract_bullet(self, line: str) -> Optional[Dict]:
        """Extract a bullet point from a line."""
        # Bullet indicators: •, -, *, or indented
        bullet_match = re.match(r'^[•\-\*]\s*(.+)', line)
        if bullet_match:
            return {
                "id": f"bullet-{uuid.uuid4().hex[:8]}",
                "text": bullet_match.group(1).strip()
            }
        elif line.startswith('  ') or line.startswith('\t'):
            # Indented line = bullet
            return {
                "id": f"bullet-{uuid.uuid4().hex[:8]}",
                "text": line.strip()
            }
        return None
        """Extract work experiences."""
        experiences = []
        start_idx = section_indices.get('experience', 0)
        
        # Find end of experience section
        end_idx = len(lines)
        for section, idx in section_indices.items():
            if section != 'experience' and idx > start_idx:
                end_idx = min(end_idx, idx)
        
        exp_lines = lines[start_idx:end_idx]
        
        # Pattern: Company | Role | Location | Dates
        # Or: Role at Company | Location | Dates
        current_exp = None
        bullets = []
        
        for i, line in enumerate(exp_lines):
            # Skip section header
            if i == 0 and 'experience' in line.lower():
                continue
            
            # Check if this is a new experience entry
            # Look for date patterns or company name patterns
            date_match = re.search(r'(\d{4}|\w+\s+\d{4}|\w+\s+\d{4}\s*[-–—]\s*(?:Present|Current|\d{4}|\w+\s+\d{4}))', line)
            company_pattern = r'^[A-Z][A-Za-z0-9\s&.,-]+(?:Inc|LLC|Corp|Ltd|Company|Co\.)?'
            
            if date_match or re.match(company_pattern, line):
                # Save previous experience if exists
                if current_exp:
                    current_exp["bullets"] = bullets
                    experiences.append(current_exp)
                
                # Start new experience
                parts = re.split(r'\s*[-–—|]\s*', line)
                current_exp = {
                    "id": f"exp-{uuid.uuid4().hex[:8]}",
                    "company": "",
                    "role": "",
                    "location": None,
                    "startDate": None,
                    "endDate": None,
                    "bullets": []
                }
                bullets = []
                
                # Parse company/role/location/dates
                if len(parts) >= 2:
                    # Try to identify which is which
                    for part in parts:
                        part = part.strip()
                        if not part:
                            continue
                        
                        # Check if it's a date
                        date_match = re.search(r'(\w+\s+\d{4}|\d{4})\s*[-–—]\s*(Present|Current|\w+\s+\d{4}|\d{4})?', part)
                        if date_match:
                            dates = re.split(r'[-–—]', date_match.group(0))
                            if len(dates) >= 1:
                                current_exp["startDate"] = dates[0].strip()
                            if len(dates) >= 2:
                                current_exp["endDate"] = dates[1].strip() if dates[1].strip() else "Present"
                        # Check if it's a location (contains common location words)
                        elif any(word in part.lower() for word in ['ca', 'ny', 'tx', 'wa', 'on', 'bc', 'uk', 'usa', 'remote']):
                            current_exp["location"] = part
                        # Check if it's a role (contains job title keywords)
                        elif any(word in part.lower() for word in ['engineer', 'developer', 'manager', 'analyst', 'intern', 'associate', 'director', 'lead', 'senior', 'junior']):
                            if not current_exp["role"]:
                                current_exp["role"] = part
                            else:
                                current_exp["company"] = part
                        else:
                            # Likely company name
                            if not current_exp["company"]:
                                current_exp["company"] = part
                            elif not current_exp["role"]:
                                current_exp["role"] = part
            
            elif current_exp:
                # This is likely a bullet point
                # Bullet indicators: •, -, *, or indented
                bullet_match = re.match(r'^[•\-\*]\s*(.+)', line)
                if bullet_match:
                    bullets.append({
                        "id": f"bullet-{uuid.uuid4().hex[:8]}",
                        "text": bullet_match.group(1).strip()
                    })
                elif line.startswith('  ') or line.startswith('\t'):
                    # Indented line = bullet
                    bullets.append({
                        "id": f"bullet-{uuid.uuid4().hex[:8]}",
                        "text": line.strip()
                    })
        
        # Add last experience
        if current_exp:
            current_exp["bullets"] = bullets
            experiences.append(current_exp)
        
        return experiences
    
    def _extract_education(self, lines: List[str], section_indices: Dict[str, int]) -> List[Dict]:
        """Extract education entries."""
        education = []
        start_idx = section_indices.get('education', 0)
        
        # Find end of education section
        end_idx = len(lines)
        for section, idx in section_indices.items():
            if section != 'education' and idx > start_idx:
                end_idx = min(end_idx, idx)
        
        edu_lines = lines[start_idx:end_idx]
        
        current_edu = None
        bullets = []
        
        for i, line in enumerate(edu_lines):
            if i == 0 and 'education' in line.lower():
                continue
            
            # Education pattern: School | Degree | Field | Dates
            date_match = re.search(r'(\d{4}|\w+\s+\d{4})', line)
            degree_keywords = ['bachelor', 'master', 'phd', 'doctorate', 'bs', 'ba', 'ms', 'ma', 'mba', 'ph.d']
            
            if date_match or any(keyword in line.lower() for keyword in degree_keywords):
                if current_edu:
                    current_edu["bullets"] = bullets
                    education.append(current_edu)
                
                parts = re.split(r'\s*[-–—|,]\s*', line)
                current_edu = {
                    "id": f"edu-{uuid.uuid4().hex[:8]}",
                    "school": "",
                    "degree": "",
                    "field": "",
                    "startDate": None,
                    "endDate": None,
                    "bullets": []
                }
                bullets = []
                
                for part in parts:
                    part = part.strip()
                    if not part:
                        continue
                    
                    # Check for dates
                    date_match = re.search(r'(\w+\s+\d{4}|\d{4})', part)
                    if date_match:
                        if not current_edu["endDate"]:
                            current_edu["endDate"] = date_match.group(1)
                    
                    # Check for degree
                    elif any(keyword in part.lower() for keyword in degree_keywords):
                        if not current_edu["degree"]:
                            current_edu["degree"] = part
                    
                    # Check for school (usually first part, capitalized)
                    elif part[0].isupper() and not current_edu["school"]:
                        current_edu["school"] = part
                    else:
                        if not current_edu["field"]:
                            current_edu["field"] = part
            
            elif current_edu:
                bullet_match = re.match(r'^[•\-\*]\s*(.+)', line)
                if bullet_match:
                    bullets.append({
                        "id": f"bullet-{uuid.uuid4().hex[:8]}",
                        "text": bullet_match.group(1).strip()
                    })
        
        if current_edu:
            current_edu["bullets"] = bullets
            education.append(current_edu)
        
        return education
    
    def _extract_projects(self, lines: List[str], section_indices: Dict[str, int]) -> List[Dict]:
        """Extract project entries."""
        projects = []
        start_idx = section_indices.get('projects', 0)
        
        if start_idx == 0:
            return projects
        
        end_idx = len(lines)
        for section, idx in section_indices.items():
            if section != 'projects' and idx > start_idx:
                end_idx = min(end_idx, idx)
        
        proj_lines = lines[start_idx:end_idx]
        current_proj = None
        bullets = []
        
        for i, line in enumerate(proj_lines):
            if i == 0 and 'project' in line.lower():
                continue
            
            # Project name is usually a standalone line (bold/header-like)
            if line and len(line) < 100 and not line.startswith(('•', '-', '*')):
                if current_proj:
                    current_proj["bullets"] = bullets
                    projects.append(current_proj)
                
                current_proj = {
                    "id": f"proj-{uuid.uuid4().hex[:8]}",
                    "name": line.strip(),
                    "description": None,
                    "technologies": None,
                    "startDate": None,
                    "endDate": None,
                    "bullets": []
                }
                bullets = []
            elif current_proj:
                bullet_match = re.match(r'^[•\-\*]\s*(.+)', line)
                if bullet_match:
                    bullets.append({
                        "id": f"bullet-{uuid.uuid4().hex[:8]}",
                        "text": bullet_match.group(1).strip()
                    })
        
        if current_proj:
            current_proj["bullets"] = bullets
            projects.append(current_proj)
        
        return projects
    
    def _extract_skills(self, lines: List[str], section_indices: Dict[str, int]) -> List[Dict]:
        """Extract skills grouped by category."""
        skills = []
        start_idx = section_indices.get('skills', 0)
        
        if start_idx == 0:
            return skills
        
        end_idx = len(lines)
        for section, idx in section_indices.items():
            if section != 'skills' and idx > start_idx:
                end_idx = min(end_idx, idx)
        
        skill_lines = lines[start_idx:end_idx]
        
        # Common skill categories
        skill_categories = {
            'Programming Languages': ['python', 'java', 'javascript', 'c++', 'c#', 'go', 'rust', 'swift', 'kotlin', 'typescript'],
            'Frameworks': ['react', 'angular', 'vue', 'django', 'flask', 'express', 'spring', '.net', 'fastapi'],
            'Tools': ['git', 'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'jenkins', 'ci/cd'],
            'Databases': ['mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch'],
        }
        
        all_skills = []
        
        for line in skill_lines:
            if 'skill' in line.lower() and len(line) < 50:
                continue
            
            # Check if line contains skills (comma-separated or bulleted)
            skill_items = re.split(r'[,•\-\|]', line)
            for item in skill_items:
                item = item.strip()
                if item and len(item) < 50:  # Reasonable skill name length
                    all_skills.append(item)
        
        # Group skills by category
        grouped = {}
        uncategorized = []
        
        for skill in all_skills:
            categorized = False
            skill_lower = skill.lower()
            for category, keywords in skill_categories.items():
                if any(keyword in skill_lower for keyword in keywords):
                    if category not in grouped:
                        grouped[category] = []
                    grouped[category].append(skill)
                    categorized = True
                    break
            if not categorized:
                uncategorized.append(skill)
        
        # Create skill groups
        for category, skill_list in grouped.items():
            skills.append({
                "id": f"skill-{uuid.uuid4().hex[:8]}",
                "title": category,
                "skills": skill_list[:20]  # Limit to 20 per group
            })
        
        if uncategorized:
            skills.append({
                "id": f"skill-{uuid.uuid4().hex[:8]}",
                "title": "Other",
                "skills": uncategorized[:20]
            })
        
        return skills
    
    def _normalize_resume_data(self, data: Dict) -> Dict:
        """
        Normalize parsed resume data to ensure it matches StructuredResume schema.
        
        Args:
            data: Parsed data from LLM
            
        Returns:
            Normalized data with all required fields
        """
        # Ensure personalInfo exists
        if "personalInfo" not in data:
            data["personalInfo"] = {}
        
        # Ensure all list fields exist
        for field in ["skills", "experiences", "education", "projects", "customSections"]:
            if field not in data:
                data[field] = []
        
        # Generate IDs for all items
        def generate_id(prefix: str) -> str:
            return f"{prefix}-{uuid.uuid4().hex[:8]}"
        
        # Normalize skills
        for skill_group in data.get("skills", []):
            if "id" not in skill_group:
                skill_group["id"] = generate_id("skill")
            if "title" not in skill_group:
                skill_group["title"] = "Skills"
            if "skills" not in skill_group:
                skill_group["skills"] = []
        
        # Normalize experiences
        for exp in data.get("experiences", []):
            if "id" not in exp:
                exp["id"] = generate_id("exp")
            if "bullets" not in exp:
                exp["bullets"] = []
            for bullet in exp["bullets"]:
                if "id" not in bullet:
                    bullet["id"] = generate_id("bullet")
        
        # Normalize education
        for edu in data.get("education", []):
            if "id" not in edu:
                edu["id"] = generate_id("edu")
            if "bullets" not in edu:
                edu["bullets"] = []
            for bullet in edu["bullets"]:
                if "id" not in bullet:
                    bullet["id"] = generate_id("bullet")
        
        # Normalize projects
        for proj in data.get("projects", []):
            if "id" not in proj:
                proj["id"] = generate_id("proj")
            if "bullets" not in proj:
                proj["bullets"] = []
            for bullet in proj["bullets"]:
                if "id" not in bullet:
                    bullet["id"] = generate_id("bullet")
        
        # Normalize custom sections
        for section in data.get("customSections", []):
            if "id" not in section:
                section["id"] = generate_id("custom")
            if "bullets" not in section:
                section["bullets"] = []
            for bullet in section["bullets"]:
                if "id" not in bullet:
                    bullet["id"] = generate_id("bullet")
        
        return data
    
    def _check_extracted_sections(self, resume: Dict) -> Dict[str, bool]:
        """
        Check which sections were successfully extracted.
        
        Args:
            resume: Parsed resume data
            
        Returns:
            Dictionary mapping section names to extraction success
        """
        return {
            "personalInfo": bool(resume.get("personalInfo") and (
                resume["personalInfo"].get("firstName") or 
                resume["personalInfo"].get("lastName") or
                resume["personalInfo"].get("email")
            )),
            "experiences": len(resume.get("experiences", [])) > 0,
            "education": len(resume.get("education", [])) > 0,
            "projects": len(resume.get("projects", [])) > 0,
            "skills": len(resume.get("skills", [])) > 0,
            "customSections": len(resume.get("customSections", [])) > 0
        }
    
    def _is_minimal_extraction(self, resume: Dict) -> bool:
        """
        Check if extraction is minimal (very little data extracted).
        
        Args:
            resume: Parsed resume data
            
        Returns:
            True if extraction is minimal
        """
        total_bullets = sum(
            len(exp.get("bullets", [])) for exp in resume.get("experiences", [])
        ) + sum(
            len(edu.get("bullets", [])) for edu in resume.get("education", [])
        ) + sum(
            len(proj.get("bullets", [])) for proj in resume.get("projects", [])
        )
        
        # Consider minimal if less than 3 bullets total and no significant sections
        return total_bullets < 3 and len(resume.get("experiences", [])) == 0
    

