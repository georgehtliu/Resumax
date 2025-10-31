# AI Resume Optimizer - Phase 2: RAG Pipeline

A FastAPI-based RAG (Retrieval-Augmented Generation) system that optimizes resume points for specific job descriptions using vector search and LLM rewriting.

## 🎯 What This Does

This Phase 2 builds on your Phase 1 vector search to create a complete RAG pipeline:

1. **Retrieve** - Uses your Phase 1 vector search to find relevant resume points
2. **Augment** - Combines retrieved points with job description context  
3. **Generate** - Uses LLM to rewrite points for better job match

## 🚀 Quick Start

### 1. Setup Environment
```bash
cd phase2
pip install -r requirements.txt
cp env.example .env
# Add your OpenAI API key to .env
```

### 2. Start the Server
```bash
uvicorn app.main:app --reload
```

### 3. Test the API
Visit http://localhost:8000/docs to see the interactive API documentation.

### 4. Make a Request
```bash
curl -X POST "http://localhost:8000/api/v1/optimize" \
     -H "Content-Type: application/json" \
     -d '{
       "job_description": "We are looking for a Senior Software Engineer with experience in microservices, REST APIs, and team leadership.",
       "top_k": 5,
       "rewrite_style": "professional"
     }'
```

## 📁 Project Structure

```
phase2/
├── app/
│   ├── core/                   # Phase 1 code (embeddings, search)
│   ├── services/               # Business logic
│   │   ├── llm_service.py      # LLM integration
│   │   └── rag_service.py      # RAG pipeline
│   ├── schemas/                # Data models
│   │   └── rag.py              # RAG request/response models
│   ├── api/                    # API endpoints
│   │   └── rag.py              # RAG endpoints
│   └── main.py                 # FastAPI application
├── data/
│   ├── resume_points.txt       # Your Phase 1 data
│   ├── job_descriptions/       # Sample job descriptions
│   └── results/                # Generated results (auto-created)
└── requirements.txt
```

## 🔧 API Endpoints

### POST `/api/v1/optimize`
Main RAG endpoint that optimizes resume points for a job description.

**Request:**
```json
{
  "job_description": "Senior Software Engineer with microservices experience",
  "top_k": 5,
  "rewrite_style": "professional"
}
```

**Response:**
```json
{
  "job_description": "Senior Software Engineer with microservices experience",
  "retrieved_points": ["Led development of microservices architecture"],
  "rewritten_points": [
    {
      "original": "Led development of microservices architecture",
      "rewritten": "Architected scalable microservices solutions reducing system latency by 40%",
      "similarity_score": 0.87,
      "reasoning": "Added quantifiable impact and technical depth"
    }
  ],
  "processing_time": 2.34,
  "created_at": "2024-01-15T10:30:00Z"
}
```

### GET `/api/v1/health`
Health check endpoint.

### GET `/api/v1/stats`
Get RAG pipeline statistics.

### GET `/api/v1/results`
List all saved RAG results.

## 🧪 Testing

### Test with Sample Data
```bash
# Test with sample job description
curl -X POST "http://localhost:8000/api/v1/optimize" \
     -H "Content-Type: application/json" \
     -d '{
       "job_description": "We are looking for a Senior Software Engineer to join our team. The ideal candidate will have experience with building scalable backend systems and microservices, implementing automated testing and CI/CD pipelines, working with REST APIs and database optimization, leading technical teams and mentoring junior developers.",
       "top_k": 3,
       "rewrite_style": "professional"
     }'
```

### Test Different Styles
- `"professional"` - Business-focused, formal tone
- `"technical"` - Detailed, technical language
- `"concise"` - Short, impactful statements

## 📊 Results

Results are automatically saved to `data/results/` as JSON files with timestamps. You can:

1. View saved results via the `/api/v1/results` endpoint
2. Analyze the before/after comparisons
3. Track improvement over time

## 🔍 Understanding the RAG Pipeline

### 1. Retrieve (Vector Search)
- Uses your Phase 1 vector search to find relevant resume points
- Ranks points by similarity to job description
- Returns top-k most relevant points

### 2. Augment (Context Addition)
- Combines retrieved points with job description
- Creates rich context for the LLM
- Includes specific instructions for rewriting

### 3. Generate (LLM Rewriting)
- Uses OpenAI's language model to rewrite points
- Applies job-specific keywords and requirements
- Maintains original meaning while improving relevance

## 🎓 Learning Outcomes

After completing this phase, you'll understand:

- **RAG Architecture** - How retrieval and generation work together
- **Prompt Engineering** - How to craft effective LLM prompts
- **Context-Aware AI** - How to use retrieved information in generation
- **API Design** - How to expose AI functionality through REST APIs
- **System Integration** - How to combine multiple AI services

## 🚀 Next Steps

This Phase 2 sets you up for:
- **Phase 3**: Agentic Architecture with LangGraph
- **Phase 4**: Data & Personalization Layer
- **Phase 5**: Full Product MVP

## 🆘 Troubleshooting

### Common Issues

**"No resume points retrieved"**
- Check if `data/resume_points.txt` exists
- Verify vector store initialization in startup event

**"LLM rewriting failed"**
- Check your OpenAI API key in `.env`
- Verify API key has sufficient credits
- Check internet connection

**"Module not found" errors**
- Ensure all `__init__.py` files exist
- Check Python path and imports
- Verify directory structure

### Debug Mode
```bash
# Run with debug logging
uvicorn app.main:app --reload --log-level debug
```

## 📚 Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [RAG Systems Explained](https://docs.llamaindex.ai/en/stable/getting_started/concepts.html)
- [Prompt Engineering Guide](https://www.promptingguide.ai/)

Happy coding! 🚀


