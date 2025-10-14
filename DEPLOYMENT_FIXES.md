# Deployment Calculator Fixes - October 14, 2025

## Issues Fixed

### 1. Incorrect Formula ✅

**Problem**: The deployment eligibility formula was using the minimum increment from the FROM (current) position instead of the TO (new) position.

**Correct Formula**:

- Find the maximum basic rate of pay for the new position
- Find the maximum basic rate of pay for the current position
- Calculate the difference between the maximums
- Find the **lowest pay increment in the NEW position's pay scale**
- Compare: If the difference < minimum increment of NEW position → Deployment, otherwise → Promotion

**Fix**: Updated `deployment.tsx` lines 140-166 to:

- Calculate `minIncrement` using `toSteps` (NEW position) instead of `fromSteps`
- Updated user-facing messages to reference the TO code instead of FROM code
- Changed the single-step check from `fromSteps.length === 1` to `toSteps.length === 1`

### 2. Superseded Classifications ✅

**Problem**: FI (Financial Management) codes appeared in dropdowns even though they've been replaced by CT-FIN (Comptrollership - Finance).

**Examples**:

- `FI-01` → replaced by `CT-FIN-01`
- `FI-02` → replaced by `CT-FIN-02`
- `FI-03` → replaced by `CT-FIN-03`
- `FI-04` → replaced by `CT-FIN-04`

**Fix**:

- Created `lib/salary-utils.ts` with `SUPERSEDED_CODES` constant
- Updated all pages (`deployment.tsx`, `search.tsx`, `equivalency.tsx`) to filter out superseded codes
- FI codes last updated November 7, 2022 vs CT-FIN codes updated through November 7, 2025

### 3. Future Salary Rates ✅

**Problem**: The calculator was using the most recent rate in the array, which could be a future effective date. For example, CT-FIN-01 was showing $93,965 (effective November 7, 2025) instead of the current rate.

**Fix**:

- Created `getCurrentRates()` function in `lib/salary-utils.ts`
- Parses effective dates and filters to only rates where `effective-date <= today`
- Created `getMostRecentCurrentRate()` to get the latest rate that's currently in effect
- Updated `deployment.tsx` to use this function in `extractSteps()`

## Files Modified

### New Files

- `lib/salary-utils.ts` - Shared utilities for filtering current rates and superseded codes

### Updated Files

- `pages/deployment.tsx` - Fixed formula logic, added current rate filtering
- `pages/search.tsx` - Added superseded code filtering
- `pages/equivalency.tsx` - Added superseded code filtering

## Technical Details

### Date Parsing

The system parses various date formats from the Treasury Board data:

- Pattern: `/(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}/`
- Examples: "November 7, 2025", "August 5, 2024"
- Legacy entries without parseable dates are included by default

### Deployment Logic Flow

1. Extract current (not future) salary steps for both FROM and TO positions
2. Calculate minimum increment between steps in TO position
3. Get maximum salaries for both positions
4. Calculate difference: `toMax - fromMax`
5. Compare: `abs(difference) < minIncrement` → Deployment allowed

## Testing Recommendations

### Test Case 1: Future Date Filtering

- Classification: `CT-FIN-01`
- Today: October 14, 2025
- Should use: November 7, 2024 rate (step-7: $92,123)
- Should NOT use: November 7, 2025 rate (step-7: $93,965)

### Test Case 2: Superseded Codes

- Verify FI-01, FI-02, FI-03, FI-04 do NOT appear in any dropdowns
- Verify CT-FIN-01, CT-FIN-02, CT-FIN-03, CT-FIN-04 DO appear

### Test Case 3: Correct Formula

- FROM: Position with max salary $80,000
- TO: Position with max salary $82,000 (min increment $4,000)
- Difference: $2,000
- Expected: Deployment allowed (difference $2,000 < increment $4,000)
- Message should reference TO position's increment, not FROM

## Benefits

1. **Accuracy**: Uses correct Treasury Board deployment eligibility rules
2. **Current Data**: Only shows salaries currently in effect, not future rates
3. **Clean UI**: Removes obsolete classification codes from dropdowns
4. **Maintainability**: Centralized utility functions for reuse across pages
5. **Transparency**: Clear error messages explaining why deployment is/isn't allowed

## Future Improvements

Consider adding:

- Admin tool to identify other superseded classifications
- Warning banner if comparing classifications with very old effective dates
- Automated detection of future vs current rates with visual indicators
