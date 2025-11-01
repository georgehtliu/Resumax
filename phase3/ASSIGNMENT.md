# Assignment: AI Resume Optimizer - Phase 3
## Unified Optimization System (Single-Agent Approach)

**Course**: AI/ML Production Systems  
**Duration**: 4-5 hours  
**Difficulty**: Advanced  
**Prerequisites**: Phase 2 completion, Understanding of RAG pipelines

---

## 📋 Assignment Overview

You will transform your Phase 2 RAG pipeline into a unified, cost-efficient optimization system. Instead of multiple separate agents, you'll build a single intelligent optimizer that performs ranking, rewriting, and gap analysis in one LLM call.

**Learning Goal**: Understand how to optimize AI systems for production by reducing costs, improving efficiency, and maintaining quality through intelligent prompt engineering and structured outputs.

---

## 🎯 Learning Objectives

By completing this assignment, you will be able to:

1. **Design unified AI workflows** that consolidate multiple operations
2. **Use structured outputs** with JSON schema for reliable parsing
3. **Optimize LLM costs** through batch processing and efficient prompting
4. **Implement mode selection** (strict vs creative optimization)
5. **Add gap analysis** to identify missing skills and keywords
6. **Improve response schemas** to include richer metadata
7. **Build production-ready services** with error handling and validation

---

## 📁 Project Structure

```
phase3/
├── app/
│   ├── core/                   # Phase 1 & 2 code (reuse)
│   ├── services/
│   │   ├── unified_optimizer.py   # NEW: Single-agent optimizer
│   │   ├── rag_service.py         # MODIFIED: Use unified optimizer
│   │   └── llm_service.py         # Keep for reference
│   ├── schemas/
│   │   └── rag.py              # MODIFIED: Enhanced response schema
│   ├── api/
│   │   └── rag.py              # MODIFIED: Updated endpoints
│   └── main.py                 # Keep existing
├── data/
│   ├── resume_points.txt       # Your resume data
│   └── job_descriptions/       # Sample jobs
├── requirements.txt
└── README.md
```

---

## 🚀 Setup Instructions

### Step 1: Environment Setup
```bash
# Create Phase 3 directory
mkdir phase3 && cd phase3

# Copy Phase 2 code
cp -r ../phase2/app ./phase3/
cp -r ../phase2/data ./phase3/
cp ../phase2/requirements.txt ./phase3/

# Install dependencies (same as Phase 2)
pip install -r requirements.txt
```

### Step 2: Verify Your Setup
```bash
# Make sure Phase 2 works first
cd ../phase2
python -c "from app.services.rag_service import RAGService; print('✅ Phase 2 ready')"
```

---

## 📝 Assignment Tasks

### Task 1: Create Unified Optimizer Service (90 minutes)

**Objective**: Build a single-service that replaces multi-agent complexity

#### 1.1 Create the Service File (`app/services/unified_optimizer.py`)

```python
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
    
    TODO: Implement the unified optimization approach
    HINT: One LLM call should handle ranking, rewriting, and gap analysis
    HINT: Use structured JSON output for reliable parsing
    """
    
    def __init__(self, model: str = "gpt-4o-mini"):
        """
        Initialize the unified optimizer.
        
        Args:
            model: OpenAI model to use (gpt-4o-mini is cheaper than gpt-4)
        """
        # TODO: Add API key validation
        # HINT: Check if OPENAI_API_KEY exists
        # HINT: Store API key and model name
        
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
            Complete optimization results in structured format
        """
        # TODO: Build comprehensive prompt
        # HINT: Include job description, bullets, scores, and mode
        # HINT: Request structured JSON output
        
        prompt = self._build_unified_prompt(bullets, job_description, mode, similarity_scores)
        
        # TODO: Call LLM with structured output
        # HINT: Use response_format={"type": "json_object"} to force JSON
        # HINT: Handle errors gracefully
        
        response = self._call_llm(prompt)
        
        # TODO: Parse and validate response
        # HINT: Use json.loads() to parse
        # HINT: Validate required fields exist
        # HINT: Handle parsing errors
        
        return self._parse_response(response)
    
    def _build_unified_prompt(
        self, 
        bullets: List[str], 
        job_desc: str, 
        mode: str,
        scores: Optional[Dict[str, float]]
    ) -> str:
        """
        Build single comprehensive prompt for all optimization tasks.
        
        TODO: Create prompt that:
        1. Ranks bullets by relevance
        2. Rewrites bullets for improvement
        3. Identifies gaps
        4. Optionally suggests new bullets
        
        HINT: Use clear task descriptions
        HINT: Include similarity scores as context
        HINT: Request specific JSON structure
        """
        # TODO: Format bullets with numbers
        # TODO: Include similarity scores if provided
        # TODO: Add mode-specific instructions
        # TODO: Request structured JSON output
        
        pass
    
    def _call_llm(self, prompt: str) -> str:
        """
        Call OpenAI API with structured output.
        
        TODO: Implement REST API call
        HINT: Use requests.post() to https://api.openai.com/v1/chat/completions
        HINT: Set response_format={"type": "json_object"}
        HINT: Handle timeouts and errors
        """
        # TODO: Implement API call
        # HINT: Similar to llm_service.py but with JSON output format
        pass
    
    def _parse_response(self, response_text: str) -> Dict:
        """
        Parse and validate LLM response.
        
        TODO: Parse JSON response
        TODO: Validate required fields
        TODO: Handle parsing errors gracefully
        """
        # TODO: Parse JSON
        # TODO: Validate structure
        # TODO: Return default if parsing fails
        pass
```

#### 1.2 Implement Core Methods

**Your tasks:**
1. Complete `_build_unified_prompt()` with comprehensive instructions
2. Implement `_call_llm()` with JSON output format
3. Add `_parse_response()` with validation
4. Test with sample data

#### 1.3 Test Your Implementation

```python
# Create test script: test_unified_optimizer.py
from app.services.unified_optimizer import UnifiedOptimizer

async def test():
    optimizer = UnifiedOptimizer()
    
    bullets = [
        "Led development of microservices architecture",
        "Implemented automated testing pipeline"
    ]
    
    job_desc = "Senior Software Engineer with microservices experience"
    
    result = await optimizer.optimize_resume(bullets, job_desc, mode="strict")
    print(result)
```

### Task 2: Update RAG Service (60 minutes)

**Objective**: Integrate unified optimizer into existing RAG pipeline

#### 2.1 Modify `app/services/rag_service.py`

```python
# Add import
from app.services.unified_optimizer import UnifiedOptimizer

# Modify process_rag_request method
async def process_rag_request(self, request: RAGRequest) -> RAGResponse:
    """
    Updated RAG pipeline using unified optimizer.
    
    TODO: Replace separate LLM calls with unified optimizer
    HINT: Keep vector search, replace LLM rewriting step
    """
    start_time = time.time()
    
    # Step 1: Retrieve (unchanged)
    retrieved_data = await self._retrieve_points(request.job_description, request.top_k)
    similarity_scores = {point: score for point, score in retrieved_data}
    retrieved_points = [point for point, score in retrieved_data]
    
    # Step 2: Unified optimization (REPLACE old LLM service call)
    # TODO: Initialize UnifiedOptimizer
    # TODO: Call optimize_resume with retrieved points
    # TODO: Determine mode from request parameters
    
    optimizer = UnifiedOptimizer()
    mode = "creative" if request.rewrite_style == "creative" else "strict"
    
    optimization_result = await optimizer.optimize_resume(
        bullets=retrieved_points,
        job_description=request.job_description,
        mode=mode,
        similarity_scores=similarity_scores
    )
    
    # Step 3: Format response
    # TODO: Extract rankings from optimization_result
    # TODO: Create RewrittenPoint objects with similarity scores
    # TODO: Include gaps and new bullets if available
    
    rewritten_points = []
    for item in optimization_result.get("rankings", []):
        original = item["original"]
        rewritten_points.append(RewrittenPoint(
            original=original,
            rewritten=item["rewritten"],
            similarity_score=similarity_scores.get(original, 0.0),
            reasoning=item.get("improvement_reasoning", "")
        ))
    
    return RAGResponse(
        job_description=request.job_description,
        retrieved_points=retrieved_points,
        rewritten_points=rewritten_points,
        processing_time=time.time() - start_time,
        created_at=datetime.now()
    )
```

### Task 3: Enhance Response Schema (30 minutes)

**Objective**: Add support for gaps and new bullet suggestions

#### 3.1 Update `app/schemas/rag.py`

```python
class RAGResponse(BaseModel):
    """
    Enhanced RAG response with gap analysis.
    """
    job_description: str
    retrieved_points: List[str]
    rewritten_points: List[RewrittenPoint]
    
    # TODO: Add new fields
    # HINT: gaps - skills/keywords missing from resume
    # HINT: new_bullet_suggestions - AI-generated bullets (if creative mode)
    
    gaps: List[str] = Field(default=[], description="Skill/keyword gaps identified")
    new_bullet_suggestions: List[str] = Field(
        default=[], 
        description="AI-generated bullet suggestions (creative mode only)"
    )
    
    processing_time: float
    created_at: datetime
```

#### 3.2 Update RAG Service to Include New Fields

```python
# In process_rag_request, add:
return RAGResponse(
    # ... existing fields ...
    gaps=optimization_result.get("gaps", []),
    new_bullet_suggestions=optimization_result.get("new_bullets", [])
)
```

### Task 4: Add Mode Selection (30 minutes)

**Objective**: Allow users to choose between strict and creative modes

#### 4.1 Update Request Schema

```python
class RAGRequest(BaseModel):
    job_description: str
    top_k: int = 5
    
    # TODO: Replace rewrite_style with optimization_mode
    # HINT: "strict" = only rewrite existing bullets
    # HINT: "creative" = allow AI-generated new bullets
    
    optimization_mode: str = Field(
        "strict", 
        description="Optimization mode: 'strict' (existing only) or 'creative' (allow new bullets)"
    )
```

#### 4.2 Update API Endpoint

```python
# In app/api/rag.py
@router.post("/optimize", response_model=RAGResponse)
async def optimize_resume(request: RAGRequest, ...):
    """
    Enhanced endpoint with mode selection.
    
    TODO: Document the new mode parameter
    TODO: Validate mode is 'strict' or 'creative'
    """
    # Validation
    if request.optimization_mode not in ["strict", "creative"]:
        raise HTTPException(
            status_code=400, 
            detail="optimization_mode must be 'strict' or 'creative'"
        )
    
    # Continue with existing logic...
```

### Task 5: Testing & Validation (45 minutes)

**Objective**: Ensure the unified system works correctly

#### 5.1 Test Strict Mode

```bash
curl -X POST "http://localhost:8000/api/v1/optimize" \
     -H "Content-Type: application/json" \
     -d '{
       "job_description": "Senior Software Engineer with microservices",
       "top_k": 5,
       "optimization_mode": "strict"
     }'
```

**Expected:**
- Only rewrites existing bullets
- No new bullet suggestions
- Gaps identified but no generation

#### 5.2 Test Creative Mode

```bash
curl -X POST "http://localhost:8000/api/v1/optimize" \
     -H "Content-Type: application/json" \
     -d '{
       "job_description": "Senior Software Engineer with microservices",
       "top_k": 5,
       "optimization_mode": "creative"
     }'
```

**Expected:**
- Rewrites existing bullets
- Suggests new bullets for gaps
- More comprehensive optimization

#### 5.3 Validate Cost Savings

**TODO**: Compare API costs
- Run 10 requests with old approach (if available)
- Run 10 requests with new approach
- Calculate cost difference
- Document savings percentage

---

## 🧪 Experimentation Tasks

### Experiment 1: Prompt Engineering
1. Try different prompt structures
2. Test with/without similarity scores in prompt
3. Compare output quality
4. Document best practices

### Experiment 2: Model Comparison
1. Test with `gpt-4o-mini` (cheaper)
2. Test with `gpt-4-turbo` (more capable)
3. Compare quality vs cost trade-off
4. Determine optimal model for your use case

### Experiment 3: Mode Comparison
1. Generate same resume with strict mode
2. Generate same resume with creative mode
3. Compare outputs
4. Analyze when to use each mode

---

## 📊 Deliverables

### 1. Working Unified Optimizer
- [ ] `unified_optimizer.py` fully implemented
- [ ] RAG service updated to use unified optimizer
- [ ] Enhanced response schema with gaps/new bullets
- [ ] Mode selection working (strict/creative)

### 2. Test Results
- [ ] Strict mode test results
- [ ] Creative mode test results
- [ ] Cost comparison (if possible)
- [ ] API response examples

### 3. Documentation
- [ ] Updated API documentation
- [ ] Code comments explaining unified approach
- [ ] Cost savings analysis

---

## 🎯 Success Criteria

### Minimum Requirements (Pass)
- [ ] Unified optimizer service created
- [ ] RAG service updated to use it
- [ ] API endpoints work with new system
- [ ] Both modes (strict/creative) functional

### Good Performance (B+)
- [ ] All minimum requirements met
- [ ] Enhanced schema with gaps/new bullets
- [ ] Proper error handling
- [ ] Well-structured prompts

### Excellent Performance (A)
- [ ] All good performance criteria met
- [ ] Cost analysis completed
- [ ] Comprehensive testing
- [ ] Production-ready error handling
- [ ] Clear documentation

---

## 💰 Cost Optimization Goals

**Target Metrics:**
- **Previous approach**: ~$0.50-1.00 per resume (if multi-agent)
- **Unified approach**: ~$0.05-0.15 per resume
- **Goal**: 80-90% cost reduction

**How to Measure:**
1. Count LLM API calls per request
2. Track token usage
3. Calculate cost per optimization
4. Compare with baseline (if available)

---

## 🆘 Getting Help

### Common Issues & Solutions

**"JSON parsing errors"**
- Ensure `response_format={"type": "json_object"}` is set
- Check prompt asks for JSON explicitly
- Add error handling for malformed JSON

**"Mode not working"**
- Verify mode parameter is passed correctly
- Check prompt includes mode-specific instructions
- Test with simple examples first

**"Unified optimizer not called"**
- Check imports in rag_service.py
- Verify service initialization
- Add debug prints to trace execution

### Resources
- [OpenAI Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs)
- [Prompt Engineering Guide](https://www.promptingguide.ai/)
- [Cost Optimization Strategies](https://platform.openai.com/docs/guides/cost-optimization)

---

## 🎓 Learning Outcomes

After completing this phase, you will understand:

1. **Unified AI Design** - How to consolidate multiple operations
2. **Cost Optimization** - Strategies for reducing LLM expenses
3. **Structured Outputs** - Using JSON schema for reliability
4. **Mode Selection** - Designing flexible system behaviors
5. **Gap Analysis** - Identifying missing elements automatically
6. **Production Optimization** - Building efficient systems

---

## 🚀 Next Steps

This Phase 3 sets you up for:
- **Phase 4**: LaTeX Integration & Export
- **Phase 5**: Database & Personalization
- **Phase 6**: Frontend & Deployment

**You're building a production-ready AI system!** 🚀

---

## 📝 Reflection Questions

Answer these after completing the assignment:

1. **How much did you reduce costs?** Compare token usage between approaches
2. **What prompt structure worked best?** Document your findings
3. **When should you use strict vs creative mode?** Explain your reasoning
4. **What would you improve next?** Identify future enhancements
5. **How does unified approach compare to multi-agent?** Trade-offs analysis

**Good luck and happy coding!** 🚀
