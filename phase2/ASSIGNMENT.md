# Assignment: AI Resume Optimizer - Phase 2
## RAG Pipeline (Retrieval-Augmented Reasoning)

**Course**: AI/ML RAG Systems  
**Duration**: 3-4 hours  
**Difficulty**: Intermediate  
**Prerequisites**: Phase 1 completion, Basic FastAPI knowledge

---

## 📋 Assignment Overview

You will build a RAG (Retrieval-Augmented Generation) pipeline that uses your Phase 1 vector search to retrieve relevant resume points, then uses an LLM to intelligently rewrite them to better match job descriptions.

**Learning Goal**: Understand how RAG systems combine retrieval (your Phase 1 work) with generation (LLM reasoning) to create context-aware AI applications.

---

## 🎯 Learning Objectives

By completing this assignment, you will be able to:

1. **Understand RAG Architecture** - Retrieve → Augment → Generate flow
2. **Integrate LLMs** with vector search results
3. **Design effective prompts** for context-aware generation
4. **Build FastAPI endpoints** for RAG workflows
5. **Handle before/after comparisons** and result storage
6. **Optimize prompt engineering** for better results

---

## 📁 Project Structure

```
phase2/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI application
│   ├── core/                   # Phase 1 code (copy from phase1/)
│   │   ├── embeddings.py
│   │   └── search.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── rag_service.py      # RAG pipeline logic
│   │   └── llm_service.py      # LLM integration
│   ├── schemas/
│   │   ├── __init__.py
│   │   └── rag.py              # RAG request/response models
│   └── api/
│       ├── __init__.py
│       └── rag.py              # RAG endpoints
├── data/
│   ├── resume_points.txt       # Your Phase 1 data
│   ├── job_descriptions/       # Sample job descriptions
│   └── results/                # Generated results
├── requirements.txt
├── .env.example
└── README.md
```

---

## 🚀 Setup Instructions

### Step 1: Environment Setup
```bash
# Create Phase 2 directory
mkdir phase2 && cd phase2

# Copy Phase 1 core modules
cp -r ../phase1/core ./app/
cp ../phase1/data/resume_points.txt ./data/

# Install dependencies
pip install -r requirements.txt

# Set up environment
cp .env.example .env
```

### Step 2: Install RAG Dependencies
```bash
pip install fastapi uvicorn openai python-dotenv
```

### Step 3: Test Your Setup
```bash
uvicorn app.main:app --reload
```

---

## 📝 Assignment Tasks

### Task 1: Project Structure & Dependencies (20 minutes)

**Objective**: Set up the RAG project structure and install dependencies

#### 1.1 Create Project Structure
```bash
mkdir -p app/{services,schemas,api}
mkdir -p data/{job_descriptions,results}
```

#### 1.2 Create requirements.txt
```python
# Core dependencies
fastapi==0.104.1
uvicorn[standard]==0.24.0
openai==1.3.0
python-dotenv==1.0.0

# Phase 1 dependencies
numpy==1.24.3
chromadb==0.4.15
```

#### 1.3 Create .env.example
```bash
OPENAI_API_KEY=your_openai_api_key_here
```

### Task 2: RAG Schemas (30 minutes)

**Objective**: Create Pydantic models for RAG requests and responses

#### 2.1 RAG Schemas (`app/schemas/rag.py`)
```python
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class RAGRequest(BaseModel):
    job_description: str
    top_k: int = 5
    rewrite_style: str = "professional"  # professional, technical, concise

class RewrittenPoint(BaseModel):
    original: str
    rewritten: str
    similarity_score: float
    reasoning: Optional[str] = None

class RAGResponse(BaseModel):
    job_description: str
    retrieved_points: List[str]
    rewritten_points: List[RewrittenPoint]
    processing_time: float
    created_at: datetime
```

### Task 3: LLM Service (45 minutes)

**Objective**: Create service for LLM integration and prompt engineering

#### 3.1 LLM Service (`app/services/llm_service.py`)
```python
import openai
from typing import List, Dict
import os
from dotenv import load_dotenv

load_dotenv()

class LLMService:
    def __init__(self):
        self.client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.model = "gpt-3.5-turbo"  # or gpt-4 for better results
    
    async def rewrite_resume_points(self, 
                                  job_description: str, 
                                  resume_points: List[str],
                                  style: str = "professional") -> List[Dict]:
        """
        Rewrite resume points to better match job description.
        
        TODO: Implement the RAG generation step
        HINT: Use OpenAI API with a well-crafted prompt
        HINT: Include job description as context
        HINT: Ask for specific improvements
        """
        # TODO: Create a prompt that includes:
        # 1. Job description context
        # 2. Original resume points
        # 3. Instructions for rewriting
        # 4. Desired output format
        
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
        
        Return as JSON array with this format:
        [
            {{
                "original": "original text",
                "rewritten": "improved text",
                "reasoning": "why this change was made"
            }}
        ]
        """
        
        # TODO: Call OpenAI API
        # HINT: Use chat.completions.create()
        # HINT: Parse JSON response
        # HINT: Handle errors gracefully
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a resume optimization expert."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7
            )
            
            # TODO: Parse the JSON response
            # HINT: Extract content from response.choices[0].message.content
            # HINT: Use json.loads() to parse JSON
            # HINT: Return list of dictionaries
            
            import json
            content = response.choices[0].message.content
            return json.loads(content)
            
        except Exception as e:
            print(f"Error in LLM service: {e}")
            return []
```

### Task 4: RAG Service (60 minutes)

**Objective**: Create the main RAG pipeline that combines retrieval and generation

#### 4.1 RAG Service (`app/services/rag_service.py`)
```python
from typing import List, Dict
from app.core.search import VectorSearch
from app.services.llm_service import LLMService
from app.schemas.rag import RAGRequest, RAGResponse, RewrittenPoint
import time
from datetime import datetime

class RAGService:
    def __init__(self):
        self.vector_search = VectorSearch()
        self.llm_service = LLMService()
    
    async def process_rag_request(self, request: RAGRequest) -> RAGResponse:
        """
        Complete RAG pipeline: Retrieve → Augment → Generate
        
        TODO: Implement the full RAG workflow
        HINT: Use your Phase 1 search + LLM rewriting
        """
        start_time = time.time()
        
        # Step 1: Retrieve relevant resume points
        # TODO: Use your Phase 1 vector search
        # HINT: Call vector_search.search_similar()
        retrieved_points = await self._retrieve_points(request.job_description, request.top_k)
        
        # Step 2: Augment with LLM rewriting
        # TODO: Use LLM service to rewrite points
        # HINT: Call llm_service.rewrite_resume_points()
        rewritten_data = await self.llm_service.rewrite_resume_points(
            request.job_description,
            retrieved_points,
            request.rewrite_style
        )
        
        # Step 3: Generate final response
        # TODO: Create RAGResponse with all data
        # HINT: Include processing time and metadata
        
        processing_time = time.time() - start_time
        
        # Convert to RewrittenPoint objects
        rewritten_points = []
        for item in rewritten_data:
            rewritten_points.append(RewrittenPoint(
                original=item["original"],
                rewritten=item["rewritten"],
                similarity_score=0.0,  # TODO: Get from retrieval step
                reasoning=item.get("reasoning", "")
            ))
        
        return RAGResponse(
            job_description=request.job_description,
            retrieved_points=retrieved_points,
            rewritten_points=rewritten_points,
            processing_time=processing_time,
            created_at=datetime.now()
        )
    
    async def _retrieve_points(self, job_description: str, top_k: int) -> List[str]:
        """
        Retrieve relevant resume points using Phase 1 search
        
        TODO: Implement retrieval step
        HINT: Use your existing vector search functionality
        """
        # TODO: Call vector search
        # HINT: Use self.vector_search.search_similar()
        # HINT: Extract just the text from results
        results = self.vector_search.search_similar(job_description, top_k)
        return [point for point, score in results]
```

### Task 5: FastAPI Endpoints (45 minutes)

**Objective**: Create API endpoints to expose RAG functionality

#### 5.1 RAG Endpoints (`app/api/rag.py`)
```python
from fastapi import APIRouter, HTTPException
from app.schemas.rag import RAGRequest, RAGResponse
from app.services.rag_service import RAGService
import json
from datetime import datetime

router = APIRouter()

@router.post("/optimize", response_model=RAGResponse)
async def optimize_resume(request: RAGRequest):
    """
    Main RAG endpoint: Optimize resume points for a job description
    
    TODO: Implement the main RAG endpoint
    HINT: Use RAGService.process_rag_request()
    """
    try:
        rag_service = RAGService()
        result = await rag_service.process_rag_request(request)
        
        # TODO: Optionally save results to file
        # HINT: Save to data/results/ with timestamp
        await _save_results(result)
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "RAG Pipeline"}

async def _save_results(result: RAGResponse):
    """
    Save results to JSON file for analysis
    
    TODO: Implement result saving
    HINT: Create timestamped filename
    HINT: Save as JSON to data/results/
    """
    # TODO: Create filename with timestamp
    # TODO: Save result as JSON
    # HINT: Use result.dict() to convert to dictionary
    pass
```

#### 5.2 Main App (`app/main.py`)
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import rag

app = FastAPI(
    title="AI Resume Optimizer - RAG Pipeline",
    description="Retrieval-Augmented Generation for resume optimization",
    version="2.0.0"
)

# TODO: Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# TODO: Include routers
app.include_router(rag.router, prefix="/api/v1")

@app.get("/")
async def root():
    return {"message": "AI Resume Optimizer RAG Pipeline", "version": "2.0.0"}
```

### Task 6: Testing & Validation (30 minutes)

**Objective**: Test the RAG pipeline and validate results

#### 6.1 Test the Pipeline
```bash
# Start the server
uvicorn app.main:app --reload

# Test with curl or visit http://localhost:8000/docs
curl -X POST "http://localhost:8000/api/v1/optimize" \
     -H "Content-Type: application/json" \
     -d '{
       "job_description": "We are looking for a Senior Software Engineer with experience in microservices, REST APIs, and team leadership.",
       "top_k": 3,
       "rewrite_style": "professional"
     }'
```

#### 6.2 Validate Results
- Check that retrieved points are relevant
- Verify rewritten points are improved
- Ensure JSON format is correct
- Test different rewrite styles

---

## 🧪 Experimentation Tasks

### Experiment 1: Prompt Engineering
1. Try different prompt styles in `llm_service.py`
2. Test with different rewrite styles (technical, concise, professional)
3. Compare results and document what works best

### Experiment 2: Retrieval Quality
1. Test with different `top_k` values
2. Analyze which resume points get retrieved
3. Experiment with different job descriptions

### Experiment 3: RAG Pipeline Analysis
1. Measure processing time for different inputs
2. Analyze the quality of rewritten points
3. Test edge cases (empty results, API errors)

---

## 📊 Deliverables

### 1. Working RAG Pipeline
- [ ] FastAPI server running
- [ ] RAG endpoint functional
- [ ] LLM integration working
- [ ] Results saved to JSON

### 2. Quality Results
- [ ] Retrieved points are relevant
- [ ] Rewritten points are improved
- [ ] JSON format is correct
- [ ] Error handling works

### 3. Documentation
- [ ] API documentation accessible
- [ ] Code is well-commented
- [ ] Results are saved and analyzable

---

## 🎯 Success Criteria

### Minimum Requirements (Pass)
- [ ] RAG pipeline runs without errors
- [ ] API endpoints respond correctly
- [ ] LLM generates rewritten points
- [ ] Results are saved to file

### Good Performance (B+)
- [ ] All minimum requirements met
- [ ] Good prompt engineering
- [ ] Proper error handling
- [ ] Clean code structure

### Excellent Performance (A)
- [ ] All good performance criteria met
- [ ] Excellent prompt engineering
- [ ] Comprehensive testing
- [ ] Performance optimization

---

## 🎓 Learning Outcomes

After completing this assignment, you will understand:

1. **RAG Architecture** - How retrieval and generation work together
2. **Prompt Engineering** - How to craft effective LLM prompts
3. **Context-Aware AI** - How to use retrieved information in generation
4. **API Design** - How to expose AI functionality through REST APIs
5. **System Integration** - How to combine multiple AI services

---

## 🚀 Next Steps

This Phase 2 sets you up perfectly for:
- **Phase 3**: Agentic Architecture with LangGraph
- **Phase 4**: Data & Personalization Layer
- **Phase 5**: Full Product MVP

**You're building the foundation for a complete AI-powered resume optimization system!** 🚀


