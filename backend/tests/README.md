# Backend Tests

This directory contains comprehensive tests for the resume optimization system.

## Test Files

### `test_hybrid_search.py`
Unit tests for hybrid search components using pytest and mocks:
- **TestKeywordExtraction**: Tests keyword extraction from job descriptions
- **TestKeywordScoring**: Tests keyword matching score computation
- **TestHybridSearch**: Tests hybrid search functionality
- **TestHybridVsSemantic**: Compares hybrid vs semantic-only search
- **TestIntegration**: Integration tests

### `test_hybrid_integration.py`
Integration tests that can run with real data (requires `OPENAI_API_KEY`):
- Keyword extraction with real job descriptions
- Keyword scoring with realistic resume bullets
- Hybrid vs semantic search comparison

### `test_selection_service.py` ⭐ NEW
Comprehensive tests for SelectionService (bullet selection without rewriting):
- **TestSelectionService**: Tests bullet selection per experience/education/project
- **TestCalculateTotalLines**: Tests LaTeX line count calculation
- **TestIdentifyGaps**: Tests skill gap identification
- **TestEstimateLatexLines**: Tests line estimation for bullets
- Covers: empty resumes, missing bullets, keyword fallback, limits, etc.

### `test_optimization_service.py` ⭐ NEW
Comprehensive tests for OptimizationService (selection + rewriting):
- **TestOptimizationService**: Tests full optimization flow
- Tests: rewriting success/failure, partial matches, all sections, error handling

### `test_api_endpoints.py` ⭐ NEW
Integration tests for `/api/v1/select` and `/api/v1/optimize` endpoints:
- **TestSelectEndpoint**: Tests selection endpoint (request/response validation)
- **TestOptimizeEndpoint**: Tests optimization endpoint
- **TestEndpointsComparison**: Compares select vs optimize responses
- Covers: success cases, error handling, validation, empty inputs, etc.

## Running Tests

### Run all pytest tests:
```bash
cd backend
pytest tests/ -v
```

### Run new endpoint tests:
```bash
# Selection service tests
pytest tests/test_selection_service.py -v

# Optimization service tests
pytest tests/test_optimization_service.py -v

# API endpoint tests
pytest tests/test_api_endpoints.py -v
```

### Run specific test file:
```bash
pytest tests/test_hybrid_search.py -v
pytest tests/test_selection_service.py -v
```

### Run specific test class:
```bash
pytest tests/test_hybrid_search.py::TestKeywordExtraction -v
pytest tests/test_selection_service.py::TestSelectionService -v
```

### Run with coverage:
```bash
pytest tests/ --cov=app.services --cov=app.api --cov-report=html
```

### Run integration tests (requires API key):
```bash
cd phase2
python tests/test_hybrid_integration.py
```

### Run tests with coverage:
```bash
pytest tests/ --cov=app.core --cov-report=html
```

## Test Coverage

The tests cover:

### Hybrid Search Tests
1. **Keyword Extraction**
   - Programming languages (Python, Java, TypeScript, etc.)
   - Frontend frameworks (React, Vue, Angular, etc.)
   - Cloud services (AWS, Docker, Kubernetes, etc.)
   - Databases (PostgreSQL, MongoDB, Redis, etc.)
   - Action verbs
   - Case-insensitive matching
   - Common word filtering

2. **Keyword Scoring**
   - Perfect matches (all keywords found)
   - Partial matches (some keywords found)
   - No matches (zero keywords found)
   - Case-insensitive matching
   - Edge cases (empty keywords, etc.)

3. **Hybrid Search**
   - Keyword extraction from job descriptions
   - Semantic + keyword score combination (70% semantic, 30% keyword)
   - Re-ranking of results
   - Edge cases (empty collection, failed embedding, etc.)

4. **Comparison Tests**
   - Hybrid vs semantic-only search
   - Verification that keyword matches boost rankings

### New Endpoint Tests ⭐
1. **SelectionService Tests**
   - Bullet selection per experience/education/project/custom section
   - Respects bullets_per_experience limits
   - Empty resume handling
   - Missing bullets in sections
   - Keyword fallback when embeddings fail
   - Line count calculation
   - Gap identification

2. **OptimizationService Tests**
   - Full optimization flow (selection + rewriting)
   - Rewriting success and failure cases
   - Partial matches from optimizer
   - All resume sections (experiences, education, projects, custom)
   - Error handling

3. **API Endpoint Tests**
   - `/api/v1/select` endpoint:
     - Success cases
     - Request validation (missing fields, invalid values)
     - Empty resume handling
     - Error handling
   - `/api/v1/optimize` endpoint:
     - Success cases
     - Optional field defaults
     - Error handling
   - Response structure validation
   - Mode differentiation (select vs optimize)
   - Response field differences (rewritten, original, reasoning)

## Requirements

- `pytest==7.4.3` (added to requirements.txt)
- For integration tests: `OPENAI_API_KEY` in `.env` file
- For integration tests: `data/resume_points.txt` with sample resume bullets

## Example Test Output

```
tests/test_hybrid_search.py::TestKeywordExtraction::test_extract_programming_languages PASSED
tests/test_hybrid_search.py::TestKeywordExtraction::test_extract_frontend_frameworks PASSED
tests/test_hybrid_search.py::TestKeywordScoring::test_keyword_score_perfect_match PASSED
...
```

## Notes

- Unit tests use mocks to avoid API calls and database operations
- Integration tests require actual API keys and may incur costs
- All tests should pass without external dependencies (mocked tests)
- Integration tests are optional and will skip if API key is not set

