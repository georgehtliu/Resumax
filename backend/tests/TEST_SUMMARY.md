# Test Suite Summary

Comprehensive test coverage for `/api/v1/select` and `/api/v1/optimize` endpoints.

## Test Files Overview

### 1. `test_selection_service.py` (16 tests)
Tests the SelectionService that selects bullets without rewriting.

**Test Classes:**
- `TestSelectionService` (7 tests)
  - Bullet selection for experiences
  - Empty resume handling
  - Experiences with no bullets
  - Respects bullets_per_experience limit
  - Keyword fallback when embeddings fail
  - Simple keyword matching
  - Keyword matching with no overlap

- `TestCalculateTotalLines` (3 tests)
  - Empty resume line count
  - Line count with experiences
  - Line count with all sections

- `TestIdentifyGaps` (2 tests)
  - Basic gap identification
  - Gap identification when resume has all skills

- `TestEstimateLatexLines` (4 tests)
  - Short bullet line estimation
  - Long bullet line estimation
  - Empty text handling
  - Custom chars_per_line parameter

### 2. `test_optimization_service.py` (6 tests)
Tests the OptimizationService that selects and rewrites bullets.

**Test Classes:**
- `TestOptimizationService` (6 tests)
  - Full optimization flow (selection + rewriting)
  - Rewriting failure handling
  - Empty selection handling
  - Partial match from optimizer
  - Optimization for all resume sections

### 3. `test_api_endpoints.py` (12 tests)
Integration tests for the API endpoints using FastAPI TestClient.

**Test Classes:**
- `TestSelectEndpoint` (5 tests)
  - Successful selection request
  - Missing job_description validation
  - Missing resume validation
  - Invalid bullets_per_experience validation
  - Empty resume handling
  - Error handling

- `TestOptimizeEndpoint` (4 tests)
  - Successful optimization request
  - Missing optional fields (uses defaults)
  - Invalid rewrite_style handling
  - Error handling

- `TestEndpointsComparison` (1 test)
  - Comparison between select and optimize responses
  - Verifies different response structures

## Test Coverage Summary

### ✅ SelectionService Coverage
- ✅ Bullet selection per section (experiences, education, projects, custom)
- ✅ Respects configuration limits (bullets_per_experience, etc.)
- ✅ Empty resume handling
- ✅ Missing bullets in sections
- ✅ Keyword fallback when embeddings fail
- ✅ Line count calculation
- ✅ Gap identification
- ✅ LaTeX line estimation

### ✅ OptimizationService Coverage
- ✅ Full flow (selection → rewriting)
- ✅ Rewriting success cases
- ✅ Rewriting failure handling (returns original bullets)
- ✅ Partial matches from optimizer
- ✅ All resume sections
- ✅ Error handling

### ✅ API Endpoint Coverage
- ✅ Request validation (required fields, valid ranges)
- ✅ Response structure validation
- ✅ Success cases
- ✅ Error handling (500 errors)
- ✅ Empty input handling
- ✅ Mode differentiation (select vs optimize)
- ✅ Response field differences (rewritten, original, reasoning)

## Running Tests

### Run all tests:
```bash
cd backend
pytest tests/ -v
```

### Run specific test file:
```bash
pytest tests/test_selection_service.py -v
pytest tests/test_optimization_service.py -v
pytest tests/test_api_endpoints.py -v
```

### Run with coverage:
```bash
pytest tests/ --cov=app.services --cov=app.api --cov-report=html
```

### Run specific test class:
```bash
pytest tests/test_selection_service.py::TestSelectionService -v
pytest tests/test_api_endpoints.py::TestSelectEndpoint -v
```

## Test Statistics

- **Total Tests**: 34 tests
- **SelectionService Tests**: 16 tests
- **OptimizationService Tests**: 6 tests
- **API Endpoint Tests**: 12 tests

## Mock Strategy

All tests use mocks to avoid:
- Real API calls (OpenAI embeddings, LLM)
- Vector database operations
- External dependencies

This ensures:
- ✅ Fast test execution
- ✅ No API costs
- ✅ Tests run in CI/CD
- ✅ Deterministic results

## Key Test Scenarios

### Happy Paths
- ✅ Select bullets from full resume
- ✅ Optimize bullets from full resume
- ✅ All sections processed correctly
- ✅ Response structure matches schema

### Edge Cases
- ✅ Empty resume
- ✅ Experience with no bullets
- ✅ Embedding generation failures
- ✅ Optimizer failures
- ✅ Partial matches

### Validation
- ✅ Missing required fields
- ✅ Invalid field values (negative, out of range)
- ✅ Invalid field types

### Error Handling
- ✅ Service errors return 500
- ✅ Error messages included in response
- ✅ Graceful degradation (fallback to keyword matching)

## Notes

- All tests use `pytest` and `unittest.mock`
- API tests use FastAPI's `TestClient`
- Tests are isolated (no shared state)
- Mocks prevent external API calls
- Tests can run without `.env` file or API keys

