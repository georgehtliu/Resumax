# Hybrid Search Tests

This directory contains comprehensive tests for the hybrid search functionality.

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

## Running Tests

### Run all pytest tests:
```bash
cd phase2
pytest tests/ -v
```

### Run specific test file:
```bash
pytest tests/test_hybrid_search.py -v
```

### Run specific test class:
```bash
pytest tests/test_hybrid_search.py::TestKeywordExtraction -v
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

