# Resumax Architecture Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [High-Level Architecture](#high-level-architecture)
3. [Core Architecture Decisions](#core-architecture-decisions)
4. [Component Deep Dive](#component-deep-dive)
5. [Data Flow & Request Lifecycle](#data-flow--request-lifecycle)
6. [Key Technical Choices](#key-technical-choices)
7. [Trade-offs & Considerations](#trade-offs--considerations)
8. [Code Walkthrough Examples](#code-walkthrough-examples)

---

## System Overview

Resumax is an AI-powered resume optimization platform that helps software engineers create tailored resumes for each job application. The system consists of:

- **Chrome Extension Frontend** (React) - User interface for managing resumes
- **FastAPI Backend** - REST API and WebSocket server for AI services
- **Vector Database** (ChromaDB) - Semantic search for resume bullets
- **PostgreSQL** (Supabase) - Structured data storage for resumes and users
- **OpenAI API** - LLM services for optimization, feedback, and question generation

### Key Capabilities
1. **Resume Tailoring** - AI selects and optimizes bullets based on job descriptions
2. **Resume Feedback** - Comprehensive analysis with format/grammar checks
3. **Interview Prep** - Generates personalized questions with STAR frameworks
4. **Real-time Collaboration** - WebSocket-based reviewer matching and feedback

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Chrome Extension (React)                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Popup   │  │ Manager  │  │  Shared  │  │Background│   │
│  │   View   │  │   View   │  │Components│  │  Worker  │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
└───────┼──────────────┼─────────────┼─────────────┼──────────┘
        │             │             │             │
        └─────────────┴─────────────┴─────────────┘
                    │ HTTP REST / WebSocket │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                  FastAPI Backend (/api/v1)                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              REST API Endpoints                      │   │
│  │  /select  /optimize  /coaching/roast  /latex/render │   │
│  └──────────────────┬───────────────────────────────────┘   │
│  ┌──────────────────┴───────────────────────────────────┐   │
│  │              Service Layer                           │   │
│  │  RAG • Selection • Optimization • Coaching • LaTeX   │   │
│  └──────────────────┬───────────────────────────────────┘   │
│  ┌──────────────────┴───────────────────────────────────┐   │
│  │              Core Components                          │   │
│  │  Vector Search • Embeddings • Unified Optimizer       │   │
│  └──────────────────┬───────────────────────────────────┘   │
└─────────────────────┼───────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
   ┌─────────┐  ┌─────────┐  ┌─────────┐
   │ OpenAI  │  │ChromaDB │  │Supabase │
   │   API   │  │ Vector  │  │   DB    │
   └─────────┘  └─────────┘  └─────────┘
```

---

## Core Architecture Decisions

### 1. **Unified Optimizer Pattern** (Cost Efficiency)

**Decision**: Consolidate multiple LLM tasks into a single API call.

**Rationale**:
- **Cost**: Multiple separate calls (rank → rewrite → gap analysis) = 3x API costs
- **Latency**: Single call is faster than sequential calls
- **Consistency**: LLM sees full context, produces more coherent results

**Implementation**:
```python
# Instead of:
rankings = await rank_bullets(bullets, job_desc)      # Call 1
rewritten = await rewrite_bullets(bullets, job_desc)  # Call 2
gaps = await analyze_gaps(bullets, job_desc)         # Call 3

# We do:
result = await unified_optimizer.optimize_resume(
    bullets, job_desc, mode="strict"
)
# Returns: rankings + rewritten + gaps in one response
```

**Trade-off**: More complex prompt engineering, but saves ~66% on API costs.

---

### 2. **Hybrid Search Strategy** (Retrieval Quality)

**Decision**: Combine semantic (vector) search with keyword matching.

**Rationale**:
- **Semantic search** catches conceptual matches ("microservices" ≈ "distributed systems")
- **Keyword matching** catches exact tech terms ("React" must match "React")
- **Hybrid** = Best of both worlds

**Implementation**:
```python
# Semantic search (vector similarity)
semantic_results = vector_search.search_similar(job_desc, top_k=10)

# Keyword matching (exact tech terms)
keywords = extract_tech_keywords(job_desc)  # Python, React, AWS, etc.
keyword_matches = filter_by_keywords(bullets, keywords)

# Hybrid: Combine and re-rank
hybrid_results = combine_and_rerank(semantic_results, keyword_matches)
```

**Trade-off**: Slightly slower than pure semantic, but significantly better recall for technical terms.

---

### 3. **Profile-Based Adaptive Selection** (One-Page Constraint)

**Decision**: Dynamically adjust selection strategy based on resume characteristics.

**Rationale**:
- Different resumes need different strategies:
  - **High density** (many experiences) → Aggressive compression
  - **Low density** (few experiences) → Can include more bullets
  - **Project-heavy** → Prioritize projects over experiences
- One-size-fits-all doesn't work for the 42-line constraint

**Implementation**:
```python
# Detect profile
profile = ResumeProfileDetector.detect_profile(resume)
# Returns: density, distribution, compression_needed

# Allocate space adaptively
allocation = AdaptiveSpaceAllocator.allocate_space(profile)
# Returns: lines_per_section based on profile

# Select with profile-aware strategy
selected = select_with_profile_awareness(resume, job_desc, allocation)
```

**Trade-off**: More complex logic, but produces better one-page resumes.

---

### 4. **Structured Resume Schema** (Type Safety & Validation)

**Decision**: Use Pydantic models for all resume data structures.

**Rationale**:
- **Type safety**: Catch errors at API boundary, not runtime
- **Validation**: Automatic validation of required fields, types, ranges
- **Documentation**: Auto-generated OpenAPI docs from schemas
- **Consistency**: Same schema used across frontend/backend

**Implementation**:
```python
class StructuredResume(BaseModel):
    personalInfo: Optional[PersonalInfo]
    experiences: List[Experience] = Field(default_factory=list)
    projects: List[Project] = Field(default_factory=list)
    # ... with Field validators, descriptions, examples
```

**Trade-off**: More upfront schema definition, but prevents entire classes of bugs.

---

### 5. **Single LLM Call for Coaching Features**

**Decision**: Roast and Interview Question services use single comprehensive LLM calls.

**Rationale**:
- **Roast**: Analyzes all bullets at once → catches format inconsistencies across entire resume
- **Interview Prep**: Generates 5-8 questions in one call → faster and cheaper
- **Consistency**: LLM sees full context, produces coherent feedback

**Trade-off**: Larger prompts/tokens, but simpler architecture and better results.

---

### 6. **WebSocket for Real-time Collaboration**

**Decision**: Use WebSocket instead of polling for collaboration features.

**Rationale**:
- **Real-time**: Instant updates for chat, highlights, comments
- **Efficiency**: No constant polling overhead
- **Bidirectional**: Server can push updates to clients

**Implementation**:
```python
# Queue-based matching
@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    user_id = websocket.query_params.get("user_id")
    
    # Join queue
    queue_service.join_queue(user_id, role="reviewer")
    
    # Match when pair found
    match = await queue_service.find_match(user_id)
    if match:
        room = room_service.create_room(user_id, match.partner_id)
        await websocket.send_json({"type": "matched", "room_id": room.id})
```

**Trade-off**: More complex than REST, but necessary for real-time features.

---

## Component Deep Dive

### RAG Service (Retrieval-Augmented Generation)

**Purpose**: Main pipeline for resume optimization.

**Flow**:
1. **Retrieve**: Vector search finds relevant bullets
2. **Augment**: Combine with job description context
3. **Generate**: LLM optimizes bullets

**Key Design**:
- Separates retrieval (fast) from generation (slow)
- Uses similarity scores from vector search (more reliable than LLM scores)
- Handles empty results gracefully

```python
class RAGService:
    def __init__(self):
        self.vector_search = VectorSearch()      # Fast retrieval
        self.unified_optimizer = UnifiedOptimizer()  # Slow generation
    
    async def process_rag_request(self, request):
        # Step 1: Retrieve (fast - vector search)
        retrieved = await self._retrieve_points(job_desc, top_k=10)
        
        # Step 2: Generate (slow - LLM call)
        optimized = await self.unified_optimizer.optimize_resume(
            bullets=retrieved,
            job_description=job_desc
        )
        
        return RAGResponse(...)
```

---

### Selection Service (One-Page Optimization)

**Purpose**: Selects best bullets while fitting 42-line constraint.

**4-Phase Algorithm**:

**Phase 1: Preparation & Valuation**
- Scores all experiences/bullets globally
- Identifies "Must-Haves" (most recent + highest prestige)

**Phase 2: Initial Fill**
- Locks must-haves
- Priority queue selection for remaining
- Fills with buffer for squeeze phase

**Phase 3: The Squeeze**
- Iteratively removes lowest-scoring bullets
- Handles orphan blocks (one-liner mode)

**Phase 4: Revive**
- Adds back high-scoring bullets if underutilized

**Why This Approach**:
- Ensures must-haves are always included
- Maximizes relevance score within constraint
- Handles edge cases (too many experiences, too few bullets)

---

### Unified Optimizer (Cost Optimization)

**Purpose**: Single LLM call for ranking + rewriting + gap analysis.

**Prompt Engineering**:
- Structured JSON output format (`response_format: {"type": "json_object"}`)
- Clear instructions for each task
- Includes similarity scores from vector search as hints

**Key Optimization**:
- Uses `gpt-4o-mini` instead of `gpt-4` (10x cheaper, good enough quality)
- Dynamic `max_tokens` based on bullet count
- Temperature 0.7 for balance between creativity and consistency

**Response Structure**:
```json
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
  "new_bullets": []  // Only in creative mode
}
```

---

### Vector Search (Semantic Retrieval)

**Purpose**: Find semantically similar resume bullets.

**Technology**: ChromaDB with OpenAI embeddings (`text-embedding-3-small`)

**Hybrid Search Implementation**:
```python
def search_similar(self, query: str, top_k: int, use_hybrid: bool = True):
    # Semantic search
    semantic_results = self.collection.query(
        query_embeddings=[embedding],
        n_results=top_k * 2  # Get more for re-ranking
    )
    
    if use_hybrid:
        # Extract keywords
        keywords = extract_tech_keywords(query)
        
        # Boost keyword matches
        hybrid_results = rerank_with_keywords(
            semantic_results,
            keywords,
            boost_factor=1.5
        )
        return hybrid_results[:top_k]
    
    return semantic_results[:top_k]
```

**Why ChromaDB**:
- Local/embedded (no external service needed)
- Persistent storage (DuckDB + Parquet)
- Fast similarity search
- Easy to use API

---

### Roast Service (Resume Feedback)

**Purpose**: Comprehensive resume analysis (content + format + grammar).

**Architecture Decision**: Single LLM call analyzes everything.

**Why Single Call**:
- Format inconsistencies need full resume context
- Grammar patterns visible across all bullets
- Faster than multiple calls
- More coherent feedback

**Prompt Strategy**:
- Focuses on 2-3 most critical issues per bullet (keeps response concise)
- Prioritizes: grammar > metrics > weak verbs > format
- Dynamic token limits based on bullet count

**Optimization**:
- Reduced from 4000 to dynamic (150 tokens/bullet, max 6000)
- Temperature 0.5 (more focused)
- Concise prompt (40% shorter)

---

### Interview Question Service

**Purpose**: Generate interview questions with STAR frameworks.

**Architecture**: Single LLM call generates 5-8 questions.

**Why Single Call**:
- Questions should be diverse (behavioral + technical)
- LLM sees full context of experience/project
- Faster than generating one-by-one

**Output Structure**:
```json
{
  "questions": [
    {
      "question": "...",
      "whyAsked": "...",
      "starFramework": {
        "situation": "...",
        "task": "...",
        "action": "...",
        "result": "..."
      },
      "keyPoints": ["point1", "point2"]
    }
  ]
}
```

---

## Data Flow & Request Lifecycle

### Resume Optimization Flow

```
User Action: "Generate Resume for Job"
    │
    ▼
[Chrome Extension]
    │ buildStructuredResume()
    ▼
[API Service] POST /api/v1/optimize
    │
    ▼
[FastAPI Endpoint] optimize_resume_structured()
    │
    ├─→ [SelectionService] select_bullets()
    │   │
    │   ├─→ [VectorSearch] search_similar() → ChromaDB
    │   │   └─→ [Embeddings] generate_embeddings() → OpenAI
    │   │
    │   └─→ [ProfileDetector] detect_profile()
    │       └─→ [AdaptiveSpaceAllocator] allocate_space()
    │
    └─→ [UnifiedOptimizer] optimize_resume()
        │
        └─→ [OpenAI API] chat/completions
            └─→ Returns: rankings + rewritten + gaps
    │
    ▼
[Response] SelectedResume with optimized bullets
    │
    ▼
[Frontend] Display optimized resume
```

### Resume Roast Flow

```
User Action: "Roast My Bullets"
    │
    ▼
[Chrome Extension] POST /api/v1/coaching/roast
    │
    ▼
[FastAPI Endpoint] roast_resume()
    │
    └─→ [RoastService] roast_resume()
        │
        ├─→ _count_bullets() → Calculate dynamic tokens
        ├─→ _build_roast_prompt() → Create comprehensive prompt
        └─→ _call_llm() → OpenAI API
            │
            └─→ Returns: tldr + feedback + formatIssues + generalIssues
    │
    ▼
[Response] RoastResponse with comprehensive feedback
    │
    ▼
[Frontend] Display feedback with color-coded issues
```

---

## Key Technical Choices

### 1. **FastAPI over Flask/Django**

**Why FastAPI**:
- **Async/await**: Native async support (important for I/O-bound LLM calls)
- **Type hints**: Better IDE support, fewer bugs
- **Auto docs**: OpenAPI/Swagger docs generated automatically
- **Performance**: Faster than Flask, comparable to Node.js
- **Modern**: Built for Python 3.7+ with modern patterns

**Example**:
```python
@router.post("/optimize", response_model=OptimizationResponse)
async def optimize_resume_structured(request: OptimizationRequest):
    # Async endpoint - can handle concurrent requests efficiently
    result = await optimization_service.optimize_resume(...)
    return result
```

---

### 2. **Pydantic for Schema Validation**

**Why Pydantic**:
- **Runtime validation**: Catches bad data before it reaches business logic
- **Type coercion**: Automatically converts types (str → int where needed)
- **Documentation**: Field descriptions become API docs
- **Error messages**: Clear validation errors

**Example**:
```python
class OptimizationRequest(BaseModel):
    job_description: str = Field(..., min_length=100)
    resume: StructuredResume
    bullets_per_experience: int = Field(3, ge=1, le=10)
    # ge=1 means >= 1, le=10 means <= 10
    # Validation happens automatically at API boundary
```

---

### 3. **ChromaDB over Pinecone/Weaviate**

**Why ChromaDB**:
- **Local/embedded**: No external service, no API keys, no costs
- **Persistent**: DuckDB + Parquet for durability
- **Simple**: Easy to use, minimal setup
- **Fast**: Good performance for our use case

**Trade-off**: 
- Less scalable than cloud solutions (but fine for our scale)
- No managed infrastructure (but simpler deployment)

---

### 4. **React for Chrome Extension**

**Why React**:
- **Component reusability**: Shared components across views
- **State management**: Complex UI state (resume data, selections)
- **Ecosystem**: Rich library ecosystem
- **Developer experience**: Hot reload, good tooling

**Architecture**:
- Single-page app within popup
- State management via React hooks
- API service layer for backend communication

---

### 5. **WebSocket over Server-Sent Events**

**Why WebSocket**:
- **Bidirectional**: Server can push, client can send
- **Real-time**: Needed for chat, highlights, comments
- **Efficient**: No polling overhead

**Implementation**:
- Queue service for matching reviewers/reviewees
- Room service for managing collaboration sessions
- Message broadcasting for real-time updates

---

## Trade-offs & Considerations

### 1. **Unified Optimizer vs Separate Calls**

**Chosen**: Unified (single call)

**Pros**:
- 66% cost reduction
- Faster (one round-trip vs three)
- More coherent results

**Cons**:
- More complex prompt engineering
- Harder to debug (all tasks in one response)
- Less granular error handling

**Decision Rationale**: Cost and speed benefits outweigh complexity.

---

### 2. **Hybrid Search vs Pure Semantic**

**Chosen**: Hybrid (semantic + keyword)

**Pros**:
- Better recall for technical terms
- Catches both conceptual and exact matches

**Cons**:
- More complex implementation
- Slightly slower (but negligible)

**Decision Rationale**: Technical resume matching requires exact tech term matching.

---

### 3. **Profile-Based Selection vs Fixed Strategy**

**Chosen**: Adaptive (profile-based)

**Pros**:
- Handles diverse resume types
- Better one-page optimization
- More intelligent selection

**Cons**:
- More complex algorithm
- Harder to test all edge cases

**Decision Rationale**: One-size-fits-all doesn't work for resume optimization.

---

### 4. **Single LLM Call for Roast vs Multi-Step**

**Chosen**: Single call

**Pros**:
- Format inconsistencies need full context
- Faster
- More coherent feedback

**Cons**:
- Large prompts for big resumes
- Token limits can be hit (mitigated with dynamic limits)

**Decision Rationale**: Format analysis requires seeing all bullets together.

---

### 5. **ChromaDB vs Cloud Vector DB**

**Chosen**: ChromaDB (local)

**Pros**:
- No external dependencies
- No API costs
- Simple deployment
- Fast enough for our scale

**Cons**:
- Less scalable (but we don't need massive scale)
- No managed infrastructure

**Decision Rationale**: Simplicity and cost-effectiveness for MVP/early stage.

---

## Code Walkthrough Examples

### Example 1: Resume Optimization Request

```python
# 1. User clicks "Generate Resume" in Chrome Extension
# Frontend: chrome-extension/popup/src/components/GenerateResume.jsx

const structuredResume = buildStructuredResume(masterResume);
const apiResponse = await optimizeResume({
  jobDescription: jobDesc,
  resume: structuredResume,
  bulletsPerExperience: 3,
  optimizationMode: "strict"
});

# 2. Request hits FastAPI endpoint
# Backend: backend/app/api/rag.py

@router.post("/optimize", response_model=OptimizationResponse)
async def optimize_resume_structured(request: OptimizationRequest):
    optimization_service = OptimizationService()
    
    # 3. Optimization Service orchestrates selection + rewriting
    optimized_resume = await optimization_service.optimize_resume(
        resume=request.resume,
        job_description=request.job_description,
        bullets_per_experience=request.bullets_per_experience,
        optimization_mode=request.optimization_mode
    )
    
    # 4. Selection Service selects bullets
    # backend/app/services/selection_service.py
    
    selected_resume = await selection_service.select_bullets(
        resume, job_description, bullets_per_experience
    )
    # Uses vector search + profile-based adaptive selection
    
    # 5. Unified Optimizer rewrites selected bullets
    # backend/app/services/unified_optimizer.py
    
    optimization_result = await unified_optimizer.optimize_resume(
        bullets=selected_bullets,
        job_description=job_description,
        mode="strict"
    )
    # Single LLM call returns rankings + rewritten + gaps
    
    # 6. Response flows back to frontend
    return OptimizationResponse(
        optimizedResume=optimized_resume,
        gaps=gaps,
        fitsOnePage=True
    )
```

---

### Example 2: Resume Roast Request

```python
# 1. User clicks "Roast My Bullets"
# Frontend: chrome-extension/popup/src/components/coaching/RoastMyBullets.jsx

const structuredResume = buildStructuredResume(resume);
const response = await roastResume({ resume: structuredResume });

# 2. Request hits FastAPI endpoint
# Backend: backend/app/api/rag.py

@router.post("/coaching/roast", response_model=RoastResponse)
async def roast_resume(request: RoastRequest):
    roast_service = RoastService()
    feedback_data = await roast_service.roast_resume(request.resume)
    return RoastResponse(**feedback_data)

# 3. Roast Service builds comprehensive prompt
# backend/app/services/roast_service.py

def _build_roast_prompt(self, resume: StructuredResume) -> str:
    bullets_text = self._format_bullets_with_context(resume)
    # Formats all bullets with section context
    
    prompt = f"""Analyze this resume and provide concise feedback.
    
    BULLETS:
    {bullets_text}
    
    IMPORTANT: Flag only the 2 MOST CRITICAL issues per bullet...
    """
    return prompt

# 4. Single LLM call analyzes everything
async def _call_llm(self, prompt: str, estimated_bullets: int):
    max_tokens = min(6000, max(2000, estimated_bullets * 150))
    # Dynamic token calculation based on bullet count
    
    response = await openai.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.5,
        max_tokens=max_tokens,
        response_format={"type": "json_object"}
    )
    return response.choices[0].message.content

# 5. Response parsed and returned
# Includes: tldr, overallScore, feedback[], formatIssues[], generalIssues[]
```

---

### Example 3: Vector Search with Hybrid Matching

```python
# backend/app/core/search.py

def search_similar(self, query: str, top_k: int, use_hybrid: bool = True):
    # Step 1: Generate embedding for query
    query_embedding = self.embedding_generator.generate_embedding(query)
    
    # Step 2: Semantic search
    semantic_results = self.collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k * 2  # Get more for re-ranking
    )
    
    if not use_hybrid:
        return semantic_results[:top_k]
    
    # Step 3: Extract keywords from job description
    keywords = self._extract_keywords(query)
    # Uses regex patterns for tech terms: Python, React, AWS, etc.
    
    # Step 4: Boost keyword matches
    hybrid_results = []
    for result in semantic_results:
        score = result['score']
        
        # Check if result contains any keywords
        result_text = result['document'].lower()
        keyword_matches = sum(1 for kw in keywords if kw.lower() in result_text)
        
        if keyword_matches > 0:
            # Boost score for keyword matches
            score = min(1.0, score * 1.5)
        
        hybrid_results.append({
            'document': result['document'],
            'score': score
        })
    
    # Step 5: Re-sort by boosted scores
    hybrid_results.sort(key=lambda x: x['score'], reverse=True)
    return hybrid_results[:top_k]
```

---

## Performance Optimizations

### 1. **Dynamic Token Limits**

**Problem**: Fixed 4000 tokens too small for large resumes, too large for small ones.

**Solution**: Calculate based on bullet count
```python
max_tokens = min(6000, max(2000, estimated_bullets * 150))
```

**Impact**: 
- Small resumes (10 bullets): 2000 tokens (faster)
- Large resumes (40 bullets): 6000 tokens (complete analysis)

---

### 2. **Concise Prompts**

**Problem**: Long prompts = slower + more expensive.

**Solution**: 
- Reduced prompt length by 40%
- Limit to 2 critical issues per bullet
- Focus on actionable feedback

**Impact**: 10-15% faster responses.

---

### 3. **Lower Temperature**

**Problem**: Temperature 0.7 produces varied but sometimes verbose responses.

**Solution**: Temperature 0.5 for coaching features.

**Impact**: More focused, faster responses.

---

### 4. **Batch Embedding Generation**

**Problem**: Generating embeddings one-by-one is slow.

**Solution**: Batch API calls
```python
embeddings = embedding_generator.generate_embeddings_batch(resume_points)
# Single API call for all points
```

**Impact**: 10x faster embedding generation.

---

## Error Handling & Resilience

### 1. **Graceful Degradation**

```python
# If vector search fails, return empty results
try:
    results = self.vector_search.search_similar(...)
except Exception as e:
    print(f"Vector search failed: {e}")
    return []  # Don't crash, return empty

# If LLM call fails, return partial results
try:
    optimization_result = await unified_optimizer.optimize_resume(...)
except Exception as e:
    return RAGResponse(
        retrieved_points=retrieved_points,
        rewritten_points=[],  # Empty but valid response
        gaps=[]
    )
```

---

### 2. **Response Validation**

```python
# Pydantic automatically validates responses
class RoastResponse(BaseModel):
    overallScore: float = Field(..., ge=0, le=10)  # Must be 0-10
    totalBullets: int = Field(..., ge=0)  # Must be non-negative
    
# Invalid data is caught at API boundary
```

---

### 3. **JSON Parsing Safety**

```python
# Handle truncated responses
try:
    data = json.loads(response_text)
except json.JSONDecodeError as e:
    if "Unterminated string" in str(e):
        # Response was truncated - return helpful error
        return {
            "tldr": "Response truncated due to size...",
            "generalIssues": [{"type": "error", "message": "..."}]
        }
```

---

## Scalability Considerations

### Current Architecture (MVP Scale)
- **Users**: Hundreds to low thousands
- **Resumes**: Thousands
- **Vector DB**: Local ChromaDB (sufficient)
- **Database**: Supabase (managed PostgreSQL)

### Future Scaling Path

**If we need to scale**:

1. **Vector DB**: Migrate to Pinecone/Weaviate for cloud scale
2. **Caching**: Add Redis for frequently accessed resumes
3. **Queue**: Use Celery/RQ for background processing
4. **CDN**: Serve static assets via CDN
5. **Load Balancing**: Multiple FastAPI instances behind load balancer

**Current architecture supports this path** - services are decoupled, easy to swap implementations.

---

## Security Considerations

### 1. **API Key Management**
- Environment variables (`.env` file)
- Never committed to git
- Validated at service initialization

### 2. **Input Validation**
- Pydantic schemas validate all inputs
- Field constraints (min/max lengths, ranges)
- Type coercion and validation

### 3. **CORS Configuration**
- Currently open for development (`allow_origins=["*"]`)
- Should be restricted in production

### 4. **User Authentication**
- Supabase handles auth (JWT tokens)
- User-specific data isolation

---

## Testing Strategy

### Unit Tests
- Service methods tested in isolation
- Mock external dependencies (OpenAI, ChromaDB)

### Integration Tests
- API endpoints tested end-to-end
- Test with real schemas but mocked LLM calls

### Manual Testing
- Chrome extension tested manually
- Real resume data for validation

---

## Deployment Architecture

### Development
- Backend: `uvicorn app.main:app --reload` (local)
- Frontend: `npm run build` → Load unpacked extension
- ChromaDB: Local file system
- Supabase: Cloud (development project)

### Production (Future)
- Backend: Docker container on cloud (Railway/Render)
- Frontend: Chrome Web Store
- ChromaDB: Could migrate to cloud or keep local
- Supabase: Production project

---

## Key Metrics & Monitoring

### Performance Metrics
- **API Response Times**: Tracked via FastAPI logging
- **LLM Costs**: Monitor via OpenAI usage dashboard
- **Error Rates**: Logged exceptions

### Business Metrics
- **Resumes Generated**: Tracked in Supabase
- **User Engagement**: Chrome extension analytics

---

## Future Enhancements

### Short-term
1. **Caching**: Cache LLM responses for identical requests
2. **Rate Limiting**: Prevent abuse
3. **Better Error Messages**: User-friendly error handling

### Long-term
1. **Multi-language Support**: Resume optimization for non-English resumes
2. **Industry-Specific Templates**: Different templates per industry
3. **A/B Testing**: Test different optimization strategies
4. **Analytics Dashboard**: Track resume success rates

---

## Conclusion

This architecture prioritizes:
1. **Cost Efficiency**: Unified optimizer, gpt-4o-mini, single calls
2. **Quality**: Hybrid search, profile-based selection, comprehensive prompts
3. **Simplicity**: Local ChromaDB, straightforward service layer
4. **Type Safety**: Pydantic schemas throughout
5. **Performance**: Dynamic token limits, concise prompts, batch operations

The system is designed to be maintainable, scalable, and cost-effective while delivering high-quality resume optimization results.

