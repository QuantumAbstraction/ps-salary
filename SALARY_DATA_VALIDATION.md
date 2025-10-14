# ✅ Salary Data Validation - Complete Coverage

## Summary

All pages that access salary data now have proper validation to handle missing or complex pay structures.

## Pages with Validation

### 1. **index.tsx** (Homepage)

**Lines 105-107**: Stats calculation

```typescript
const rates = salaryData[code]['annual-rates-of-pay'];
if (!rates || rates.length === 0) return;
```

**Lines 169-170**: `getMostRecentSalaryInfo` function

```typescript
const rates = salaryData[code]['annual-rates-of-pay'];
if (!rates || rates.length === 0) return null;
```

**Protection**:

- Skips classifications without data in stats aggregation
- Returns null for missing data in salary info lookup

---

### 2. **search.tsx** (Search Page)

**Lines 117-118**: `getMostRecentSalaryInfo` function

```typescript
const rates = salaryData[code]['annual-rates-of-pay'];
if (!rates || rates.length === 0) return null;
```

**Lines 124**: Additional step validation

```typescript
if (stepKeys.length === 0) return null;
```

**Protection**:

- Returns null for missing rate data
- Validates step keys exist before processing

---

### 3. **equivalency.tsx** (Equivalency Comparison)

**Lines 114-115**: `getClassificationInfo` function

```typescript
const rates = salaryData[code]['annual-rates-of-pay'];
if (!rates || !rates.length) return null;
```

**Lines 118-119**: Step validation

```typescript
const stepKeys = Object.keys(mostRecent).filter((key) => key.startsWith('step-'));
if (!stepKeys.length) return null;
```

**Protection**:

- Validates rates array exists and has data
- Ensures step keys are present

---

### 4. **deployment.tsx** (Deployment Calculator)

**Lines 135-151**: Pre-extraction validation (NEW - just added)

```typescript
// Check if annual-rates-of-pay data is available
if (!fromData['annual-rates-of-pay'] || !toData['annual-rates-of-pay']) {
	setResult({
		// ... error state
		reason:
			'Salary data not available for one or both classifications. Some classifications (e.g., SC, STD) have complex pay structures that cannot be compared using this tool.'
	});
	return;
}
```

**Lines 155-170**: Post-extraction validation

```typescript
if (!fromSteps.length || !toSteps.length) {
	setResult({
		// ... error state
		reason:
			'No valid salary steps found for one or both classifications. Some classifications have complex pay structures that cannot be compared using this tool.'
	});
	return;
}
```

**Protection**:

- Two-layer validation: checks data exists, then validates extracted steps
- Provides user-friendly error messages explaining why comparison failed
- Mentions specific examples (SC, STD) of complex classifications

---

### 5. **admin.tsx** (Admin Page)

**Status**: Does not directly access salary data - no validation needed

---

## Classifications with Complex Pay Structures

These classifications may not have standard `annual-rates-of-pay` data:

- **SC** (Ship Crew) - Multiple pay scales, daily/hourly rates
- **STD** (Ship's Tradespersons and Daily) - Complex daily rate structure
- **Hourly classifications** - May have hourly rates instead of annual steps
- **Other specialized groups** - Various complex compensation models

## User Experience

When encountering classifications without compatible data:

1. **Homepage Stats**: Classification is skipped (no error shown)
2. **Search Page**: Shows "Unavailable" or empty data gracefully
3. **Equivalency**: Classification excluded from comparison list
4. **Deployment**: Clear error message explaining the limitation

## Error Messages

**Deployment Page - Missing Data**:

> "Salary data not available for one or both classifications. Some classifications (e.g., SC, STD) have complex pay structures that cannot be compared using this tool."

**Deployment Page - Invalid Steps**:

> "No valid salary steps found for one or both classifications. Some classifications have complex pay structures that cannot be compared using this tool."

## Benefits

✅ **No crashes** - Graceful handling of missing data
✅ **Clear communication** - Users understand why data isn't available
✅ **Comprehensive coverage** - All pages protected
✅ **Specific examples** - Users know which classifications might have issues
✅ **Maintains functionality** - Other classifications work normally

## Testing Checklist

- [x] Homepage loads with mixed data types
- [x] Search handles classifications without data
- [x] Equivalency skips incompatible classifications
- [x] Deployment shows helpful error for SC, STD, etc.
- [x] No console errors for missing data
- [x] Build succeeds with all validations

---

**Date**: October 14, 2025
**Status**: Complete - All pages validated
**Build**: Successful (3.8 kB deployment page)
