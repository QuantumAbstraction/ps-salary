# Parser Investigation Results - AS vs EX Pages

## Date: October 14, 2025

## Summary

Investigation into why unrepresented employee pages fail to parse revealed significant differences in HTML structure between working (EX, PI, SO) and failing (AS, CT, CX, etc.) pages.

## Key Findings

### 1. Caption Structure Differences

**EX Page (WORKS)**:

```html
<caption class="text-left">
	EX-01 - Annual Rates of Pay (in dollars)
</caption>
```

- Classification code directly in caption text
- No `<br>` tags
- No `<abbr>` tags interfering with text
- Simple, single-line format

**AS Page (FAILS)**:

```html
<caption class="text-left">
	Code: 30100<br />
	AS-07 – Annual rates of pay (in dollars)
</caption>
```

- Multi-line caption with `<br>` tags
- "Code: 30100" prefix before classification
- Sometimes includes `<abbr>` tags that break text:
  ```html
  Code: 30100<br /><abbr title="Administrative Services Group">AS</abbr>-07
  ```
- The `<abbr>` tag causes text to become "Code: 30100AS-07" (no space!)

### 2. Both Pages Have Valid Structure

**Similarities**:

- ✅ Both have matching H1 headings with "rates of pay"
- ✅ Both have 8 tables with classification codes in captions
- ✅ Both should be detected by `findAppendixOrRatesStarts()`
- ✅ Both have proper table structure

**Test Results**:

- `findAppendixOrRatesStarts()` DOES find the H1 on AS page
- Caption text extraction DOES capture classification codes (6 out of 8 captions parseable)
- Pattern matching SHOULD work for "AS-07", "AS-08" etc.

### 3. The Mystery: Parser Returns Empty

Despite AS page having:

- ✓ Valid start heading
- ✓ 8 tables
- ✓ Classification codes in 6/8 captions (AS-07, AS-08)

**Parser still returns 0 classifications!**

## Debugging Evidence

### Test 1: Caption Analysis

```
Caption 1: "Code: 30100\nAS-07 – Annual rates of pay (in dollars)"
✓ Found classification: AS-07

Caption 2: "Code: 30100\nAS-08 – Annual rates of pay (in dollars)"
✓ Found classification: AS-08

Caption 5: "Code: 30100AS-07..." (with <abbr> tag)
✗ No classification pattern found (no space after code)
```

Result: 6 out of 8 captions are parseable

### Test 2: Heading Detection

```
✓ MATCH: <H1> "administrative services (as) - rates of pay..."
Total matching headings found: 1
✓ Start headings found, parser should continue
```

Result: Start heading correctly identified

### Test 3: Direct Parser Test

```javascript
const result = parseAppendixFromDocument($, 'https://.../as.html');
console.log(`Classifications found: ${Object.keys(result).length}`);
// Output: Classifications found: 0
```

Result: Parser returns empty object despite valid HTML

## Hypothesis

The parser logic has a hidden requirement or assumption that:

1. **Works for collective agreement pages** (PA, CS, IT, etc.)
2. **Works for some unrepresented pages** (EX, PI, SO)
3. **Fails for most unrepresented pages** (AS, CT, CX, etc.)

**Possible causes**:

- Table nesting or parent element structure differs
- Specific CSS class requirements not documented
- Table position relative to headings
- Row structure within tables
- Additional parsing steps that silently fail

## What We Know Works

**EX page** (5 classifications extracted successfully):

- Simple caption format
- No "Code: XXXXX" prefix
- No `<abbr>` tags
- Possibly different parent structure or CSS classes

## Recommended Next Steps

1. **Compare full DOM structure**: Export complete HTML trees for EX vs AS to identify structural differences beyond captions

2. **Add debug logging**: Insert console.log statements throughout `parseAppendixFromDocument()` to track:

   - How many start headings found
   - How many tables collected
   - Whether classification codes extracted from captions
   - Where the logic fails/exits early

3. **Check table parent elements**: Investigate if tables need specific parent elements or CSS classes

4. **Test with simplified parser**: Create a minimal parser that only looks for tables with captions containing classification patterns, bypassing all the complex logic

5. **Compare working pages**: Analyze what EX, PI, and SO have in common that AS/CT/etc. don't

## Impact

- **Working**: 3/25 unrepresented pages (12%)
- **Failing**: 22/25 unrepresented pages (88%)
- **Total missing data**: Potentially 20+ unique unrepresented classification codes

## Files for Investigation

- `ex-page.html` - Working example
- `as-page.html` - Failing example
- `debug-as-parsing.js` - Caption analysis script
- `debug-as-starts.js` - Heading detection script
- `test-as-scrape.js` - Parser test script
- `scrape.ts` lines 861-1050 - `parseAppendixFromDocument()` function
