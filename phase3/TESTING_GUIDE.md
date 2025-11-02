# Phase 3 Testing Guide

## 🚀 Quick Start

### Step 1: Set Up Environment

1. **Check if .env exists:**
   ```bash
   cd phase3
   ls -la .env
   ```

2. **If .env doesn't exist, create it:**
   ```bash
   cp env.example .env
   ```

3. **Add your OpenAI API key:**
   ```bash
   # Edit .env file and add your API key
   OPENAI_API_KEY=sk-your-actual-api-key-here
   ```

### Step 2: Install Dependencies (if not already done)

```bash
pip install -r requirements.txt
```

---

## 🧪 Testing Methods

### Method 1: Run Test Script (Recommended for First Test)

This tests the unified optimizer directly:

```bash
cd phase3
python test_unified_optimizer.py
```

**What it tests:**
- ✅ Unified optimizer with strict mode
- ✅ Unified optimizer with creative mode
- ✅ Complete RAG service pipeline
- ✅ Gap identification
- ✅ New bullet suggestions

**Expected output:**
```
🚀 Phase 3 Unified Optimizer Test Suite
============================================================
🧪 Testing Unified Optimizer...
============================================================

📝 Test Input:
   Job Description: Senior Software Engineer with experience in microservices...
   Bullets: 4 resume points

🔍 Testing STRICT mode...
✅ Optimization completed!
   - Rankings: 4
   - Gaps identified: 2
   - New bullets: 0

📊 Sample Ranking:
   Original: Led development of microservices architecture...
   Rewritten: Architected scalable microservices solutions...
   Relevance: 0.85

...
```

---

### Method 2: Start API Server & Test via HTTP

#### 2.1 Start the Server

```bash
cd phase3
uvicorn app.main:app --reload
```

You should see:
```
🚀 Starting AI Resume Optimizer - Phase 3 Unified Optimizer
📊 Initializing vector store...
✅ Loaded X resume points into vector store
🎉 Unified Optimizer ready!
INFO:     Uvicorn running on http://127.0.0.1:8000
```

#### 2.2 Test via Browser

Open your browser:
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/api/v1/health
- **Root**: http://localhost:8000

#### 2.3 Test via cURL

**Strict Mode:**
```bash
curl -X POST "http://localhost:8000/api/v1/optimize" \
     -H "Content-Type: application/json" \
     -d '{
       "job_description": "Senior Software Engineer with experience in microservices, Python, REST APIs, and team leadership",
       "top_k": 5,
       "optimization_mode": "strict"
     }'
```

**Creative Mode:**
```bash
curl -X POST "http://localhost:8000/api/v1/optimize" \
     -H "Content-Type: application/json" \
     -d '{
       "job_description": "Senior Software Engineer with experience in microservices, Python, REST APIs, and team leadership",
       "top_k": 5,
       "optimization_mode": "creative"
     }'
```

**Expected Response:**
```json
{
  "job_description": "...",
  "retrieved_points": ["...", "..."],
  "rewritten_points": [
    {
      "original": "...",
      "rewritten": "...",
      "similarity_score": 0.87,
      "reasoning": "..."
    }
  ],
  "gaps": ["Kubernetes", "CI/CD"],
  "new_bullet_suggestions": [],
  "processing_time": 2.45,
  "created_at": "2024-11-01T18:30:00"
}
```

#### 2.4 Test via Python Script

Create `test_api.py`:
```python
import requests
import json

url = "http://localhost:8000/api/v1/optimize"

payload = {
    "job_description": "Senior Software Engineer with experience in microservices, Python, REST APIs",
    "top_k": 5,
    "optimization_mode": "strict"
}

response = requests.post(url, json=payload)
print(json.dumps(response.json(), indent=2))
```

Run:
```bash
python test_api.py
```

---

### Method 3: Interactive Testing with Python REPL

```bash
cd phase3
python
```

```python
import asyncio
from app.services.unified_optimizer import UnifiedOptimizer

async def test():
    optimizer = UnifiedOptimizer()
    result = await optimizer.optimize_resume(
        bullets=["Led microservices development", "Built REST APIs"],
        job_description="Senior Software Engineer with microservices experience",
        mode="strict"
    )
    print(result)

asyncio.run(test())
```

---

## ✅ What to Check

### 1. **Health Check**
```bash
curl http://localhost:8000/api/v1/health
```

Should return:
```json
{
  "status": "healthy",
  "service": "RAG Pipeline (Unified Optimizer)",
  "version": "3.0.0",
  ...
}
```

### 2. **Vector Store Initialized**
Check startup logs for:
```
✅ Loaded X resume points into vector store
```

### 3. **Optimization Works**
- ✅ Response includes `rewritten_points`
- ✅ Each point has `original`, `rewritten`, `similarity_score`, `reasoning`
- ✅ Response includes `gaps` array
- ✅ Response includes `new_bullet_suggestions` (empty in strict mode)
- ✅ `processing_time` is reasonable (< 10 seconds)

### 4. **Mode Differences**
- **Strict mode**: `new_bullet_suggestions` should be empty
- **Creative mode**: `new_bullet_suggestions` may contain suggestions

---

## 🐛 Troubleshooting

### Issue: "OPENAI_API_KEY not found"

**Solution:**
```bash
# Check if .env exists
ls -la .env

# If not, create it
cp env.example .env

# Edit .env and add your API key
# OPENAI_API_KEY=sk-...
```

### Issue: "No resume points file found"

**Solution:**
```bash
# Check if file exists
ls -la data/resume_points.txt

# If not, create sample data
mkdir -p data
cat > data/resume_points.txt << EOF
Led development of microservices architecture using Python and Docker
Implemented automated testing pipeline with CI/CD
Built REST APIs for client applications
Managed team of 3 junior developers
EOF
```

### Issue: "Module not found" errors

**Solution:**
```bash
# Make sure you're in the phase3 directory
cd phase3

# Install dependencies
pip install -r requirements.txt

# Run from phase3 directory
python test_unified_optimizer.py
```

### Issue: API returns 500 error

**Check:**
1. Is the server running?
2. Is OPENAI_API_KEY set correctly?
3. Do you have internet connection?
4. Check server logs for errors

### Issue: "ChromaDB error"

**Solution:**
```bash
# Remove old ChromaDB data
rm -rf chroma_db/

# Restart server - it will recreate the database
```

---

## 📊 Expected Performance

- **Response time**: 2-5 seconds per optimization
- **Cost**: ~$0.01-0.02 per request (with gpt-4o-mini)
- **Success rate**: Should work 95%+ of the time

---

## 🎯 Test Checklist

- [ ] Environment variable set (.env file exists)
- [ ] Dependencies installed
- [ ] Resume points file exists
- [ ] Test script runs successfully
- [ ] API server starts without errors
- [ ] Health endpoint returns "healthy"
- [ ] Optimization endpoint works (strict mode)
- [ ] Optimization endpoint works (creative mode)
- [ ] Gaps are identified correctly
- [ ] New bullets are suggested in creative mode
- [ ] Response includes all required fields

---

## 🚀 Next Steps After Testing

1. **Verify Results**: Check that optimized bullets make sense
2. **Compare Modes**: See difference between strict and creative
3. **Check Gaps**: Review identified gaps - are they accurate?
4. **Test Edge Cases**: Empty job descriptions, very long bullets, etc.
5. **Production Ready**: Once tested, you're ready for Phase 4!

---

Happy Testing! 🎉



