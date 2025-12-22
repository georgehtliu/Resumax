# Experience Selection Hybrid Algorithm - Test Suite

## Overview

Comprehensive unit tests for the hybrid algorithm experience selection functionality. Tests cover all major scenarios including Must-Haves, Squeeze phase, Revive phase, and Orphan handling.

## Test Coverage

### 1. Prestigious Company Handling
- **`test_prestigious_company_included`**: Verifies that prestigious companies (e.g., Google) are included even if their work is less relevant to the job description
- **`test_is_prestigious_company`**: Tests the prestigious company detection logic

### 2. Recency Scoring
- **`test_most_recent_experience_included`**: Ensures the most recent experience is prioritized
- **`test_recency_score_calculation`**: Verifies recency scoring based on position in experience list

### 3. Relevance-Based Selection
- **`test_high_relevance_selected_first`**: Confirms that highly relevant experiences are selected first
- **`test_priority_queue_selects_highest_scores_first`**: Verifies the priority queue correctly orders experiences by score

### 4. Space Constraints
- **`test_space_constraints_respected`**: Ensures selection respects the 50-line page limit
- **`test_all_experiences_fit`**: Tests behavior when all experiences fit within the limit

### 5. Score Calculation
- **`test_composite_score_calculation`**: Verifies the composite scoring formula (relevance + recency + prestige + role match)
- **`test_prestige_score_calculation`**: Tests prestige score calculation for different companies
- **`test_role_match_score_calculation`**: Tests role match scoring

### 6. Edge Cases
- **`test_empty_experiences_handled`**: Ensures empty experience list is handled gracefully
- **`test_estimate_experience_lines`**: Tests line count estimation for experiences

### 7. Hybrid Algorithm Features (NEW)
- **`test_must_haves_anchor_and_trophy`**: Verifies that Must-Haves (Anchor + Trophy) are always included
- **`test_squeeze_phase_removes_lowest_bullets`**: Tests that Squeeze phase removes globally lowest-scoring bullets
- **`test_orphan_one_liner_mode`**: Tests that must-have experiences with no bullets go to one-liner mode
- **`test_revive_phase_fills_space`**: Tests that Revive phase adds back high-scoring bullets if under limit
- **`test_global_bullet_optimization`**: Tests that algorithm optimizes bullets globally, not just per experience
- **`test_score_all_bullets_method`**: Tests the method that scores all bullets for global optimization

## Running the Tests

```bash
# Run all selection service tests
pytest tests/test_selection_service.py -v

# Run only priority queue tests
pytest tests/test_selection_service.py::TestExperienceSelectionPriorityQueue -v

# Run hybrid algorithm feature tests
pytest tests/test_selection_service.py::TestHybridAlgorithmFeatures -v

# Run a specific test
pytest tests/test_selection_service.py::TestExperienceSelectionPriorityQueue::test_prestigious_company_included -v
```

## Test Scenarios

### Scenario 1: Prestigious Company (Google)
**Input**: 
- Experience 1: Google (unrelated work, most recent)
- Experience 2: Small Startup (highly relevant work)

**Expected**: Google experience is included due to prestige + recency bonuses

### Scenario 2: High Relevance
**Input**:
- Experience 1: Low relevance work
- Experience 2: High relevance work (matches job description keywords)

**Expected**: High relevance experience is selected first

### Scenario 3: Space Constraints
**Input**: 10 experiences that would exceed 50 lines

**Expected**: Subset of experiences selected that fits within 50 lines

### Scenario 4: Composite Scoring
**Input**: Experience with:
- High relevance (0.9)
- Most recent (1.0)
- Prestigious company (1.0)
- Role match (>0)

**Expected**: High composite score (>0.5)

## Key Assertions

1. **Prestigious companies are included** even if less relevant
2. **Most recent experience** is prioritized
3. **High relevance experiences** are selected first
4. **Page limit (50 lines)** is respected
5. **Composite scores** are calculated correctly
6. **Edge cases** are handled gracefully

## Mocking Strategy

Tests use mocks for:
- `VectorSearch` - Embedding generation
- `numpy.dot` - Cosine similarity calculation
- `numpy.linalg.norm` - Vector normalization

This allows tests to run without actual API calls or complex vector operations.

## Test Scenarios for Hybrid Algorithm

### Scenario 1: Must-Haves Protection
**Input**: 
- Experience 1: Google (most recent + prestigious) - Anchor + Trophy
- Experience 2: Startup (highly relevant)

**Expected**: Google always included, even if all bullets removed (one-liner mode)

### Scenario 2: The Squeeze Phase
**Input**: Multiple experiences that exceed 50 lines

**Expected**: 
- Globally lowest-scoring bullets removed first
- Must-haves protected (can't remove last bullet)
- Orphan handling: one-liner mode for must-haves, removal for others

### Scenario 3: Revive Phase
**Input**: After squeeze, resume is 5+ lines under limit

**Expected**: Highest-scoring deleted bullets added back until optimal space utilization

### Scenario 4: Global Bullet Optimization
**Input**:
- Low-scoring experience with high-relevance bullet
- High-scoring experience with low-relevance bullet

**Expected**: High-relevance bullet from low-scoring experience kept over low-relevance bullet from high-scoring experience

## Future Test Additions

1. **Integration tests** with real embeddings
2. **Performance tests** for large experience lists (100+)
3. **Boundary tests** for exact 50-line scenarios
4. **Multi-section tests** (experiences + education + projects)
5. **Score weight adjustment tests** (different weight configurations)
6. **Squeeze iteration limit tests** (verify max_iterations safety)
7. **Revive threshold tests** (verify 5-line threshold behavior)

