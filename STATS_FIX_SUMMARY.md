# Statistics Fix Summary

## Problem Identified

The home page statistics were showing incorrect values because they included **289 hourly wage classifications** (with values under $100) mixed with annual salary data.

### Before Fix:

- Showed "811 classifications" (including hourly wages)
- Lowest salary showed as ~$2 (hourly rate, not annual)
- Average salary skewed by mixing hourly and annual rates
- Stats were misleading

### After Fix:

- Shows **514 annual salary classifications** only
- **289 hourly wage classifications excluded** from statistics
- Proper annual salary ranges: $25,607 to $266,454
- Average top salary: $110,764 (realistic annual figure)

## Changes Made

### 1. API Endpoint (`pages/api/top.ts`)

Added filter to exclude hourly rates when calculating top salaries:

```typescript
// Exclude hourly rates (under $1000) to avoid polluting statistics
if (!Number.isNaN(num) && num >= 1000) topResult[code] = num;
```

### 2. Statistics Calculation (`pages/index.tsx`)

Added filtering in stats calculation:

```typescript
// Filter out hourly rates (under $1000) - only keep annual salaries
const topValues = Object.values(topSalaries).filter(
	(value): value is number => typeof value === 'number' && value >= 1000
);

// Skip hourly rates when collecting min salaries
if (num < 1000) {
	hourlyCount++;
	return;
}
```

## Classification Breakdown

### Total: 811 entries

- **514 Annual Salary** classifications (63.4%)
  - 444 Collective Agreement (86.4%)
  - 70 Unrepresented/Excluded (13.6%)
- **289 Hourly Wage** classifications (35.7%) - NOW EXCLUDED from stats
- **8 Empty** entries (1.0%)

## Corrected Statistics

### Annual Salary Classifications Only:

| Metric                     | Value       |
| -------------------------- | ----------- |
| **Total Classifications**  | 514         |
| **Collective Agreement**   | 444 (86.4%) |
| **Unrepresented/Excluded** | 70 (13.6%)  |
| **Highest Top Salary**     | $266,454    |
| **Average Top Salary**     | $110,764    |
| **Lowest Starting Salary** | $25,607     |

## Hourly Wage Classifications (Excluded)

Examples of classifications now properly excluded from stats:

- **GL-** prefix (General Labour): 187 classifications (e.g., GL-AMW-1 to GL-WOW-14)
- **EL-** (Electronics): 9 classifications
- **HP-** (Heating, Power and Stationary): 9 classifications
- **HS-** (Hospital Services): 20 classifications
- **SO-** (Ships' Officers): 23 classifications
- **IT-01** (Information Technology Level 1): Hourly rate
- And many more...

These are legitimate classifications but represent hourly wages, not annual salaries, so they shouldn't be mixed in statistics.

## UI Display

The home page now shows:

- **Total classifications**: 514 ✅
- **Helper text**: "444 collective agreement, 70 unrepresented/excluded." ✅
- **Highest top salary**: $266,454 ✅
- **Average top salary**: $110,764 ✅
- **Lowest starting salary**: $25,607 ✅

All values are now realistic annual salary figures!

## Validation

Created validation scripts:

- `check-salary-issues.js` - Identifies hourly vs annual classifications
- `validate-stats-fix.js` - Confirms statistics exclude hourly rates

Run `node validate-stats-fix.js` to verify the fix is working correctly.

## Technical Details

**Threshold**: $1,000

- Values under $1,000 = Hourly wage (excluded)
- Values >= $1,000 = Annual salary (included in stats)

**Why $1,000?**

- Lowest annual salary is $25,607 (well above threshold)
- Highest hourly rate is ~$82 (well below threshold)
- Clear separation with no false positives

## Impact

✅ **Statistics are now accurate** - Only comparing annual salaries to annual salaries
✅ **User experience improved** - Meaningful, realistic salary data
✅ **Hourly wages still accessible** - Data preserved, just excluded from aggregate stats
✅ **No data loss** - All 811 classifications still in database and searchable
