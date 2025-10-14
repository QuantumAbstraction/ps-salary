# Unrepresented Senior Excluded Employees - Implementation Status

## Summary

Successfully added infrastructure to scrape unrepresented senior excluded employees salary data with automatic conflict resolution, but the page structure prevents data extraction with current parser logic.

## Changes Made

### 1. Added URL to Scraper (✅ Complete)

**File**: `scrape.ts` line 56-57

Added unrepresented employees URL to URLS array:

```typescript
// Unrepresented senior excluded employees (managerial and confidential positions)
'https://www.canada.ca/en/treasury-board-secretariat/services/pay/rates-pay/rates-pay-unrepresented-senior-excluded-employees.html';
```

### 2. Implemented Conflict Resolution Logic (✅ Complete)

**File**: `scrape.ts` lines 728-742

Modified `mergeData()` function to detect unrepresented URLs and add "-EXCLUDED" suffix when classification codes conflict:

```typescript
function mergeData(a: SalaryData, b: SalaryData, sourceUrl?: string) {
	const isUnrepresented = sourceUrl?.includes('rates-pay-unrepresented');

	for (const k of Object.keys(b)) {
		let finalKey = k;

		// If this is from the unrepresented page AND the code already exists,
		// add "-EXCLUDED" suffix to distinguish it from collective agreement rates
		if (isUnrepresented && a[k]) {
			finalKey = `${k}-EXCLUDED`;
		}

		if (!a[finalKey]) a[finalKey] = { 'annual-rates-of-pay': [] };
		a[finalKey]['annual-rates-of-pay'].push(...b[k]['annual-rates-of-pay']);
	}
}
```

### 3. Updated scrapeAll() to Pass Source URL (✅ Complete)

**File**: `scrape.ts` line 1029

Modified to pass URL to mergeData for source tracking:

```typescript
mergeData(result, pageData, url); // Pass URL to track source
```

## Current Issue

### Parser Cannot Extract Data from Unrepresented Page

**Scraper output**:

```
[2025-10-14T14:47:51.803Z] ⚠ Warning: ...rates-pay-unrepresented-senior-excluded-employees.html -> No classifications found
```

**Root Cause**: The unrepresented employees page uses a different HTML structure:

- **Collective agreement pages**: Use headings (h1-h6) with "Appendix A" or "Rates of pay" followed by tables
- **Unrepresented page**: Uses collapsible `<details>` elements with occupational group names (e.g., "Administrative Services (AS)", "Comptrollership (CT)")

**Page Structure**:

```html
<details>
	<summary>Administrative Services (AS)</summary>
	<!-- Salary tables hidden here -->
</details>
<details>
	<summary>Comptrollership (CT)</summary>
	<!-- Salary tables hidden here -->
</details>
```

**Current Parser Logic** (`findAppendixOrRatesStarts()` at line 636):

- Searches for h1-h6 headings containing:
  - "Appendix A"
  - "Rates of pay"
  - "Rates"
  - "Salary rates"
- Does NOT expand or search within `<details>` elements

## Overlapping Classifications

Based on the webpage, these classifications appear in BOTH collective agreements AND unrepresented page:

- AS (Administrative Services)
- AO (Aircraft Operations)
- CO (Commissioned Officer - RCMP)
- CT (Comptrollership)
- CX (Correctional Services - Supervisory)
- DS (Defence Scientific Service)
- ED (Education)
- EX (Executive)
- FR (Firefighters)
- GT (General Technical)
- HR (Historical Research)
- IS (Information Services)
- LC (Law Management)
- MD (Medicine)
- MT (Meteorology)
- NU (Nursing)
- OM (Organization and Methods)
- PE (Personnel Administration)
- PI (Primary Products Inspection)
- PM (Programme Administration)
- PG (Purchasing and Supply)
- SG (Scientific Regulation)
- SR(W) (Ship repair West)
- SO (Ships' Officers)
- TR (Translation)
- UT (University Teaching)
- WP (Welfare Programmes)

When scraped successfully, these would become:

- `AS` (from PA collective agreement)
- `AS-EXCLUDED` (from unrepresented page)
- `CT` (from CT collective agreement)
- `CT-EXCLUDED` (from unrepresented page)
- etc.

## Next Steps

### Option 1: Modify Parser to Handle <details> Elements (Recommended)

Update `parseAppendixFromDocument()` or `findAppendixOrRatesStarts()` to:

1. **Detect `<details>` elements** in addition to headings
2. **Extract classification codes** from `<summary>` text (e.g., "Administrative Services (AS)" → "AS")
3. **Search within `<details>` content** for salary tables
4. **Parse tables** using existing table parsing logic

**Implementation**:

```typescript
// Add to findAppendixOrRatesStarts() or create new function
function findDetailsStarts($: any) {
	return $('details')
		.toArray()
		.map((e: any) => $(e))
		.filter(($d: any) => {
			const summaryText = $d.find('summary').first().text();
			// Check if summary contains a classification code pattern
			return /\([A-Z]{2,}\)/.test(summaryText); // Matches (AS), (CT), (EX), etc.
		});
}
```

### Option 2: Create Separate Parser for Unrepresented Page

Create `parseUnrepresentedEmployees()` function specifically for this page structure:

**File**: Add new function in `scrape.ts`

```typescript
function parseUnrepresentedEmployees($: any, sourceUrl: string): SalaryData {
	const result: SalaryData = {};

	$('details').each((i: number, el: any) => {
		const $details = $(el);
		const summaryText = clean($details.find('summary').first().text());

		// Extract classification code from summary text
		// E.g., "Administrative Services (AS)" → "AS"
		const match = summaryText.match(/\(([A-Z]{2,})\)/);
		if (!match) return;

		const classificationPrefix = match[1];

		// Find tables within this details element
		const tables = $details
			.find('table')
			.toArray()
			.map((t: any) => $(t));

		for (const $table of tables) {
			// Parse table using existing logic...
			// (Use similar logic to parseAppendixInNodes)
		}
	});

	return result;
}
```

Then call it conditionally:

```typescript
async function scrapeAppendixAFromPage(url: string): Promise<SalaryData> {
	const html = await fetchPage(url);
	const $ = load(html);

	// Detect unrepresented page
	if (url.includes('rates-pay-unrepresented')) {
		return parseUnrepresentedEmployees($, url);
	}

	return parseAppendixFromDocument($, url);
}
```

### Option 3: Manual Data Entry

If parsing proves too complex, manually create JSON entries for unrepresented classifications and merge into data.json.

## Testing

Once parser is fixed, run:

```cmd
cd "c:\Users\fandizih\OneDrive - VAC ACC\Projects\3A.Transformation\8. Staffing\PS Salary\ps-salary"
npx tsc scrape.ts --lib ES2020,DOM --esModuleInterop --skipLibCheck
node scrape.js
```

Expected output:

```
Processing 29/29: https://www.canada.ca/en/treasury-board-secretariat/services/pay/rates-pay/rates-pay-unrepresented-senior-excluded-employees.html
✓ Success: ...rates-pay-unrepresented... -> XX classifications
Total classifications found: 740+XX (where XX is number of unrepresented codes)
```

Check `data/data.json` for entries like:

```json
{
  "AS-01": { ... },          // From PA collective agreement
  "AS-01-EXCLUDED": { ... }, // From unrepresented page
  "CT-FIN-01": { ... },      // From CT collective agreement
  "CT-FIN-01-EXCLUDED": { ... } // From unrepresented page
}
```

## Files Modified

1. ✅ `scrape.ts` - Added URL, modified mergeData(), updated scrapeAll()
2. ❌ Parser logic - NOT YET UPDATED to handle `<details>` elements

## Completion Status

- ✅ Infrastructure: Conflict resolution logic complete
- ✅ URL Integration: Unrepresented page added to URLS
- ❌ Data Extraction: Parser cannot extract from `<details>` elements
- ❌ Testing: Cannot test until parser is fixed
- ❌ UI Updates: May need to add visual indicator for "-EXCLUDED" codes

## Related Files

- `scrape.ts` - Main scraper (lines 56-57, 728-742, 1029)
- `lib/salary-utils.ts` - Contains SUPERSEDED_CODES (may need to add exclusion for "-EXCLUDED" suffix)
- `pages/search.tsx` - Dropdown classification selector (should automatically include "-EXCLUDED" codes once scraped)
- `pages/equivalency.tsx` - Salary comparison tool (should automatically include "-EXCLUDED" codes)
- `data/data.json` - Output file (currently 740 codes, will have 740+XX after fix)
