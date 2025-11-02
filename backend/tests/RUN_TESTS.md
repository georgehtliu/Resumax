# Quick Test Guide

## Run All Tests

```bash
cd phase2
pytest tests/ -v
```

## Run Specific Test Suites

### Keyword Extraction Tests
```bash
pytest tests/test_hybrid_search.py::TestKeywordExtraction -v
```

### Keyword Scoring Tests
```bash
pytest tests/test_hybrid_search.py::TestKeywordScoring -v
```

### Hybrid Search Tests
```bash
pytest tests/test_hybrid_search.py::TestHybridSearch -v
```

### Integration Tests (requires API key)
```bash
python tests/test_hybrid_integration.py
```

## Expected Output

```
tests/test_hybrid_search.py::TestKeywordExtraction::test_extract_programming_languages PASSED
tests/test_hybrid_search.py::TestKeywordExtraction::test_extract_frontend_frameworks PASSED
tests/test_hybrid_search.py::TestKeywordExtraction::test_extract_cloud_services PASSED
...
======================== 13 passed in 2.18s ========================
```

## Test Statistics

- **Total Tests**: 20+ test cases
- **Test Categories**:
  - Keyword Extraction: 8 tests
  - Keyword Scoring: 5 tests
  - Hybrid Search: 4+ tests
  - Integration: 3+ tests

All tests use mocks and don't require API keys or external services (except integration tests).

