# AI Resume Optimizer - Backend

A production-ready optimization system that consolidates multiple AI operations into a single, cost-efficient LLM call. This phase transforms your Phase 2 RAG pipeline into a unified system that ranks, rewrites, and analyzes resume bullets in one intelligent operation.

## 🎯 What This Phase Adds

Phase 3 introduces a **unified optimizer** that replaces separate agent workflows with a single, comprehensive LLM call and adds production exporting tooling:

1. **Cost Efficiency** - 80-90% reduction in API costs
2. **Unified Processing** - Ranking + Rewriting + Gap Analysis in one call
3. **Mode Selection** - Strict (existing only) vs Creative (allow new bullets)
4. **Gap Analysis** - Identifies missing skills and keywords
5. **Structured Outputs** - Reliable JSON parsing with validation
6. **LaTeX/PDF Rendering** - `/api/v1/latex/render` compiles Jake’s template via `tectonic`

## 🚀 Quick Start

### 1. Setup Environment
```bash
cd backend
# App directory already set up
cp -r ../phase2/data ./
pip install -r requirements.txt
```

### 2. Install LaTeX Compiler (for PDF previews)
```bash
# macOS (Homebrew)
brew install tectonic

# Alternatively, use the official bootstrap script
curl --proto '=https' --tlsv1.2 -sSf https://tectonic-typesetting.github.io/tectonic/bootstrap.sh | sh
```

Ensure `tectonic` is on your `PATH` before running the API.

### 3. Start the Server
```bash
uvicorn app.main:app --reload
```

### 4. Test the API
Visit http://localhost:8000/docs to see the enhanced API documentation.

## 📁 Key Changes from Phase 2

### New File
- `app/services/unified_optimizer.py` - Single-agent optimization service

### Modified Files
- `app/services/rag_service.py` - Now uses unified optimizer
- `app/schemas/rag.py` - Enhanced with gaps and new bullet suggestions (plus LaTeX render schemas)
- `app/api/rag.py` - Updated with mode selection and LaTeX render endpoint
- `app/utils/latex.py` - Jake template builder + PDF rendering helper

## 🔧 New Features

### Mode Selection

**Strict Mode** (default):
```json
{
  "job_description": "...",
  "top_k": 5,
  "optimization_mode": "strict"
}
```
- Only rewrites existing bullets
- No AI-generated new bullets
- Identifies gaps but doesn't fill them

**Creative Mode**:
```json
{
  "job_description": "...",
  "top_k": 5,
  "optimization_mode": "creative"
}
```
- Rewrites existing bullets
- Suggests new bullets for identified gaps
- More comprehensive optimization

### Enhanced Response

The response now includes:
```json
{
  "rewritten_points": [...],
  "gaps": ["Python experience", "REST API design"],
  "new_bullet_suggestions": [
    "Developed RESTful APIs using Python Flask...",
    "Implemented CI/CD pipelines with Jenkins..."
  ]
}
```

### 7. **Dynamic One-Page Caps** - Selection service auto-tunes bullet counts per section to stay within Jake’s one-page layout
### 8. **Backend PDF Rendering** - New LaTeX utility + endpoint powering the Chrome extension preview

## 💰 Cost Comparison

**Phase 2 Approach** (if multi-agent):
- Multiple LLM calls per optimization
- ~$0.50-1.00 per resume

**Phase 3 Unified Approach**:
- Single LLM call per optimization
- ~$0.05-0.15 per resume
- **80-90% cost reduction**

## 📊 API Endpoints

### POST `/api/v1/optimize`

**Enhanced Request:**
```json
{
  "job_description": "Senior Software Engineer...",
  "top_k": 5,
  "optimization_mode": "strict"
}
```

**Enhanced Response:**
```json
{
  "job_description": "...",
  "retrieved_points": [...],
  "rewritten_points": [
    {
      "original": "...",
      "rewritten": "...",
      "similarity_score": 0.87,
      "reasoning": "..."
    }
  ],
  "gaps": ["skill1", "skill2"],
  "new_bullet_suggestions": [],
  "processing_time": 1.23,
  "created_at": "2024-01-15T10:30:00Z"
}
```

### `/api/v1/latex/render`
Compiles a structured resume into the Jake LaTeX template and returns a Base64 PDF. Requires `tectonic` to be installed on the host.

## 🎓 Learning Objectives

This phase teaches you:

1. **Unified AI Design** - Consolidating operations for efficiency
2. **Cost Optimization** - Reducing LLM expenses through batch processing
3. **Structured Outputs** - Using JSON schema for reliable parsing
4. **Prompt Engineering** - Designing comprehensive prompts
5. **Mode Selection** - Building flexible system behaviors
6. **Gap Analysis** - Automatic skill/keyword identification

## 🔄 Workflow Comparison

### Phase 2 (Separate Operations)
```
Retrieve → Embed → LLM Rewrite → LLM Rank → LLM Analyze
         (1 call)   (N calls)      (N calls)    (1 call)
Total: ~2N+2 calls
```

### Phase 3 (Unified)
```
Retrieve → Unified Optimize (Rank + Rewrite + Analyze)
         (1 call)   (1 call)
Total: 2 calls
```

## 🧪 Testing

### Test Strict Mode
```bash
curl -X POST "http://localhost:8000/api/v1/optimize" \
     -H "Content-Type: application/json" \
     -d '{
       "job_description": "Software Engineer with Python experience",
       "top_k": 5,
       "optimization_mode": "strict"
     }'
```

### Test Creative Mode
```bash
curl -X POST "http://localhost:8000/api/v1/optimize" \
     -H "Content-Type: application/json" \
     -d '{
       "job_description": "Software Engineer with Python experience",
       "top_k": 5,
       "optimization_mode": "creative"
     }'
```

## 📚 Architecture

```
┌─────────────────────┐
│  Job Description    │
└──────────┬──────────┘
           │
    ┌──────▼──────────┐
    │ Vector Search   │  (Fast, cheap)
    │ - Retrieve top-k│
    │ - Get scores    │
    └──────┬──────────┘
           │
    ┌──────▼──────────────────────┐
    │ Unified Optimizer            │  (Single LLM call)
    │ - Rank by relevance          │
    │ - Rewrite for improvement    │
    │ - Identify gaps              │
    │ - Suggest new (if creative)  │
    └──────┬──────────────────────┘
           │
    ┌──────▼──────────┐
    │ Enhanced Output │
    │ - Rewritten pts │
    │ - Gaps          │
    │ - Suggestions   │
    └─────────────────┘
```

## 🚀 Next Steps

After completing Phase 3, you'll be ready for:
- **Phase 4**: LaTeX Integration & PDF Export
- **Phase 5**: Database & Personalization
- **Phase 6**: Frontend & Production Deployment

## 🆘 Troubleshooting

### Common Issues

**"JSON parsing errors"**
- Ensure `response_format={"type": "json_object"}` is used
- Check prompt requests JSON explicitly
- Add error handling for malformed responses

**"Mode not working"**
- Verify mode parameter is passed correctly
- Check prompt includes mode-specific instructions
- Test with Postman to see full request/response

**"Gaps not showing"**
- Check LLM response includes gaps field
- Verify parsing logic handles gaps
- Test with diverse job descriptions

## 📖 Resources

- [OpenAI Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs)
- [Cost Optimization Guide](https://platform.openai.com/docs/guides/cost-optimization)
- [Prompt Engineering Best Practices](https://www.promptingguide.ai/)

Happy coding! 🚀
