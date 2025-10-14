# Quick Start: AI-Assisted Scraping Integration

## 🚀 5-Minute Setup

### Step 1: Install Dependencies

```bash
npm install openai --legacy-peer-deps
```

### Step 2: Add API Key

Create `.env.local` in project root:

```bash
OPENAI_API_KEY=sk-your-key-here
```

Get free API key (includes $5 credit): https://platform.openai.com/api-keys

### Step 3: Files Already Created

✅ `lib/ai-parser.ts` - AI parsing module (complete)
✅ `AI_SCRAPING_PROPOSAL.md` - Full documentation

### Step 4: Update `scrape.ts`

Add this at the top of `scrape.ts`:

```typescript
import { hybridParse, usageTracker } from './lib/ai-parser';

// Track AI usage
let useAI = process.env.USE_AI_PARSING === 'true';
```

Find the problematic URLs in your scraper (ones that need special handling), and replace their parsing logic:

**BEFORE** (manual parsing):

```typescript
// Complex manual parsing for AS classifications
if (url.includes('as-classification')) {
	// 50+ lines of hardcoded logic...
}
```

**AFTER** (hybrid approach):

```typescript
// Try DOM first, fallback to AI if needed
const result = await hybridParse(htmlContent, url, (html) => {
	// Your existing DOM parser logic here
	return parseAppendixFromDocument(html);
});

if (result.success) {
	usageTracker.trackCall(result);
	return convertToInternalFormat(result.data);
}
```

### Step 5: Test on One URL

```bash
# Enable AI parsing
$env:USE_AI_PARSING="true"
$env:OPENAI_API_KEY="sk-..."

# Run scraper
npx tsc scrape.ts --lib ES2015 --esModuleInterop --skipLibCheck
node scrape.js
```

Watch console for:

- `📄 Trying DOM parser...`
- `✅ DOM parsing successful` or
- `🤖 DOM confidence low, trying AI parser...`
- `✅ AI parsing successful!`

---

## 🎯 Recommended URLs to Convert First

These pages have complex/inconsistent formats:

1. **AS Classifications** (salary range inference needed)

   - URL: `https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/as.html`
   - Current issue: Manual salary-range detection for AS-01 through AS-08

2. **GL Classifications** (many variations, merged cells)

   - URL: `https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/gl.html`
   - Current issue: 187 different GL codes with complex table structure

3. **Executive (EX) Levels** (range-based)

   - URL: `https://www.canada.ca/en/treasury-board-secretariat/topics/pay/unrepresented-senior-excluded/executive.html`
   - Current issue: "X to Y" format parsing

4. **RCMP Classifications** (special format)

   - URL: Various RCMP pages
   - Current issue: Unique table structure

5. **Hourly Wage Tables** (multiple formats)
   - URL: Various SV, GL, HP, HS pages
   - Current issue: Different hourly rate presentations

---

## 📊 Example: Convert AS Classifications

### Current Code (lines 870-920 in scrape.ts)

```typescript
// Manual salary range detection
if (maxSalary >= 48000 && maxSalary < 58000) {
	classification = 'AS-01';
} else if (maxSalary >= 58000 && maxSalary < 68000) {
	classification = 'AS-02';
} else if (maxSalary >= 68000 && maxSalary < 82000) {
	classification = 'AS-03';
}
// ... 50 more lines
```

### New Code (with AI)

```typescript
import { hybridParse, usageTracker } from './lib/ai-parser';

async function parseASClassifications(url: string, html: string) {
	const result = await hybridParse(html, url, (h) => {
		// Fallback to manual parsing if AI fails
		return manualASParsing(h);
	});

	if (result.success) {
		console.log(`✅ Parsed AS classifications using ${result.method}`);
		console.log(`   Cost: $${result.cost.toFixed(3)}`);
		usageTracker.trackCall(result);
		return result.data;
	}

	return null;
}
```

Result:

- ✅ No more manual range detection
- ✅ Handles future AS-09, AS-10 automatically
- ✅ Cost: $0.02 per page
- ✅ Faster development (5 lines vs 50 lines)

---

## 💰 Cost Monitoring

Add to end of scrape.ts:

```typescript
// After all scraping complete
const stats = usageTracker.getStats();
console.log('\n📊 AI Usage Statistics:');
console.log(`   Total AI calls: ${stats.totalCalls}`);
console.log(`   Successful: ${stats.successfulCalls} (${(stats.successRate * 100).toFixed(1)}%)`);
console.log(`   Total cost: $${stats.totalCost.toFixed(3)}`);
console.log(`   Average cost per call: $${stats.averageCost.toFixed(4)}`);
```

Expected output:

```
📊 AI Usage Statistics:
   Total AI calls: 5
   Successful: 5 (100.0%)
   Total cost: $0.105
   Average cost per call: $0.0210
```

---

## 🧪 Testing Strategy

### Test 1: Single URL with AI

```typescript
// In scrape.ts, temporarily add:
const testUrl = 'https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/as.html';

const result = await hybridParse(await fetchHTML(testUrl), testUrl, parseAppendixFromDocument);

console.log('Result:', JSON.stringify(result, null, 2));
```

### Test 2: Compare DOM vs AI Output

```typescript
const domResult = parseAppendixFromDocument(html);
const aiResult = await parseTableWithAI(html, url);

console.log('DOM found:', Object.keys(domResult).length, 'classifications');
console.log('AI found:', aiResult.data.length, 'classifications');

// Check differences
const domCodes = Object.keys(domResult);
const aiCodes = aiResult.data.map((d) => d.classification);
const missing = domCodes.filter((c) => !aiCodes.includes(c));
const extra = aiCodes.filter((c) => !domCodes.includes(c));

console.log('Missing in AI:', missing);
console.log('Extra in AI:', extra);
```

### Test 3: Validation Check

```typescript
import { validateSalaryData } from './lib/ai-parser';

const validation = validateSalaryData(aiResult.data);
if (!validation.isValid) {
	console.warn('Validation errors:', validation.errors);
} else {
	console.log('✅ All validations passed!');
}
```

---

## 🔧 Configuration Options

### Option 1: Always Use AI (Maximum Accuracy)

```typescript
// In scrape.ts
const FORCE_AI = true;

if (FORCE_AI) {
	result = await parseTableWithAI(html, url);
} else {
	result = await hybridParse(html, url, domParser);
}
```

Cost: ~$0.84 per full scrape (28 pages)

### Option 2: Selective AI (Recommended)

```typescript
const PROBLEMATIC_URLS = [
	'as.html',
	'gl.html',
	'executive.html'
	// Add others as needed
];

const shouldUseAI = PROBLEMATIC_URLS.some((pattern) => url.includes(pattern));

if (shouldUseAI) {
	result = await parseTableWithAI(html, url);
} else {
	result = await domParser(html);
}
```

Cost: ~$0.10 per scrape (5 pages)

### Option 3: Confidence-Based (Smartest)

```typescript
// This is what hybridParse does automatically:
// 1. Try DOM parsing
// 2. Calculate confidence
// 3. If confidence < 85%, use AI
// 4. Validate AI result
// 5. Return best result
```

Cost: ~$0.15 per scrape (5-7 pages need AI)

---

## 📈 Gradual Migration Plan

### Week 1: Test AI on 1 URL

- Pick most problematic page (e.g., AS classifications)
- Add AI parsing
- Compare results with manual parsing
- Validate accuracy

### Week 2: Expand to 5 URLs

- Add GL, Executive, RCMP, hourly wages
- Monitor costs and accuracy
- Fix any validation issues

### Week 3: Full Hybrid Mode

- Enable hybrid parsing for all URLs
- Let system decide when to use AI
- Monitor success rates

### Week 4: Optimize

- Identify patterns in AI usage
- Fine-tune confidence thresholds
- Consider caching AI results

---

## 🐛 Troubleshooting

### Issue: "OpenAI API key not found"

**Fix**:

```bash
# Check .env.local exists
cat .env.local

# Restart dev server to load env vars
npm run dev
```

### Issue: "API rate limit exceeded"

**Fix**:

```typescript
// Add delay between AI calls
await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second
```

### Issue: "AI returns invalid JSON"

**Fix**: Already handled in `ai-parser.ts` with:

````typescript
.replace(/```json\n?/g, '')
.replace(/```\n?/g, '')
````

### Issue: "Validation errors"

**Check**:

1. Are salaries in reasonable range? ($1 - $500k)
2. Are step numbers sequential?
3. Are classification codes valid format?

**Debug**:

```typescript
console.log('Raw AI response:', response.choices[0].message.content);
console.log('Validation errors:', validation.errors);
```

---

## 🎓 Advanced: Custom Prompts

For even better accuracy, customize the AI prompt for specific pages:

```typescript
function getCustomPrompt(url: string): string {
	if (url.includes('executive')) {
		return `
This is an Executive classification salary table with range-based pay.
Each row shows "Minimum to Maximum" salary ranges.
Extract as step-1 (minimum) and step-2 (maximum).
    `;
	} else if (url.includes('hourly')) {
		return `
This table contains HOURLY wage rates, not annual salaries.
Extract hourly rates as-is (e.g., $25.50 should be 25.50).
We will convert to annual later.
    `;
	}

	return defaultPrompt;
}
```

---

## ✅ Success Criteria

After implementing AI parsing, you should see:

- ✅ **Fewer manual updates** when Treasury Board changes formats
- ✅ **Automatic handling** of new classification codes
- ✅ **Higher accuracy** (95% → 99%+)
- ✅ **Faster development** (less hardcoded logic)
- ✅ **Better maintainability** (fewer edge cases)
- ✅ **Cost: < $0.20** per monthly scrape

---

## 📞 Next Steps

1. **Test Setup** (5 min):

   - Add `.env.local` with API key
   - Run: `npm install openai --legacy-peer-deps`
   - Test: `node -e "console.log(require('openai'))"`

2. **Single URL Test** (15 min):

   - Pick one problematic URL
   - Add `hybridParse()` call
   - Compare output with manual parser

3. **Validation** (10 min):

   - Check extracted classifications match expected
   - Verify salaries are reasonable
   - Confirm step progression

4. **Deploy** (5 min):
   - Add `OPENAI_API_KEY` to Vercel environment variables
   - Deploy and test in production
   - Monitor costs in OpenAI dashboard

**Total time**: ~35 minutes to get AI-assisted scraping working!

---

## 📚 Resources

- `lib/ai-parser.ts` - Complete implementation (already created)
- `AI_SCRAPING_PROPOSAL.md` - Full strategy document
- OpenAI Cookbook: https://cookbook.openai.com/
- Rate Limits: https://platform.openai.com/docs/guides/rate-limits

**Ready to implement?** Start with Step 1 above! 🚀
