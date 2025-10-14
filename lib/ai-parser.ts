// AI-Assisted Table Parser Module
// Drop-in replacement for complex table parsing in scrape.ts

import OpenAI from 'openai';

interface SalaryEntry {
	classification: string;
	steps: Array<{ step: number; amount: number }>;
	effectiveDate: string;
	source: string;
}

interface ParseResult {
	success: boolean;
	data: SalaryEntry[];
	confidence: number;
	method: 'dom' | 'ai-text' | 'ai-vision';
	cost: number;
}

/**
 * Parse salary table using GPT-4
 * Cost: ~$0.01-0.03 per call
 */
export async function parseTableWithAI(html: string, sourceUrl: string): Promise<ParseResult> {
	try {
		const openai = new OpenAI({
			apiKey: process.env.OPENAI_API_KEY
		});

		const prompt = `
Extract salary data from this HTML table. Return a JSON object with a "classifications" array.

Format:
{
  "classifications": [
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
}

Rules:
1. Extract ALL classification codes from the table caption or headers
2. Convert salaries to numbers (remove $, commas, spaces)
3. Parse dates to YYYY-MM-DD format
4. If table shows "X to Y" range, create step-1 (X) and step-2 (Y)
5. Skip header rows, footnotes, and non-salary data
6. Preserve step numbers as shown in table
7. Each classification gets its own entry in the classifications array

HTML Table:
${html.substring(0, 8000)}
`;

		const response = await openai.chat.completions.create({
			model: 'gpt-4-turbo-preview',
			messages: [
				{
					role: 'system',
					content:
						'You are a data extraction expert. Return only valid JSON arrays with no additional text or markdown.'
				},
				{
					role: 'user',
					content: prompt
				}
			],
			temperature: 0,
			max_tokens: 4000,
			response_format: { type: 'json_object' } as any
		});

		const content = response.choices[0].message.content || '{"classifications": []}';

		// Clean markdown if present
		const jsonContent = content
			.replace(/```json\n?/g, '')
			.replace(/```\n?/g, '')
			.trim();

		let parsed;
		try {
			parsed = JSON.parse(jsonContent);
			// Handle multiple response formats
			const data = Array.isArray(parsed) ? parsed : parsed.classifications || parsed.data || [];

			// Debug output
			if (process.env.DEBUG_AI) {
				console.log('AI Response:', JSON.stringify(parsed, null, 2));
			}

			return {
				success: true,
				data,
				confidence: 0.95,
				method: 'ai-text',
				cost: 0.02
			};
		} catch (parseError) {
			console.error('Failed to parse AI response:', jsonContent);
			return {
				success: false,
				data: [],
				confidence: 0,
				method: 'ai-text',
				cost: 0.02
			};
		}
	} catch (error) {
		console.error('AI parsing error:', error);
		return {
			success: false,
			data: [],
			confidence: 0,
			method: 'ai-text',
			cost: 0
		};
	}
}

/**
 * Validate parsed salary data
 */
export function validateSalaryData(data: SalaryEntry[]): {
	isValid: boolean;
	errors: string[];
} {
	const errors: string[] = [];

	if (!Array.isArray(data) || data.length === 0) {
		errors.push('No data extracted');
		return { isValid: false, errors };
	}

	data.forEach((entry, index) => {
		// Check required fields
		if (!entry.classification) {
			errors.push(`Entry ${index}: Missing classification`);
		}

		if (!entry.steps || entry.steps.length === 0) {
			errors.push(`Entry ${index} (${entry.classification}): No salary steps`);
		}

		// Validate salary amounts
		entry.steps?.forEach((step, stepIndex) => {
			if (typeof step.amount !== 'number') {
				errors.push(`${entry.classification} step ${stepIndex}: Invalid amount type`);
			}

			// Reasonable salary range: $1 to $500,000
			if (step.amount < 1 || step.amount > 500000) {
				errors.push(`${entry.classification} step ${stepIndex}: Suspicious amount $${step.amount}`);
			}
		});

		// Validate step progression (should be increasing)
		if (entry.steps && entry.steps.length > 1) {
			for (let i = 1; i < entry.steps.length; i++) {
				if (entry.steps[i].amount < entry.steps[i - 1].amount) {
					errors.push(`${entry.classification}: Step ${i + 1} is lower than step ${i}`);
				}
			}
		}
	});

	return {
		isValid: errors.length === 0,
		errors
	};
}

/**
 * Convert AI format to internal scraper format
 */
export function convertToInternalFormat(aiData: SalaryEntry[]): any {
	const result: any = {};

	aiData.forEach((entry) => {
		const rates: any = {
			'effective-date': entry.effectiveDate,
			_source: entry.source
		};

		// Add steps
		entry.steps.forEach((step) => {
			rates[`step-${step.step}`] = step.amount;
		});

		// Create or append to classification
		if (!result[entry.classification]) {
			result[entry.classification] = {
				'annual-rates-of-pay': []
			};
		}

		result[entry.classification]['annual-rates-of-pay'].push(rates);
	});

	return result;
}

/**
 * Hybrid parser: Try DOM first, fallback to AI
 */
export async function hybridParse(
	html: string,
	sourceUrl: string,
	domParser: (html: string) => any
): Promise<ParseResult> {
	// Step 1: Try DOM parsing
	console.log(`📄 Trying DOM parser for ${sourceUrl}`);
	const domResult = domParser(html);

	const domConfidence = calculateConfidence(domResult);

	if (domConfidence > 0.85) {
		console.log(`✅ DOM parsing successful (confidence: ${(domConfidence * 100).toFixed(0)}%)`);
		return {
			success: true,
			data: convertFromInternalFormat(domResult),
			confidence: domConfidence,
			method: 'dom',
			cost: 0
		};
	}

	// Step 2: Fallback to AI
	console.log(`🤖 DOM confidence low (${(domConfidence * 100).toFixed(0)}%), trying AI parser...`);

	const tableHTML = extractTableFromHTML(html);
	const aiResult = await parseTableWithAI(tableHTML, sourceUrl);

	if (aiResult.success) {
		const validation = validateSalaryData(aiResult.data);
		if (validation.isValid) {
			console.log(`✅ AI parsing successful!`);
			return aiResult;
		} else {
			console.warn(`⚠️ AI parsing had validation errors:`, validation.errors);
			// Return AI result anyway, but with lower confidence
			return {
				...aiResult,
				confidence: 0.7,
				success: validation.errors.length < 5 // Accept if few errors
			};
		}
	}

	// Step 3: Both failed
	console.error(`❌ Both DOM and AI parsing failed for ${sourceUrl}`);
	return {
		success: false,
		data: [],
		confidence: 0,
		method: 'dom',
		cost: aiResult.cost
	};
}

/**
 * Calculate confidence score for DOM parsing result
 */
function calculateConfidence(result: any): number {
	if (!result || typeof result !== 'object') return 0;

	const classifications = Object.keys(result);
	if (classifications.length === 0) return 0;

	let score = 0.5; // Base score for having data

	// Check if classifications have proper format
	const validCodes = classifications.filter((code) => /^[A-Z]{2,4}(-[A-Z0-9]+)?(-\d+)?$/.test(code));
	score += (validCodes.length / classifications.length) * 0.2;

	// Check if salaries are in reasonable range
	let reasonableSalaries = 0;
	let totalSalaries = 0;

	classifications.forEach((code) => {
		const rates = result[code]?.['annual-rates-of-pay'] || [];
		rates.forEach((rate: any) => {
			Object.keys(rate).forEach((key) => {
				if (key.startsWith('step-')) {
					totalSalaries++;
					const amount = typeof rate[key] === 'number' ? rate[key] : Number(rate[key]);
					if (amount >= 1 && amount <= 500000) {
						reasonableSalaries++;
					}
				}
			});
		});
	});

	if (totalSalaries > 0) {
		score += (reasonableSalaries / totalSalaries) * 0.3;
	}

	return Math.min(score, 1.0);
}

/**
 * Extract table HTML from full page HTML
 */
function extractTableFromHTML(html: string): string {
	// Find all <table> elements
	const tableRegex = /<table[^>]*>[\s\S]*?<\/table>/gi;
	const tables = html.match(tableRegex) || [];

	// Return the largest table (likely the salary table)
	let largestTable = '';
	tables.forEach((table) => {
		if (table.length > largestTable.length) {
			largestTable = table;
		}
	});

	return largestTable || html.substring(0, 10000);
}

/**
 * Convert internal format back to AI format (for confidence calculation)
 */
function convertFromInternalFormat(internalData: any): SalaryEntry[] {
	const result: SalaryEntry[] = [];

	Object.keys(internalData).forEach((classification) => {
		const rates = internalData[classification]['annual-rates-of-pay'] || [];

		rates.forEach((rate: any) => {
			const steps: Array<{ step: number; amount: number }> = [];

			Object.keys(rate).forEach((key) => {
				if (key.startsWith('step-')) {
					const stepNum = parseInt(key.split('-')[1]);
					const amount = typeof rate[key] === 'number' ? rate[key] : Number(rate[key]);
					steps.push({ step: stepNum, amount });
				}
			});

			if (steps.length > 0) {
				result.push({
					classification,
					steps: steps.sort((a, b) => a.step - b.step),
					effectiveDate: rate['effective-date'] || '',
					source: rate._source || ''
				});
			}
		});
	});

	return result;
}

/**
 * Usage tracking for cost monitoring
 */
export class AIUsageTracker {
	private totalCost = 0;
	private callCount = 0;
	private successCount = 0;

	trackCall(result: ParseResult) {
		this.callCount++;
		this.totalCost += result.cost;
		if (result.success) this.successCount++;
	}

	getStats() {
		return {
			totalCalls: this.callCount,
			successfulCalls: this.successCount,
			totalCost: this.totalCost,
			averageCost: this.callCount > 0 ? this.totalCost / this.callCount : 0,
			successRate: this.callCount > 0 ? this.successCount / this.callCount : 0
		};
	}

	reset() {
		this.totalCost = 0;
		this.callCount = 0;
		this.successCount = 0;
	}
}

export const usageTracker = new AIUsageTracker();
