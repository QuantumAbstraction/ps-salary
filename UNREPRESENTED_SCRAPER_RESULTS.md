# Unrepresented Employees Scraper Results - October 14, 2025

## Executive Summary

**Status**: ⚠️ PARTIAL SUCCESS - Only 11% of unrepresented pages successfully extracted data

- **27 individual occupational group URLs** added (replaced problematic main page)
- **3 pages successful** (EX, PI, SO) - extracted 8 classifications
- **22 pages failed** with "No classifications found"
- **2 pages 404** (GT, SR-W - pages don't exist)
- **Overall success rate**: 11% (3/27)

## Detailed Results

### Successful Extractions (3 pages, 8 classifications)

| Page                             | Classifications | Status     |
| -------------------------------- | --------------- | ---------- |
| EX (Executive)                   | 5               | ✅ Success |
| PI (Primary Products Inspection) | 2               | ✅ Success |
| SO (Ships' Officers)             | 1               | ✅ Success |

### Failed - No Classifications Found (22 pages)

AS, AO, CO-RCMP, CT, CX, DS, ED, FR, HR, IS, LC, MD, MT, NU, OM, PE, PM, PG, SG, TR, UT, WP

### Failed - HTTP 404 (2 pages)

GT (General Technical), SR-W (Ship Repair West)

## Critical Issue: Data Not in data.json

**Problem**: Even though scraper reports "5 classifications" from EX page, the data.json file shows:

```json
"EX-01": {
  "annual-rates-of-pay": []
},
"EX-02": {
  "annual-rates-of-pay": []
},
...
```

All EX codes have **empty arrays** - no salary data!

**Possible Causes**:

1. Parsing succeeds (counts classifications) but data extraction fails
2. mergeData() conflict resolution not being triggered
3. Data lost between parsing and merging

## Next Steps to Fix

### Priority 1: Investigate Successful vs Failed Pages

Compare HTML structure of working pages (EX, PI, SO) vs failing pages (AS, CT, etc.) to identify:

- Heading patterns that work vs don't work
- Table structure differences
- CSS class differences
- Section/div nesting differences

### Priority 2: Debug Data Loss Issue

Why does scraper report "5 classifications" from EX but data.json shows empty arrays?

- Add console logging to mergeData() to verify it's being called
- Log classification codes and array lengths before/after merge
- Verify parseAppendixFromDocument() actually returns data

### Priority 3: Fix Parser for Unrepresented Pages

Options:

1. **Conditional logic**: Detect unrepresented URLs and use different parsing rules
2. **Enhanced heading detection**: Add more heading patterns specific to unrepresented pages
3. **Table-first approach**: Look for tables with salary columns instead of relying on headings
4. **Custom parser**: Create separate `parseUnrepresented()` function

### Priority 4: Clean Up URL List

Remove URLs that 404:

- GT (General Technical)
- SR-W (Ship Repair West)

## Scraper Summary Output

```
=== SCRAPING SUMMARY ===
Successful: 30/55 pages
Total classifications found: 748
```

**Breakdown**:

- 28 collective agreement pages: All successful (740 classifications)
- 27 unrepresented pages: 3 successful, 24 failed (8 classifications reported, but not in data.json)

## URL Pattern

All unrepresented URLs follow this pattern:

```
https://www.canada.ca/en/treasury-board-secretariat/services/pay/rates-pay/rates-pay-unrepresented-senior-excluded-employees/{code}.html
```

Examples:

- `...employees/ex.html` ✅ Works
- `...employees/pi.html` ✅ Works
- `...employees/so.html` ✅ Works
- `...employees/as.html` ❌ Fails
- `...employees/ct.html` ❌ Fails

## Conflict Resolution Status

**Implementation**: ✅ Complete
**Testing**: ⏳ Pending

The conflict resolution logic is implemented and ready to add "-EXCLUDED" suffix when unrepresented codes conflict with collective agreement codes, but we can't test it until we fix the parser to actually extract data from the 22 failing pages.

Expected behavior once fixed:

- If AS-01 exists (from PA collective agreement) AND AS-01 found on unrepresented page
- Result: Both "AS-01" and "AS-01-EXCLUDED" in data.json

## Recommendations

1. **Immediate**: Investigate why EX data isn't in data.json despite scraper reporting success
2. **High**: Compare successful vs failing page HTML to identify pattern
3. **High**: Fix parser to handle 89% of unrepresented pages that are failing
4. **Medium**: Rerun scraper after fixes to get complete dataset
5. **Low**: Remove GT and SR-W URLs (404 errors)
