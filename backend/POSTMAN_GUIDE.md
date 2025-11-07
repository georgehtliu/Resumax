# Postman Testing Guide

Quick reference for testing `/api/v1/select` and `/api/v1/optimize` endpoints.

## Base URL
```
http://localhost:8000
```

## Endpoint 1: POST /api/v1/select

**Purpose**: Select top bullets per experience without rewriting (fast)

**URL**: `POST http://localhost:8000/api/v1/select`

**Headers**:
```
Content-Type: application/json
```

**Request Body** (see `postman_mock_data.json` for full example):

```json
{
  "job_description": "We are looking for a Senior Software Engineer with experience in microservices architecture, Python development, REST APIs, Kubernetes, Docker, CI/CD pipelines, and team leadership.",
  "resume": {
    "experiences": [
      {
        "id": "exp-1",
        "company": "Google",
        "role": "Software Engineer II",
        "startDate": "Jun 2022",
        "endDate": "Present",
        "bullets": [
          {
            "id": "bullet-1",
            "text": "Developed and maintained microservices handling 10M+ daily requests using Python, Go, and Kubernetes"
          },
          {
            "id": "bullet-2",
            "text": "Optimized database queries and caching strategies, reducing API response time by 40%"
          },
          {
            "id": "bullet-3",
            "text": "Led a team of 3 engineers to ship a new recommendation feature"
          }
        ]
      }
    ],
    "education": [],
    "projects": [],
    "customSections": []
  },
  "bullets_per_experience": 3,
  "bullets_per_education": 2,
  "bullets_per_project": 2,
  "bullets_per_custom": 5
}
```

**Expected Response**:
```json
{
  "mode": "select",
  "selectedResume": {
    "experiences": [
      {
        "id": "exp-1",
        "company": "Google",
        "role": "Software Engineer II",
        "startDate": "Jun 2022",
        "endDate": "Present",
        "selectedBullets": [
          {
            "id": "bullet-1",
            "text": "Developed and maintained microservices handling 10M+ daily requests...",
            "relevanceScore": 0.92,
            "lineCount": 1
          }
        ]
      }
    ]
  },
  "totalLineCount": 45,
  "maxLines": 50,
  "fitsOnePage": true,
  "gaps": ["Machine learning"],
  "processing_time": 0.5,
  "created_at": "2024-01-15T10:30:00Z"
}
```

---

## Endpoint 2: POST /api/v1/optimize

**Purpose**: Select top bullets AND rewrite them with LLM (slower)

**URL**: `POST http://localhost:8000/api/v1/optimize`

**Headers**:
```
Content-Type: application/json
```

**Request Body**:

```json
{
  "job_description": "We are looking for a Senior Software Engineer with experience in microservices architecture, Python development, REST APIs, Kubernetes, Docker, CI/CD pipelines, and team leadership.",
  "resume": {
    "experiences": [
      {
        "id": "exp-1",
        "company": "Google",
        "role": "Software Engineer II",
        "startDate": "Jun 2022",
        "endDate": "Present",
        "bullets": [
          {
            "id": "bullet-1",
            "text": "Developed and maintained microservices handling 10M+ daily requests using Python, Go, and Kubernetes"
          },
          {
            "id": "bullet-2",
            "text": "Optimized database queries and caching strategies, reducing API response time by 40%"
          }
        ]
      }
    ],
    "education": [],
    "projects": [],
    "customSections": []
  },
  "bullets_per_experience": 3,
  "bullets_per_education": 2,
  "bullets_per_project": 2,
  "bullets_per_custom": 5,
  "rewrite_style": "professional",
  "optimization_mode": "strict"
}
```

**Expected Response**:
```json
{
  "mode": "optimize",
  "optimizedResume": {
    "experiences": [
      {
        "id": "exp-1",
        "company": "Google",
        "role": "Software Engineer II",
        "selectedBullets": [
          {
            "id": "bullet-1",
            "text": "Architected scalable microservices handling 10M+ daily requests...",
            "relevanceScore": 0.92,
            "lineCount": 1,
            "original": "Developed and maintained microservices...",
            "rewritten": "Architected scalable microservices...",
            "reasoning": "Enhanced with quantifiable metrics"
          }
        ]
      }
    ]
  },
  "totalLineCount": 45,
  "maxLines": 50,
  "fitsOnePage": true,
  "gaps": ["Machine learning"],
  "processing_time": 2.5,
  "created_at": "2024-01-15T10:30:00Z"
}
```

---

## Quick Test Examples

### Minimal Test (Select Endpoint)
```json
{
  "job_description": "Python developer with microservices experience",
  "resume": {
    "experiences": [
      {
        "id": "exp-1",
        "company": "Tech Corp",
        "role": "Software Engineer",
        "bullets": [
          {"id": "b1", "text": "Developed Python microservices"},
          {"id": "b2", "text": "Built REST APIs"}
        ]
      }
    ],
    "education": [],
    "projects": [],
    "customSections": []
  },
  "bullets_per_experience": 2
}
```

### Full Resume Test (Optimize Endpoint)
Use the complete example from `postman_mock_data.json` - includes:
- 3 experiences with 5-8 bullets each
- 1 education entry with 4 bullets
- 2 projects with 4 bullets each
- 2 custom sections (Skills, Awards)

---

## Response Differences

### Select Endpoint (`/select`)
- Returns `selectedResume` with `selectedBullets`
- Each bullet has: `id`, `text`, `relevanceScore`, `lineCount`
- No `original` or `rewritten` fields
- Faster (~0.5-1 second)

### Optimize Endpoint (`/optimize`)
- Returns `optimizedResume` with `selectedBullets`
- Each bullet has: `id`, `text`, `relevanceScore`, `lineCount`, `original`, `rewritten`, `reasoning`
- `text` field contains the rewritten version
- Slower (~2-5 seconds, includes LLM calls)

---

## Testing Tips

1. **Start with `/select`** - Faster, no LLM costs
2. **Use minimal example first** - Verify endpoint works
3. **Check `fitsOnePage`** - Should be `true` if `totalLineCount <= 50`
4. **Verify `gaps`** - Lists missing skills from job description
5. **Compare responses** - `/select` vs `/optimize` to see rewriting

---

## Common Issues

### 422 Validation Error
- Check required fields: `job_description`, `resume`
- Verify `bullets_per_experience` is between 1-10
- Ensure all bullet objects have `id` and `text`

### 500 Server Error
- Check if server is running: `uvicorn app.main:app --reload`
- Verify `OPENAI_API_KEY` is set (for `/optimize` endpoint)
- Check server logs for detailed error messages

---

## Full Mock Data

### Option 1: Generic Mock Data
See `tests/postman_mock_data.json` for complete examples with:
- Multiple experiences
- Education entries
- Projects
- Custom sections
- Various bullet counts

### Option 2: Real Resume Data
See `tests/george_liu_resume.json` for a real-world resume example with:
- Complete resume with all experiences (Tesla, Ford, Huawei, Trend Micro)
- Education (University of Waterloo)
- Projects (Resumax, Type Glazer)
- Sample job descriptions for testing
- Ready-to-use request examples for both `/select` and `/optimize` endpoints

**Quick Start with Real Resume:**
1. Open `tests/george_liu_resume.json`
2. Copy the `example_select_request` or `example_optimize_request` object
3. Paste into Postman request body
4. Modify `job_description` to match the role you're applying for

