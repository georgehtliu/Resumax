# Experience Selection - Hybrid Algorithm Implementation Summary

## Overview

Enhanced the `SelectionService` with a **hybrid algorithm** that combines:
1. **Fast initial selection** (priority queue-based)
2. **Iterative refinement** ("The Squeeze" - bullet-level optimization)
3. **Must-Haves protection** (Anchor + Trophy)
4. **Revive phase** (fill underutilized space)

This maximizes relevance while ensuring the resume fits within one page (50 lines).

## Key Features

### 1. Multi-Factor Experience Scoring

Each experience is scored using a weighted composite:

```
Score = (Relevance × 0.5) + (Recency × 0.2) + (Prestige × 0.2) + (Role Match × 0.1)
```

- **Relevance (50%)**: Average of top bullet scores against job description
- **Recency (20%)**: Position-based score (most recent = 1.0, older = 0.2)
- **Prestige (20%)**: Company prestige score (FAANG/unicorns = 1.0, unknown = 0.2)
- **Role Match (10%)**: Job title similarity to job description

### 2. Hybrid Algorithm (4 Phases)

**Phase 1: Preparation & Valuation**
- Score ALL bullets globally (not just top N per experience)
- Calculate composite scores for all experiences
- Identify "Must-Haves": Anchor (most recent) + Trophy (highest prestige)

**Phase 2: Initial Fill (Coarse Selection)**
- Lock must-haves into selection
- Priority queue selection for remaining experiences
- Fill with buffer (10% over limit) to allow for squeeze phase

**Phase 3: The Squeeze (Fine Optimization)**
- Iteratively remove globally lowest-scoring bullets
- Operates on individual bullets across all experiences (not whole experiences)
- Handle orphan blocks:
  - Must-haves: One-liner mode (company, role, dates only)
  - Others: Remove entirely

**Phase 4: Revive (Fill Underutilized Space)**
- If significantly under limit (5+ lines), revive highest-scoring deleted bullets
- Ensures optimal space utilization

### 3. Prestigious Companies List

Includes FAANG, top tech companies, unicorns, and well-known firms:
- Google, Meta, Amazon, Apple, Netflix, Microsoft
- Tesla, Nvidia, Uber, Airbnb, Stripe, OpenAI, etc.
- Finance & Consulting: Goldman Sachs, McKinsey, etc.

### 4. Space Management

- **Reserves space** for other sections (education, projects, custom)
- **Estimates** line counts for non-experience sections
- **Optimizes** experience selection within available space

## Algorithm Flow

```
PHASE 1: Preparation & Valuation
├── Score ALL bullets globally (for global optimization)
├── Calculate composite scores for experiences
└── Identify Must-Haves (Anchor + Trophy)

PHASE 2: Initial Fill (Coarse Selection)
├── Lock must-haves into selection
├── Priority queue for remaining experiences
└── Fill with 10% buffer (for squeeze phase)

PHASE 3: The Squeeze (Fine Optimization)
├── While over limit:
│   ├── Find globally lowest-scoring bullet
│   ├── Remove bullet (unless protected)
│   └── Handle orphans (one-liner or remove)
└── Until under limit

PHASE 4: Revive (Fill Underutilized Space)
├── If 5+ lines under limit:
│   └── Revive highest-scoring deleted bullets
└── Until optimal space utilization
```

## Example Scenarios

### Scenario 1: Google Experience (Unrelated but Prestigious)
- **Relevance**: 0.2 (low - unrelated work)
- **Recency**: 1.0 (most recent)
- **Prestige**: 1.0 (Google)
- **Role Match**: 0.3
- **Composite Score**: 0.2×0.5 + 1.0×0.2 + 1.0×0.2 + 0.3×0.1 = **0.53**

**Result**: Included even if less relevant due to recency + prestige bonuses

### Scenario 2: Highly Relevant Experience
- **Relevance**: 0.9 (very relevant)
- **Recency**: 0.5 (2-3 years ago)
- **Prestige**: 0.2 (unknown company)
- **Role Match**: 0.8
- **Composite Score**: 0.9×0.5 + 0.5×0.2 + 0.2×0.2 + 0.8×0.1 = **0.67**

**Result**: High priority due to strong relevance

### Scenario 3: Space Constraints
- If resume has 5 experiences but only 30 lines available:
  - Selects top 3-4 experiences by score
  - Removes lowest-scoring if over limit
  - Fills remaining space with next best fit

## Code Changes

### New Methods Added

1. `_select_experiences_with_priority_queue()` - Main hybrid algorithm (4 phases)
2. `_score_all_bullets_for_experience()` - Score ALL bullets (for global optimization)
3. `_score_experience()` - Composite scoring
4. `_calculate_relevance_score()` - Average bullet scores
5. `_calculate_recency_score()` - Position-based recency
6. `_calculate_prestige_score()` - Company prestige
7. `_calculate_role_match_score()` - Job title similarity
8. `_is_prestigious_company()` - Prestige check
9. `_estimate_experience_lines()` - Line count estimation
10. `_estimate_other_sections_lines()` - Space reservation

### Modified Methods

- `select_bullets()` - Now uses priority queue for experiences
- Added space reservation for other sections

## Benefits

1. **Maximizes Relevance** - Global bullet-level optimization (not just experience-level)
2. **Fits One Page** - Iterative refinement ensures exact fit within 50 lines
3. **Smart Filling** - Revive phase fills underutilized space optimally
4. **Must-Haves Protection** - Explicitly locks Anchor + Trophy (never removed)
5. **Orphan Handling** - One-liner mode preserves prestige even with no bullets
6. **Granular Control** - Can keep high-relevance bullets from low-scoring experiences
7. **Efficient** - Fast initial selection + targeted refinement (best of both worlds)

## Configuration

- `max_lines = 50` - One page limit (configurable)
- `PRESTIGIOUS_COMPANIES` - List of prestigious companies (extensible)
- Score weights can be adjusted in `_score_experience()`

## Testing Recommendations

1. Test with various experience counts (2-10 experiences)
2. Test with prestigious vs. non-prestigious companies
3. Test with different relevance levels
4. Test edge cases (all experiences fit, none fit, etc.)
5. Verify one-page constraint is maintained

## Key Improvements Over Original Algorithm

1. **Bullet-Level Optimization** - Operates on individual bullets globally, not just experiences
2. **Iterative Refinement** - "The Squeeze" phase fine-tunes to exact line count
3. **Explicit Must-Haves** - Anchor + Trophy logic ensures critical experiences are never removed
4. **Orphan Handling** - One-liner mode for must-haves preserves prestige
5. **Revive Phase** - Fills underutilized space with highest-scoring deleted bullets
6. **Better Space Utilization** - Gets closer to 50-line limit than single-pass approach

## Future Enhancements

1. **LaTeX Formatting** - Escape special characters, date standardization, `\vspace` adjustments
2. **Dynamic bullet count** - Adjust bullets per experience based on space during squeeze
3. **LLM-based scoring** - Use LLM for more nuanced relevance scoring
4. **User preferences** - Allow users to prioritize certain experiences
5. **Two-page mode** - Support for two-page resumes
6. **Section balancing** - Optimize all sections together (not just experiences)

