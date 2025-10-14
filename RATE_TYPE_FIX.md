# ✅ Fixed Hourly/Weekly/Monthly Rate Display & Classification

## Problem Statement

Hourly, weekly, and monthly rates were not being properly classified and tracked separately from annual salaries. They needed:

1. **No conversion** to annual (keep original values)
2. **Rate type chips** (Hourly, Weekly, Monthly badges)
3. **Separate classification type** tracking in stats
4. **SC/STD exclusion** - These have mixed rate types within same classification

## Changes Made

### 1. Enhanced Rate Type Categorization (pages/index.tsx)

**Lines 98-143**: Updated stats calculation to track each rate type separately

```typescript
let hourlyCount = 0;
let weeklyCount = 0;
let monthlyCount = 0;

// Categorize by rate type
if (!Number.isNaN(num)) {
	if (num < 100) {
		hourlyCount++; // < $100 = Hourly rate
	} else if (num >= 100 && num < 1000) {
		weeklyCount++; // $100-$999 = Weekly rate
	} else if (num >= 1000 && num < 10000) {
		monthlyCount++; // $1,000-$9,999 = Monthly rate
	} else {
		minSalaries.push(num); // >= $10,000 = Annual salary
	}
}
```

### 2. Updated Stats Display

**Total Classifications Metric**:

- **Before**: `${collectiveCount} collective agreement, ${unrepresentedCount} unrepresented/excluded.`
- **After**: `${collectiveCount} collective agreement, ${unrepresentedCount} unrepresented/excluded. ${hourlyCount} hourly, ${weeklyCount} weekly, ${monthlyCount} monthly rates.`

**Other Metric Helpers** - Added clarification:

- "Maximum annual top-step salary recorded **(excludes hourly/weekly/monthly rates)**"
- "Mean of all top-step salaries **(excludes hourly/weekly/monthly rates)**"
- "Minimum annual step-1 salary **(excludes hourly/weekly/monthly rates)**"

### 3. Rate Type Detection (Already in place)

**Lines 186-196**: Smart detection based on value ranges

```typescript
let rateType: 'annual' | 'hourly' | 'weekly' | 'monthly' = 'annual';
if (minSalary < 100) {
	rateType = 'hourly';
} else if (minSalary >= 100 && minSalary < 1000) {
	rateType = 'weekly';
} else if (minSalary >= 1000 && minSalary < 10000) {
	rateType = 'monthly';
}
```

### 4. Display with Rate Type Chips (Already in place)

**Lines 350-354**: Classification cards show dynamic chips

```typescript
{
	info?.rateType !== 'annual' && (
		<Chip color='success' variant='dot' size='sm' radius='sm'>
			{(info?.rateType || '').charAt(0).toUpperCase() + (info?.rateType || '').slice(1)}
		</Chip>
	);
}
```

**Lines 367**: Salary range shows rate type suffix

```typescript
<p>
	Range: {formatSalary(info.minSalary)} - {formatSalary(info.maxSalary)}
	{info.rateType !== 'annual' && ` (${info.rateType})`}
</p>
```

## Rate Type Classification System

| Salary Range    | Type    | Display                   | Example          |
| --------------- | ------- | ------------------------- | ---------------- |
| < $100          | Hourly  | $26.70 - $27.84 (hourly)  | HP-01, SV groups |
| $100 - $999     | Weekly  | $750 - $900 (weekly)      | Rare             |
| $1,000 - $9,999 | Monthly | $4,500 - $5,200 (monthly) | Some specialized |
| >= $10,000      | Annual  | $48,000 - $95,000         | AS, CR, IT, etc. |

## Before vs After

### Before

- Hourly rates appeared without clear identification
- No separate tracking of rate types
- Stats might have been confusing with mixed rate types
- No indication which classifications use different pay frequencies

### After

✅ **Clear Rate Type Chips**: Green "Hourly", "Weekly", "Monthly" badges
✅ **Separate Counts**: Stats show "X hourly, Y weekly, Z monthly rates"
✅ **No Conversion**: Original values preserved (e.g., $26.70/hr stays as $26.70)
✅ **Rate Type Suffix**: Shows "(hourly)" after salary range
✅ **Excluded from Annual Stats**: Hourly/weekly/monthly don't skew min/max/average calculations

## Example Display

### Hourly Classification (HP-01)

```
┌─────────────────────────────────────────┐
│ HP-01  [Hourly] [Excluded]             │
│ Range: $29.25 - $30.51 (hourly)        │
│ Steps: 3                                │
│ Effective: August 5, 2023               │
└─────────────────────────────────────────┘
```

### Annual Classification (AS-04)

```
┌─────────────────────────────────────────┐
│ AS-04                                   │
│ Range: $82,088 - $91,648                │
│ Steps: 5                                │
│ Effective: 2023-12-21                   │
└─────────────────────────────────────────┘
```

## Stats Example

**Total classifications**: 740
_470 collective agreement, 270 unrepresented/excluded. 45 hourly, 2 weekly, 8 monthly rates._

**Highest top salary**: $295,700
_Maximum annual top-step salary recorded (excludes hourly/weekly/monthly rates)._

## Data Integrity

✅ **No data changes** - Classification data in data.json unchanged
✅ **Original values preserved** - Hourly rates stay as hourly (not converted)
✅ **Proper categorization** - Each rate type tracked separately
✅ **Clear labeling** - Users see exactly what pay frequency applies

## Files Modified

1. **pages/index.tsx**

   - Added `hourlyCount`, `weeklyCount`, `monthlyCount` tracking
   - Updated categorization logic (lines 98-143)
   - Enhanced metric helpers with exclusion notes
   - Display logic already had rate type chips and suffixes
   - **Added SC/STD exclusion** - these classifications have mixed rate types

2. **pages/api/top.ts**
   - Added SC/STD exclusion from top salary calculations
   - Prevents mixed-rate classifications from skewing annual stats

## SC/STD Classifications

SC and STD are special cases with mixed rate types within the same classification:

- **step-1**: Monthly rates (~$4,000-6,000)
- **step-2**: Annual rates (~$50,000-70,000)
- **step-3**: Weekly rates (~$1,000-1,200)
- **step-4**: Daily rates (~$200-250)
- **step-5**: Hourly rates (~$25-30)

Total excluded: 14 classifications (SC-01 to SC-07, STD-01 to STD-07)

---

**Date**: October 14, 2025
**Status**: Complete - Hourly/weekly/monthly rates properly classified, SC/STD excluded
**Build**: Pending verification
