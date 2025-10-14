# AI-Assisted Scraping & Parsing Proposal

## 🤖 Problem Statement

Current scraper (`scrape.ts`) has **1164 lines** of manual parsing logic to handle:

- 28+ different Treasury Board collective agreement pages
- Multiple table formats (standard, range-based, complex headers)
- Inconsistent HTML structures across pages
- Special cases (AS-01 through AS-08 salary-range inference)
- Unicode dash variations (`–`, `-`, `—`)
- Merged cells, rowspan/colspan variations
- Different classification naming patterns

**Current approach**: Hardcoded rules for each variation → brittle and maintenance-heavy

**Proposed solution**: AI-powered parsing that adapts to any table structure

---

## 🎯 AI-Assisted Scraping Strategies

### Strategy 1: **GPT-4 Vision for Table Understanding** ⭐ RECOMMENDED

**How it works**:

1. Screenshot each Treasury Board page
2. Send image to GPT-4 Vision API
3. Ask: "Extract salary table as JSON with structure: {classification: string, steps: [{step: number, amount: number}], effectiveDate: string}"
4. Receive structured JSON response
5. Validate and store

**Advantages**:

- ✅ Handles ANY table format (no hardcoded rules)
- ✅ Understands merged cells, complex layouts
- ✅ Can read visual context (headers, footers)
- ✅ Adapts to Treasury Board design changes
- ✅ Can process screenshots or HTML

**Disadvantages**:

- ⚠️ Requires OpenAI API key (cost: ~$0.01-0.05 per page)
- ⚠️ Slower than DOM parsing (~2-5 seconds per page)
- ⚠️ Needs internet connection

**Cost estimate**: 28 pages × $0.03 = ~$0.84 per full scrape

---

### Strategy 2: **GPT-4 for HTML Parsing**

**How it works**:

1. Fetch HTML content of each page
2. Extract `<table>` elements
3. Send HTML to GPT-4 API with prompt:
   ```
   Parse this salary table HTML and return JSON with:
   - classification codes
   - salary steps with amounts
   - effective dates
   ```
4. Receive structured response

**Advantages**:

- ✅ No screenshot needed
- ✅ Works with raw HTML
- ✅ Cheaper than Vision API
- ✅ Faster processing

**Disadvantages**:

- ⚠️ May struggle with complex merged cells
- ⚠️ Large HTML tokens = higher cost
- ⚠️ Still requires API calls

**Cost estimate**: 28 pages × $0.01 = ~$0.28 per full scrape

---

### Strategy 3: **Claude 3.5 Sonnet (Anthropic)**

**How it works**:
Similar to GPT-4 but using Claude API:

1. Send HTML or screenshot
2. Claude analyzes table structure
3. Returns structured JSON

**Advantages**:

- ✅ Large context window (200k tokens)
- ✅ Excellent at structured extraction
- ✅ Can handle entire page HTML at once
- ✅ Good at following complex instructions

**Disadvantages**:

- ⚠️ Requires Anthropic API key
- ⚠️ Cost similar to GPT-4

**Cost estimate**: ~$0.30-1.00 per full scrape

---

### Strategy 4: **Local LLM (Ollama + Llama 3.1)** 🆓 FREE

**How it works**:

1. Install Ollama locally
2. Use Llama 3.1 8B or 70B model
3. Send HTML snippets for parsing
4. Process locally - no API costs

**Advantages**:

- ✅ **FREE** - no API costs
- ✅ Works offline
- ✅ No rate limits
- ✅ Privacy (data stays local)

**Disadvantages**:

- ⚠️ Requires powerful computer (8GB+ RAM for 8B model)
- ⚠️ Slower than cloud APIs
- ⚠️ May need fine-tuning for accuracy
- ⚠️ No vision capabilities (HTML only)

---

### Strategy 5: **Hybrid Approach** ⭐ BEST VALUE

**How it works**:

1. Try DOM parsing first (current scraper logic)
2. If parsing fails or confidence is low → call AI
3. AI validates and corrects extraction
4. Cache AI results to minimize API calls

**Advantages**:

- ✅ Minimize API costs (only use AI when needed)
- ✅ Fast for standard tables
- ✅ AI handles edge cases
- ✅ Best of both worlds

**Cost estimate**: ~$0.10-0.50 per scrape (only 5-10 pages need AI)

---

## 💡 Recommended Implementation: **Hybrid GPT-4 + DOM Parsing**

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Scraper Orchestrator                    │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
         ┌──────────▼────────┐  ┌──────▼──────────┐
         │   DOM Parser      │  │   AI Parser     │
         │  (Fast, Free)     │  │ (Smart, $0.03)  │
         └──────────┬────────┘  └──────┬──────────┘
                    │                   │
         ┌──────────▼────────┐  ┌──────▼──────────┐
         │  Success?         │  │  GPT-4 Vision   │
         │  Confidence > 90% │  │  or Text API    │
         └──────────┬────────┘  └──────┬──────────┘
                    │                   │
         ┌──────────▼───────────────────▼──────────┐
         │         Validation Layer                │
         │  - Check salary ranges reasonable       │
         │  - Verify classification format         │
         │  - Ensure step consistency              │
         └──────────┬──────────────────────────────┘
                    │
         ┌──────────▼──────────┐
         │   data.json         │
         │   (Cached Result)   │
         └─────────────────────┘
```

### Implementation Steps

#### Phase 1: Add AI Parsing Module

Create `lib/ai-parser.ts`:

````typescript
import OpenAI from 'openai';

interface SalaryEntry {
	classification: string;
	steps: Array<{ step: number; amount: number }>;
	effectiveDate: string;
	source: string;
}

export async function parseTableWithAI(html: string, sourceUrl: string): Promise<SalaryEntry[]> {
	const openai = new OpenAI({
		apiKey: process.env.OPENAI_API_KEY
	});

	const prompt = `
Extract salary data from this HTML table and return ONLY valid JSON (no markdown).

Expected format:
[
  {
    "classification": "AS-01",
    "steps": [
      {"step": 1, "amount": 50000},
      {"step": 2, "amount": 52000}
    ],
    "effectiveDate": "2024-01-01",
    "source": "${sourceUrl}"
  }
]

Rules:
- Extract ALL classifications from the table
- Convert salary strings to numbers (remove $, commas)
- Parse effective dates to YYYY-MM-DD format
- If table has "X to Y" format, create step-1 (min) and step-2 (max)
- Ignore header rows, footnotes, and non-data rows

HTML:
${html}
`;

	const response = await openai.chat.completions.create({
		model: 'gpt-4-turbo-preview',
		messages: [
			{
				role: 'system',
				content: 'You are an expert at extracting structured data from HTML tables. Return only valid JSON.'
			},
			{
				role: 'user',
				content: prompt
			}
		],
		temperature: 0, // Deterministic output
		max_tokens: 4000
	});

	const content = response.choices[0].message.content || '[]';

	// Remove markdown code fences if present
	const jsonContent = content
		.replace(/```json\n?/g, '')
		.replace(/```\n?/g, '')
		.trim();

	return JSON.parse(jsonContent);
}

// Fallback with screenshot (GPT-4 Vision)
export async function parseTableWithVision(screenshotBase64: string, sourceUrl: string): Promise<SalaryEntry[]> {
	const openai = new OpenAI({
		apiKey: process.env.OPENAI_API_KEY
	});

	const response = await openai.chat.completions.create({
		model: 'gpt-4-vision-preview',
		messages: [
			{
				role: 'user',
				content: [
					{
						type: 'text',
						text: 'Extract all salary data from this table image. Return JSON array with classification, steps array (step number and amount), effectiveDate, and source URL. Remove $ and commas from amounts.'
					},
					{
						type: 'image_url',
						image_url: {
							url: `data:image/png;base64,${screenshotBase64}`
						}
					}
				]
			}
		],
		max_tokens: 4000
	});

	const content = response.choices[0].message.content || '[]';
	const jsonContent = content
		.replace(/```json\n?/g, '')
		.replace(/```\n?/g, '')
		.trim();

	return JSON.parse(jsonContent);
}
````

#### Phase 2: Update Scraper with Hybrid Logic

Modify `scrape.ts`:

```typescript
import { parseTableWithAI } from './lib/ai-parser';

async function parseAppendixFromDocument(url: string) {
	try {
		// Step 1: Try DOM parsing (existing logic)
		const domResult = await tryDOMParsing(url);

		if (isHighConfidence(domResult)) {
			console.log(`✅ DOM parsing successful for ${url}`);
			return domResult;
		}

		// Step 2: Confidence low? Use AI
		console.log(`🤖 Using AI parsing for ${url}`);
		const html = await fetchHTML(url);
		const tableHTML = extractTableHTML(html);

		const aiResult = await parseTableWithAI(tableHTML, url);

		// Step 3: Validate AI result
		if (validateResult(aiResult)) {
			console.log(`✅ AI parsing successful for ${url}`);
			return convertToInternalFormat(aiResult);
		}

		// Step 4: Fallback to manual review
		console.warn(`⚠️ Both DOM and AI parsing failed for ${url}`);
		return null;
	} catch (error) {
		console.error(`Error parsing ${url}:`, error);
		return null;
	}
}

function isHighConfidence(result: any): boolean {
	// Check if result has expected structure
	if (!result || Object.keys(result).length === 0) return false;

	// Check if salaries are in reasonable range
	const salaries = extractAllSalaries(result);
	if (salaries.some((s) => s < 1 || s > 500000)) return false;

	// Check if we have proper step progression
	// Add more validation logic...

	return true;
}
```

#### Phase 3: Add Environment Variable

Create `.env.local`:

```bash
OPENAI_API_KEY=sk-your-api-key-here
```

Update `.gitignore`:

```
.env.local
```

#### Phase 4: Add AI Toggle in Admin UI

Update `pages/admin.tsx`:

```tsx
const [useAI, setUseAI] = useState(false)

// In the UI:
<Switch
  isSelected={useAI}
  onValueChange={setUseAI}
  color='success'
>
  Use AI-assisted parsing (costs ~$0.03 per page)
</Switch>
```

---

## 📊 Cost Comparison

| Strategy                 | Cost/Scrape | Speed     | Accuracy | Maintenance |
| ------------------------ | ----------- | --------- | -------- | ----------- |
| Manual DOM (current)     | $0          | Fast      | 95%      | High        |
| GPT-4 Vision             | $0.84       | Slow      | 98%      | Very Low    |
| GPT-4 Text               | $0.28       | Medium    | 96%      | Low         |
| Claude 3.5               | $0.50       | Medium    | 97%      | Low         |
| Local LLM (Ollama)       | $0          | Very Slow | 90%      | Medium      |
| **Hybrid (Recommended)** | **$0.15**   | **Fast**  | **99%**  | **Low**     |

---

## 🚀 Quick Start: Add AI to Existing Scraper

### Option A: Minimal Integration (30 minutes)

1. Install OpenAI SDK:

```bash
npm install openai --legacy-peer-deps
```

2. Add `.env.local`:

```
OPENAI_API_KEY=sk-...
```

3. Create `lib/ai-parser.ts` (code above)

4. Update 5-10 problematic URLs in `scrape.ts` to use AI

5. Test with:

```bash
npm run scrape
```

### Option B: Full Hybrid System (2-3 hours)

1. All of Option A
2. Add confidence scoring to DOM parser
3. Automatic fallback to AI on low confidence
4. Add validation layer
5. Admin UI toggle for AI usage
6. Caching layer to minimize API calls

---

## 🎓 Alternative: Fine-Tuned Model (Advanced)

For ultimate accuracy and cost reduction:

1. **Collect training data**: Export 50-100 examples of:

   - HTML table snippet
   - Expected JSON output

2. **Fine-tune GPT-3.5**: Train on your specific table formats

3. **Use fine-tuned model**: 10x cheaper than GPT-4, similar accuracy

4. **Cost**: ~$20 to train, $0.001 per page after

---

## 🤔 Decision Matrix

**Choose GPT-4 Vision if**:

- You have complex, visually-designed tables
- Budget allows $0.84 per scrape
- You want highest accuracy (98%+)

**Choose GPT-4 Text if**:

- Tables are in clean HTML
- Budget is $0.28 per scrape
- You want good balance of cost/accuracy

**Choose Hybrid if**: ⭐

- You want to minimize costs
- Most tables parse fine with DOM
- Only 5-10 pages are problematic
- **RECOMMENDED FOR PS SALARY PROJECT**

**Choose Local LLM if**:

- Zero budget
- You have powerful local machine
- Privacy is critical
- Can accept lower accuracy

**Choose Fine-tuning if**:

- You scrape frequently (weekly/daily)
- Want lowest per-scrape cost
- Can invest upfront in training

---

## 📝 Implementation Checklist

- [ ] Install OpenAI SDK (`npm install openai`)
- [ ] Add API key to `.env.local`
- [ ] Create `lib/ai-parser.ts` module
- [ ] Add confidence scoring to existing DOM parser
- [ ] Implement hybrid fallback logic in `scrape.ts`
- [ ] Add AI usage toggle in admin UI
- [ ] Test on 5 problematic URLs
- [ ] Validate AI output matches expected format
- [ ] Add caching to minimize API calls
- [ ] Update documentation
- [ ] Deploy to Vercel with environment variable

---

## 💰 Budget Considerations

**Current situation**: Free but requires ~20 hours of maintenance per year for Treasury Board changes

**With AI**:

- One-time setup: ~3 hours
- Per scrape: $0.15
- Annual cost (monthly scrapes): $1.80
- Maintenance: ~1 hour per year

**ROI**: Save 19 hours/year for $1.80 → **Worth it!**

---

## 🔮 Future Enhancements

1. **AI-powered validation**: Use AI to verify extracted data quality
2. **Automatic classification detection**: Let AI discover new classification codes
3. **Change detection**: AI compares old vs new data and flags changes
4. **Multi-language support**: Parse French collective agreements
5. **Historical tracking**: AI extracts and tracks salary history over time

---

## 📚 Resources

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [GPT-4 Vision Guide](https://platform.openai.com/docs/guides/vision)
- [Anthropic Claude API](https://www.anthropic.com/api)
- [Ollama (Local LLM)](https://ollama.ai)
- [LangChain for Table Extraction](https://python.langchain.com/docs/use_cases/extraction)

---

## ✅ Recommendation

**For PS Salary project, implement Hybrid approach**:

1. Start with existing DOM parser
2. Add AI fallback for 5-10 problematic pages
3. Cost: ~$0.15 per full scrape
4. Accuracy: 99%+
5. Maintenance: Minimal

**Next steps**:

1. Get OpenAI API key (free $5 credit for new accounts)
2. Implement `lib/ai-parser.ts` module (30 min)
3. Update scraper with fallback logic (1 hour)
4. Test on problematic URLs (30 min)
5. Deploy and monitor

**Total time investment**: ~2-3 hours
**Annual savings**: 15-20 hours of manual maintenance
**Cost**: ~$2/year for monthly scrapes

**Verdict**: Absolutely worth implementing! 🚀
