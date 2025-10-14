// scrape.ts
// Purpose: Fetch each Treasury Board "Rates of pay" page, scan the whole page
//          for Appendix A / Rates of pay sections, parse tables into JSON,
//          and save data.json.
//
// Run (dev):
//   npm install
//   npm run start
//
// Build + run JS:
//   npm run build
//   npm run run:js
//
// Output:
//   ./data.json

import { load } from 'cheerio';
import * as fs from 'fs/promises';
import { hybridParse, usageTracker, parseTableWithAI } from './lib/ai-parser';

/* ---------------- configuration ---------------- */

const OUTPUT_JSON = 'data/data.json';
const POLITE_DELAY_MS = 100;

// AI-assisted parsing configuration
const USE_AI_PARSING = process.env.USE_AI_PARSING === 'true';
const FORCE_AI = process.env.FORCE_AI === 'true'; // Always use AI (for testing)

// URLs that have complex table structures and should use AI parsing
const PROBLEMATIC_URLS = ['as.html', 'gl.html', '/ex.html', 'co-rcmp.html', 'sv.html', 'hp.html', 'hs.html'];

// Paste the full list of URLs here. These should be the "rates" pages or main
// collective agreement pages. Fragments are ignored; the whole page is parsed.
const URLS: string[] = [
	'https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/ai.html',
	'https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/ao.html',
	'https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/cp.html',
	'https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/ct.html',
	'https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/cx.html',
	'https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/eb.html',
	'https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/ec.html',
	'https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/el.html',
	'https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/fb.html',
	'https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/fs.html',
	'https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/it.html',
	'https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/lp.html',
	'https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/nr.html',
	'https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/pa.html',
	'https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/po.html',
	'https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/re.html',
	'https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/rm.html',
	'https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/ro.html',
	'https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/sh.html',
	'https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/so.html',
	'https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/sp.html',
	'https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/src.html',
	'https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/sre.html',
	'https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/srw.html',
	'https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/sv.html',
	'https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/tc.html',
	'https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/tr.html',
	'https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/ut.html',
	// Unrepresented senior excluded employees (managerial and confidential positions)
	'https://www.canada.ca/en/treasury-board-secretariat/services/pay/rates-pay/rates-pay-unrepresented-senior-excluded-employees/as.html',
	'https://www.canada.ca/en/treasury-board-secretariat/services/pay/rates-pay/rates-pay-unrepresented-senior-excluded-employees/ao.html',
	'https://www.canada.ca/en/treasury-board-secretariat/services/pay/rates-pay/rates-pay-unrepresented-senior-excluded-employees/co-rcmp.html',
	'https://www.canada.ca/en/treasury-board-secretariat/services/pay/rates-pay/rates-pay-unrepresented-senior-excluded-employees/ct.html',
	'https://www.canada.ca/en/treasury-board-secretariat/services/pay/rates-pay/rates-pay-unrepresented-senior-excluded-employees/cx.html',
	'https://www.canada.ca/en/treasury-board-secretariat/services/pay/rates-pay/rates-pay-unrepresented-senior-excluded-employees/ds.html',
	'https://www.canada.ca/en/treasury-board-secretariat/services/pay/rates-pay/rates-pay-unrepresented-senior-excluded-employees/ed.html',
	'https://www.canada.ca/en/treasury-board-secretariat/services/pay/rates-pay/rates-pay-unrepresented-senior-excluded-employees/ex.html',
	'https://www.canada.ca/en/treasury-board-secretariat/services/pay/rates-pay/rates-pay-unrepresented-senior-excluded-employees/fr.html',
	// 'https://www.canada.ca/en/treasury-board-secretariat/services/pay/rates-pay/rates-pay-unrepresented-senior-excluded-employees/gt.html', // 404 - page doesn't exist
	'https://www.canada.ca/en/treasury-board-secretariat/services/pay/rates-pay/rates-pay-unrepresented-senior-excluded-employees/hr.html',
	'https://www.canada.ca/en/treasury-board-secretariat/services/pay/rates-pay/rates-pay-unrepresented-senior-excluded-employees/is.html',
	'https://www.canada.ca/en/treasury-board-secretariat/services/pay/rates-pay/rates-pay-unrepresented-senior-excluded-employees/lc.html',
	'https://www.canada.ca/en/treasury-board-secretariat/services/pay/rates-pay/rates-pay-unrepresented-senior-excluded-employees/md.html',
	'https://www.canada.ca/en/treasury-board-secretariat/services/pay/rates-pay/rates-pay-unrepresented-senior-excluded-employees/mt.html',
	'https://www.canada.ca/en/treasury-board-secretariat/services/pay/rates-pay/rates-pay-unrepresented-senior-excluded-employees/nu.html',
	'https://www.canada.ca/en/treasury-board-secretariat/services/pay/rates-pay/rates-pay-unrepresented-senior-excluded-employees/om.html',
	'https://www.canada.ca/en/treasury-board-secretariat/services/pay/rates-pay/rates-pay-unrepresented-senior-excluded-employees/pe.html',
	'https://www.canada.ca/en/treasury-board-secretariat/services/pay/rates-pay/rates-pay-unrepresented-senior-excluded-employees/pi.html',
	'https://www.canada.ca/en/treasury-board-secretariat/services/pay/rates-pay/rates-pay-unrepresented-senior-excluded-employees/pm.html',
	'https://www.canada.ca/en/treasury-board-secretariat/services/pay/rates-pay/rates-pay-unrepresented-senior-excluded-employees/pg.html',
	'https://www.canada.ca/en/treasury-board-secretariat/services/pay/rates-pay/rates-pay-unrepresented-senior-excluded-employees/sg.html',
	// 'https://www.canada.ca/en/treasury-board-secretariat/services/pay/rates-pay/rates-pay-unrepresented-senior-excluded-employees/sr-w.html', // 404 - page doesn't exist
	'https://www.canada.ca/en/treasury-board-secretariat/services/pay/rates-pay/rates-pay-unrepresented-senior-excluded-employees/so.html',
	'https://www.canada.ca/en/treasury-board-secretariat/services/pay/rates-pay/rates-pay-unrepresented-senior-excluded-employees/tr.html',
	'https://www.canada.ca/en/treasury-board-secretariat/services/pay/rates-pay/rates-pay-unrepresented-senior-excluded-employees/ut.html',
	'https://www.canada.ca/en/treasury-board-secretariat/services/pay/rates-pay/rates-pay-unrepresented-senior-excluded-employees/wp.html'
];

/* ---------------- types ---------------- */

type RatesEntry = {
	'effective-date': string | null;
	// allow numeric/string step values as well as auxiliary raw keys like _raw-step-1
	[k: string]: number | string | null | undefined;
	group?: string | null;
	level?: string | null;
};

type SalaryData = {
	[classification: string]: {
		'annual-rates-of-pay': RatesEntry[];
	};
};

/* ---------------- small utilities ---------------- */

const log = (msg: string) => {
	const t = new Date().toISOString();
	console.log(`[${t}] ${msg}`);
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const clean = (s: unknown) =>
	String(s ?? '')
		// Normalize ALL dash variations to regular hyphen-minus (U+002D)
		// U+2010 Hyphen ‐
		// U+2011 Non-breaking hyphen ‑
		// U+2012 Figure dash ‒
		// U+2013 En dash –
		// U+2014 Em dash —
		// U+2015 Horizontal bar ―
		// U+2212 Minus sign −
		.replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g, '-')
		.replace(/\s+/g, ' ')
		.trim();

const parseMoney = (s: string) => {
	const n = s.replace(/[^\d.]/g, '');
	return n ? Number(n) : NaN;
};

const parseRange = (s: string): [number, number] | null => {
	if (!s || !s.trim()) return null;
	const orig = s.trim();
	// Normalize ALL dash types to regular hyphen and spacey separators
	let txt = orig.replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g, '-').replace(/\s+to\s+/i, ' - ');

	// Try patterns in a conservative order.
	// 1) explicit numeric pairs: "12,345 - 23,456" or "12.3 - 23.4"
	const m1 = txt.match(/([\d,\.]+)\s*-\s*([\d,\.]+)/);
	if (m1) {
		const a = Number(m1[1].replace(/[^\d.]/g, ''));
		const b = Number(m1[2].replace(/[^\d.]/g, ''));
		if (!Number.isNaN(a) && !Number.isNaN(b)) return [a, b];
	}

	// 2) word form: "from X to Y" or "X to Y"
	const m2 = txt.match(/from\s*([\d,\.]+)\s*to\s*([\d,\.]+)/i) || txt.match(/([\d,\.]+)\s*to\s*([\d,\.]+)/i);
	if (m2) {
		const a = Number(m2[1].replace(/[^\d.]/g, ''));
		const b = Number(m2[2].replace(/[^\d.]/g, ''));
		if (!Number.isNaN(a) && !Number.isNaN(b)) return [a, b];
	}

	// 3) open-ended patterns: "X+" or "up to Y" -> treat as single-sided ranges
	const plus = txt.match(/([\d,\.]+)\s*\+/);
	if (plus) {
		const a = Number(plus[1].replace(/[^\d.]/g, ''));
		if (!Number.isNaN(a)) return [a, a];
	}
	const upto = txt.match(/up to\s*([\d,\.]+)/i);
	if (upto) {
		const b = Number(upto[1].replace(/[^\d.]/g, ''));
		if (!Number.isNaN(b)) return [b, b];
	}

	// 4) slash-separated like "X/Y" sometimes used -> pick both
	const slash = txt.match(/([\d,\.]+)\s*\/\s*([\d,\.]+)/);
	if (slash) {
		const a = Number(slash[1].replace(/[^\d.]/g, ''));
		const b = Number(slash[2].replace(/[^\d.]/g, ''));
		if (!Number.isNaN(a) && !Number.isNaN(b)) return [a, b];
	}

	// Fallback: no reliable numeric pair found
	return null;
};

const looksMoney = (s: string) => /\$?\s*\d[\d,]*(\.\d{2})?/.test(s);

const firstClassificationIn = (s: string) => {
	// Try to extract common classification codes that appear in headings.
	// Examples we want to match:
	//  - "AI, Air Traffic Control" -> "AI"
	//  - "CS-01" -> "CS-01"
	//  - "NU-CHN-03" -> "NU-CHN-03"
	//  - "AS‐1" (with various dashes) -> "AS-01"
	const txt = clean(s || '');

	// Special case: "AS – Development" or similar developmental rates
	// Only match if we explicitly see "Development" or "Developmental" with AS
	if (/\bAS\s*[-‐‑‒–—―]\s*Develop(ment|mental)\b/i.test(txt)) {
		return 'AS-DEV';
	}

	const patterns: RegExp[] = [
		// Pattern: ABC-DEF-12 or ABC-12 (letters groups with trailing digits)
		/\b([A-Z]{1,4}(?:-[A-Z]{2,4})*-\d{1,3})\b/,
		// Pattern: AS-02, CS-01 (letters + hyphen + digits)
		/\b([A-Z]{1,4}-\d{1,3})\b/,
		// Pattern: short alpha codes like AI, GS (2-4 uppercase letters)
		/\b([A-Z]{2,4})\b/
	];

	for (const re of patterns) {
		const m = txt.match(re);
		if (!m || !m[1]) continue;
		let cand = m[1].replace(/[,:;.]$/g, '');
		// Ignore single-letter Appendix markers like "A" and common words
		if (/^[A-Z]$/.test(cand)) continue;
		if (/^appendix$/i.test(cand)) continue;

		// Normalize single-digit level codes to zero-padded format (AS-1 -> AS-01)
		cand = cand.replace(/^([A-Z]{2,4})-(\d)$/, (match, letters, digit) => {
			return `${letters}-0${digit}`;
		});

		return cand;
	}
	return null;
};

function dedupe<T>(arr: T[], keyFn: (x: T) => string): T[] {
	const seen = new Set<string>();
	const out: T[] = [];
	for (const x of arr) {
		const k = keyFn(x);
		if (seen.has(k)) continue;
		seen.add(k);
		out.push(x);
	}
	return out;
}

function sortSalaryData(data: SalaryData): SalaryData {
	// Sort classification codes alphabetically
	const sorted: SalaryData = {};
	const keys = Object.keys(data).sort((a, b) => {
		// Sort alphabetically, case-insensitive
		return a.toUpperCase().localeCompare(b.toUpperCase());
	});

	for (const key of keys) {
		sorted[key] = data[key];
	}

	return sorted;
}

/* ---------------- HTML helpers ---------------- */

function simpleTable($: any, $table: any) {
	let headers: string[] = [];

	const $thead = $table.find('thead');
	if ($thead.length) {
		headers = $thead
			.find('tr')
			.first()
			.find('th,td')
			.map((_: number, el: any) => clean($(el).text()))
			.get();
	} else {
		const $firstRow = $table.find('tr').first();
		const ths = $firstRow.find('th');
		headers = ths.length
			? ths.map((_: number, el: any) => clean($(el).text())).get()
			: $firstRow
					.find('td')
					.map((i: number) => `Column ${i + 1}`)
					.get();
	}

	const rows: string[][] = [];
	const $bodyRows = $table.find('tbody tr');
	const src = $bodyRows.length ? $bodyRows : $table.find('tr').slice(1);
	src.each((_: number, tr: any) => {
		rows.push(
			$(tr)
				.find('th,td')
				.map((__: number, td: any) => clean($(td).text()))
				.get()
		);
	});

	return { headers, rows };
}

const extractEffectiveDate = (text: string) => {
	const t = clean(text);
	// Match Month D, YYYY or Month D YYYY and pick the last occurrence in the text
	const re = /\b(?:effective(?:\s+date)?\s*[:\-]?\s*)?([A-Z][a-z]+ \d{1,2},? \d{4})\b/g;
	const matches = Array.from(t.matchAll(re));
	if (!matches.length) return null;
	return matches[matches.length - 1][1];
};

function parseClassificationLegend($: any, contentNodes: any[]): Record<string, string> {
	const legendMap: Record<string, string> = {};

	// Look through all content nodes for legend entries
	for (const node of contentNodes) {
		const $node = $(node);
		const text = $node.text();

		// Check if this node or its children contain "Table legend" or "legend"
		const hasLegendHeading =
			text.toLowerCase().includes('table legend') ||
			text.toLowerCase().includes('legend') ||
			$node.find('*').filter((_i: any, el: any) => {
				return $(el).text().toLowerCase().includes('legend');
			}).length > 0;

		if (hasLegendHeading) {
			// Parse legend entries from this node and following nodes
			let currentNode = $node;
			let searchNodes = [$node];

			// Also check the next few sibling nodes for legend entries
			let nextSibling = $node.next();
			let count = 0;
			while (nextSibling.length && count < 10) {
				// Limit search to avoid going too far
				searchNodes.push(nextSibling);
				nextSibling = nextSibling.next();
				count++;
			}

			for (const $searchNode of searchNodes) {
				const nodeText = $searchNode.text();

				// Parse legend entries like "$) Effective June 21, 2020" or "A) Effective June 21, 2021"
				const legendEntries = nodeText.match(/([A-Z$])\)\s*Effective\s+([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})[^\n\r]*/g);

				if (legendEntries) {
					legendEntries.forEach((entry: string) => {
						const match = entry.match(/([A-Z$])\)\s*Effective\s+([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})/);
						if (match) {
							const symbol = match[1];
							const date = match[2].replace(/,(\s+\d{4})/, '$1'); // Clean up comma formatting
							legendMap[symbol] = date;
						}
					});
				}
			}

			// If we found legend entries, break out of the loop
			if (Object.keys(legendMap).length > 0) {
				break;
			}
		}
	}

	return legendMap;
}

function tableToRatesBlocks(
	$: any,
	$table: any,
	sourceUrl?: string,
	legendMap: Record<string, string> = {}
): RatesEntry[] {
	const caption = clean($table.find('caption').first().text());
	const pageOrPrevText = clean($table.prev().text());
	const captionOrPrevEff = extractEffectiveDate(caption) || extractEffectiveDate(pageOrPrevText) || null;

	const { headers, rows } = simpleTable($, $table);
	if (!headers.length || !rows.length) return [];

	// Identify columns that look like steps and mark range columns.
	type StepCol = { idx: number; isRange: boolean };
	const stepCols: StepCol[] = [];
	headers.forEach((h, i) => {
		const t = (h || '').toLowerCase();
		// skip explicit effective date columns
		if (/effective/.test(t) || /effective date/.test(t) || /date/.test(t)) return;
		// mark columns that explicitly mention range
		const isRangeHeader = /range/.test(t);
		if (/^(step(\s*\d+)?|\d+|rate\s*\d+|salary|pay|range)$/i.test(t) || isRangeHeader) {
			stepCols.push({ idx: i, isRange: isRangeHeader });
		}
	});
	if (!stepCols.length) {
		// fallback: use all columns except the first (commonly effective date)
		for (let i = 1; i < headers.length; i++) stepCols.push({ idx: i, isRange: /range/.test(headers[i]) });
	}

	const out: RatesEntry[] = [];

	// NEW APPROACH: If we have legend mappings and headers that look like symbols,
	// create one entry per effective date with all salary steps
	if (Object.keys(legendMap).length > 0) {
		// Check if headers contain legend symbols
		const symbolHeaders = headers.filter((h, i) => i > 0 && legendMap[clean(h)]);

		if (symbolHeaders.length > 0) {
			// Process each symbol/effective date
			symbolHeaders.forEach((header, headerIdx) => {
				const symbol = clean(header);
				const effectiveDate = legendMap[symbol];

				if (!effectiveDate) return;

				const entry: RatesEntry = { 'effective-date': effectiveDate } as RatesEntry;
				if (sourceUrl) entry['_source'] = sourceUrl;

				// For each row, get the salary value from this column
				let stepNum = 1;
				rows.forEach((row, rowIdx) => {
					const columnIdx = headerIdx + 1; // +1 because we filtered out first column
					const cellValue = clean(row[columnIdx] ?? '');

					if (cellValue) {
						// Check if it's a range
						const range = parseRange(cellValue);
						if (range && range.length === 2) {
							entry[`step-${stepNum}`] = range[0];
							entry[`_raw-step-${stepNum}`] = cellValue;
							entry[`step-${stepNum + 1}`] = range[1];
							entry[`_raw-step-${stepNum + 1}`] = cellValue;
							stepNum += 2;
						} else {
							const v = parseMoney(cellValue);
							if (!Number.isNaN(v)) {
								entry[`step-${stepNum}`] = v;
								stepNum++;
							}
						}
					}
				});

				if (Object.keys(entry).some((k) => /^step-\d+$/.test(k))) {
					out.push(entry);
				}
			});

			return out;
		}
	}

	// FALLBACK: Original logic for non-legend tables
	// For each data row, try to extract an effective date from the first cell
	for (const row of rows) {
		const rowFirst = clean(row[0] ?? '');
		// prefer the full text (including label like "$)" or "A)" and any trailing notes)
		const dateRe = /[A-Z]?[)\w\s\-,:]*?\b([A-Z][a-z]+ \d{1,2},? \d{4})\b/;
		let eff: string | null = null;
		if (dateRe.test(rowFirst)) {
			eff = rowFirst;
		} else if (caption && dateRe.test(caption)) {
			eff = caption;
		} else if (pageOrPrevText && dateRe.test(pageOrPrevText)) {
			eff = pageOrPrevText;
		} else {
			eff = null;
		}

		const entry: RatesEntry = { 'effective-date': eff } as RatesEntry;
		// record the source page for this block so consumers can trace origin
		if (sourceUrl) entry['_source'] = sourceUrl;
		let n = 1;
		for (const sc of stepCols) {
			const i = sc.idx;
			const cell = clean(row[i] ?? '');

			// If header or cell looks like a range, try to split into min/max steps
			const looksRange = sc.isRange || /\bto\b|\u2013|\u2014|\s-\s|\+/.test(cell);
			if (looksRange) {
				// Try to parse the numeric range (e.g. "50,000 - 60,000")
				const range = parseRange(cell);
				if (range && range.length === 2) {
					// map min -> step-n, max -> step-(n+1)
					entry[`step-${n}`] = range[0];
					entry[`_raw-step-${n}`] = cell;
					entry[`step-${n + 1}`] = range[1];
					entry[`_raw-step-${n + 1}`] = cell;
					n += 2;
					continue;
				}
				// Fallback: preserve original formatting where possible
				entry[`step-${n}`] = cell;
				n++;
				continue;
			}

			const v = parseMoney(cell);
			if (!Number.isNaN(v)) {
				entry[`step-${n}`] = v;
				n++;
			}
		}

		if (Object.keys(entry).some((k) => /^step-\d+$/.test(k))) out.push(entry);
	}

	return out;
}

function tableToRatesBlocksWithRows(
	$: any,
	$table: any,
	filteredRows: string[][],
	sourceUrl?: string,
	legendMap: Record<string, string> = {}
): RatesEntry[] {
	const { headers } = simpleTable($, $table);

	// Use filtered rows instead of all table rows
	const rows = filteredRows;

	const caption = clean($table.find('caption').first().text());

	// Now call the existing logic with our filtered data
	return tableToRatesBlocksFromData(headers, rows, caption, sourceUrl, legendMap);
}

function tableToRatesBlocksFromData(
	headers: string[],
	rows: string[][],
	caption?: string,
	sourceUrl?: string,
	legendMap: Record<string, string> = {}
): RatesEntry[] {
	// Identify columns that look like steps and mark range columns.
	type StepCol = { idx: number; isRange: boolean };
	const stepCols: StepCol[] = [];
	headers.forEach((h, i) => {
		const t = (h || '').toLowerCase();
		// skip explicit effective date columns
		if (/effective/.test(t) || /effective date/.test(t) || /date/.test(t)) return;
		// mark columns that explicitly mention range
		const isRangeHeader = /range/.test(t);
		if (/^(step(\s*\d+)?|\d+|rate\s*\d+|salary|pay|range)$/i.test(t) || isRangeHeader) {
			stepCols.push({ idx: i, isRange: isRangeHeader });
		}
	});
	if (!stepCols.length) {
		// fallback: use all columns except the first (commonly effective date)
		for (let i = 1; i < headers.length; i++) stepCols.push({ idx: i, isRange: /range/.test(headers[i]) });
	}

	const out: RatesEntry[] = [];

	// NEW APPROACH: If we have legend mappings and headers that look like symbols,
	// create one entry per effective date with all salary steps
	if (Object.keys(legendMap).length > 0) {
		// Check if headers contain legend symbols
		const symbolHeaders = headers.filter((h, i) => i > 0 && legendMap[clean(h)]);

		if (symbolHeaders.length > 0) {
			// Process each symbol/effective date
			symbolHeaders.forEach((header, headerIdx) => {
				const symbol = clean(header);
				const effectiveDate = legendMap[symbol];

				if (!effectiveDate) return;

				const entry: RatesEntry = { 'effective-date': effectiveDate } as RatesEntry;
				if (sourceUrl) entry['_source'] = sourceUrl;

				// For each row, get the salary value from this column
				let stepNum = 1;
				rows.forEach((row, rowIdx) => {
					const columnIdx = headerIdx + 1; // +1 because we filtered out first column
					const cellValue = clean(row[columnIdx] ?? '');

					if (cellValue) {
						// Check if it's a range
						const range = parseRange(cellValue);
						if (range && range.length === 2) {
							entry[`step-${stepNum}`] = range[0];
							entry[`_raw-step-${stepNum}`] = cellValue;
							entry[`step-${stepNum + 1}`] = range[1];
							entry[`_raw-step-${stepNum + 1}`] = cellValue;
							stepNum += 2;
						} else {
							const v = parseMoney(cellValue);
							if (!Number.isNaN(v)) {
								entry[`step-${stepNum}`] = v;
								stepNum++;
							}
						}
					}
				});

				if (Object.keys(entry).some((k) => /^step-\d+$/.test(k))) {
					out.push(entry);
				}
			});

			return out;
		}
	}

	// FALLBACK: Original logic for non-legend tables
	// For each data row, try to extract an effective date from the first cell
	for (const row of rows) {
		const rowFirst = clean(row[0] ?? '');
		// prefer the full text (including label like "$)" or "A)" and any trailing notes)
		const dateRe = /[A-Z]?[)\w\s\-,:]*?\b([A-Z][a-z]+ \d{1,2},? \d{4})\b/;
		let eff: string | null = null;
		if (dateRe.test(rowFirst)) {
			eff = rowFirst;
		} else if (caption && dateRe.test(caption)) {
			eff = caption;
		} else {
			eff = null;
		}

		const entry: RatesEntry = { 'effective-date': eff } as RatesEntry;
		// record the source page for this block so consumers can trace origin
		if (sourceUrl) entry['_source'] = sourceUrl;
		let n = 1;
		for (const sc of stepCols) {
			const i = sc.idx;
			const cell = clean(row[i] ?? '');
			if (!cell) continue;

			if (sc.isRange) {
				const range = parseRange(cell);
				if (range && range.length === 2) {
					entry[`step-${n}`] = range[0];
					entry[`_raw-step-${n}`] = cell;
					entry[`step-${n + 1}`] = range[1];
					entry[`_raw-step-${n + 1}`] = cell;
					n += 2;
					continue;
				}
			}

			const v = parseMoney(cell);
			if (!Number.isNaN(v)) {
				entry[`step-${n}`] = v;
				n++;
			}
		}

		if (Object.keys(entry).some((k) => /^step-\d+$/.test(k))) out.push(entry);
	}

	return out;
}

const headingLevel = ($el: any) => {
	const tag = ($el.prop('tagName') || '').toString().toLowerCase();
	const m = tag.match(/^h([1-6])$/);
	return m ? Number(m[1]) : null;
};

function collectUntilNextHeading($: any, $start: any) {
	const out: any[] = [];
	if (!$start.length) return out;
	const startLevel = headingLevel($start) ?? 6;
	let $cur = $start.next();
	while ($cur && $cur.length) {
		const lvl = headingLevel($cur);
		if (lvl && lvl <= startLevel) break;
		out.push($cur.get(0));
		$cur = $cur.next();
	}
	return out;
}

function findAppendixOrRatesStarts($: any) {
	// Return possible starting headings for Appendix A or Rates of pay
	const all = $('h1,h2,h3,h4,h5,h6')
		.toArray()
		.map((e: any) => $(e));
	return all.filter(($h: any) => {
		const t = clean($h.text()).toLowerCase();
		return (
			/appendix\s*a\b/.test(t) ||
			/\b(annual\s+)?rates\s+of\s+pay\b/.test(t) ||
			/\brates\b/.test(t) ||
			/\bsalary\s+rates\b/.test(t)
		);
	});
}

function parseAppendixInNodes($: any, nodes: any[], sourceUrl?: string) {
	const out: SalaryData = {};
	let currentClass: string | null = null;

	for (const node of nodes) {
		const $el = $(node);
		const tag = ($el.prop('tagName') || '').toString().toLowerCase();

		if (/^h[1-6]$/.test(tag)) {
			const maybe = firstClassificationIn(clean($el.text()));
			if (maybe) {
				currentClass = maybe;
				if (!out[currentClass]) out[currentClass] = { 'annual-rates-of-pay': [] };
			}
			continue;
		}

		// Try to find tables in this node. If a table caption contains a
		// classification (e.g. "AI-01: annual rates of pay"), prefer that.
		const tables = $el.is('table')
			? [$el]
			: $el
					.find('table')
					.toArray()
					.map((e: any) => $(e));

		for (const $t of tables) {
			// Attempt to extract classification from the table caption first.
			const captionText = clean($t.find('caption').first().text());
			const fromCaption = firstClassificationIn(captionText ?? '') ?? null;
			const useClass = fromCaption ?? currentClass;
			if (!useClass) continue;

			if (!out[useClass]) out[useClass] = { 'annual-rates-of-pay': [] };

			const blocks = tableToRatesBlocks($, $t, sourceUrl);
			if (!blocks.length) continue;

			for (const block of blocks) {
				// Attach group/level when possible: AI-01 -> group: AI, level: 01
				const m = (fromCaption ?? useClass).match(/^([A-Z]{1,4})(?:-(\d{1,3}))?$/);
				if (m) {
					block.group = m[1];
					block.level = m[2] ?? null;
				} else {
					// fallback: try to capture leading alpha sequence
					const mm = (fromCaption ?? useClass).match(/^([A-Z]{2,4})/);
					if (mm) block.group = mm[1];
				}

				out[useClass]['annual-rates-of-pay'].push(block);
			}
		}
	}

	// de-duplicate entries
	for (const k of Object.keys(out)) {
		const seen = new Set<string>();
		const arr = out[k]['annual-rates-of-pay'];
		// Keep the last entry for duplicate effective-date. We'll iterate from
		// the end, record seen dates, and then reverse to preserve original order
		const rev: any[] = [];
		const seenDates = new Set<string>();
		for (let i = arr.length - 1; i >= 0; i--) {
			const d = String(arr[i]['effective-date'] ?? '').trim();
			if (d && !seenDates.has(d)) {
				seenDates.add(d);
				rev.push(arr[i]);
			}
		}
		out[k]['annual-rates-of-pay'] = rev.reverse();
	}

	return out;
}

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

function sortSteps(entry: RatesEntry): RatesEntry {
	const { ['effective-date']: eff, ...rest } = entry;
	// Collect numeric/string steps and any _raw-step metadata
	const stepEntries: Array<[number, number | string]> = [];
	const rawMap: Map<number, string> = new Map();

	for (const [k, v] of Object.entries(rest)) {
		const stepMatch = k.match(/^step-(\d+)$/);
		if (stepMatch) {
			const idx = Number(stepMatch[1]);
			// preserve original string values (ranges) and numeric values as numbers
			stepEntries.push([idx, typeof v === 'string' ? v : Number(v)]);
			continue;
		}
		const rawMatch = k.match(/^_raw-step-(\d+)$/);
		if (rawMatch) {
			const idx = Number(rawMatch[1]);
			if (typeof v === 'string') rawMap.set(idx, v);
		}
	}

	stepEntries.sort((a, b) => a[0] - b[0]);

	// Renumber steps sequentially to step-1 ... step-N and carry raw metadata.
	const out: RatesEntry = { 'effective-date': eff ?? null } as RatesEntry;
	let cur = 1;
	for (const [_, val] of stepEntries) {
		out[`step-${cur}`] = val;
		const raw = rawMap.get(_ as number);
		if (raw) out[`_raw-step-${cur}`] = raw;
		cur++;
	}
	// Preserve other underscore-prefixed metadata (e.g. _source)
	for (const [k, v] of Object.entries(rest)) {
		if (k.startsWith('_') && !/^_raw-step-\d+$/.test(k)) {
			out[k] = v as any;
		}
	}
	return out;
}

/* ---------------- core scrape ---------------- */

async function fetchPage(url: string): Promise<string> {
	log(`Fetching: ${url}`);
	try {
		const r = await fetch(url, {
			headers: {
				'User-Agent': 'VAC scraper (respectful fetch)',
				Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
				'Accept-Language': 'en-US,en;q=0.5',
				'Accept-Encoding': 'gzip, deflate',
				Connection: 'keep-alive',
				'Upgrade-Insecure-Requests': '1'
			}
		});

		if (!r.ok) {
			const errorText = await r.text();
			log(`HTTP ${r.status} for ${url}. Response: ${errorText.substring(0, 200)}...`);
			throw new Error(`HTTP ${r.status} for ${url}`);
		}

		const html = await r.text();

		// Check if we got an error page instead of content
		if (
			html.includes('An error occurred') ||
			html.includes('Page not found') ||
			html.includes('404') ||
			html.length < 1000
		) {
			log(`Warning: ${url} returned suspicious content (length: ${html.length})`);
			log(`Content preview: ${html.substring(0, 500)}...`);
		}

		await sleep(POLITE_DELAY_MS);
		return html;
	} catch (error) {
		log(`Failed to fetch ${url}: ${error instanceof Error ? error.message : String(error)}`);
		throw error;
	}
}

async function scrapeAppendixAFromPage(url: string): Promise<SalaryData> {
	const html = await fetchPage(url);
	const $ = load(html);

	// Check if this URL should use AI parsing
	const shouldUseAI = FORCE_AI || (USE_AI_PARSING && PROBLEMATIC_URLS.some((pattern) => url.includes(pattern)));

	if (shouldUseAI) {
		try {
			log(`🤖 Using AI parsing for ${url}`);
			const result = await hybridParse(html, url, ($) => parseAppendixFromDocument($, url));

			if (result.success) {
				log(`✅ AI parsing successful (method: ${result.method}, cost: $${result.cost.toFixed(3)})`);
				usageTracker.trackCall(result);

				// Convert AI format to internal format
				if (result.method === 'ai-text' && result.data.length > 0) {
					const converted: SalaryData = {};
					result.data.forEach((entry) => {
						const rates: RatesEntry = {
							'effective-date': entry.effectiveDate,
							_source: entry.source
						};
						entry.steps.forEach((step) => {
							rates[`step-${step.step}`] = step.amount;
						});
						if (!converted[entry.classification]) {
							converted[entry.classification] = { 'annual-rates-of-pay': [] };
						}
						converted[entry.classification]['annual-rates-of-pay'].push(rates);
					});
					return converted;
				}
			} else {
				log(`⚠️ AI parsing failed, falling back to DOM parser`);
			}
		} catch (aiError) {
			log(`⚠️ AI parsing error: ${aiError instanceof Error ? aiError.message : String(aiError)}`);
			log(`   Falling back to DOM parser`);
		}
	}

	// Use simplified parser for unrepresented pages
	if (url?.includes('rates-pay-unrepresented')) {
		return parseUnrepresentedPage($, url);
	}

	return parseAppendixFromDocument($, url);
}
/**
 * Simplified parser for unrepresented senior excluded employee pages.
 * These pages have a simpler structure with tables containing captions like:
 * "Code: 30100<br>AS-07 – Annual rates of pay (in dollars)"
 */
function parseUnrepresentedPage($: any, sourceUrl?: string): SalaryData {
	const result: SalaryData = {};

	// Map RCMP rank names to classification codes
	const rcmpRankMap: { [key: string]: string } = {
		inspector: 'CO-RCMP-01',
		superintendent: 'CO-RCMP-02',
		'chief superintendent': 'CO-RCMP-03',
		'assistant commissioner (1)': 'CO-RCMP-04',
		'assistant commissioner (2)': 'CO-RCMP-05',
		'deputy commissioner': 'CO-RCMP-06'
	};

	// Find all tables on the page
	const tables = $('table').toArray();

	for (const tableElem of tables) {
		const $table = $(tableElem);

		// Get the caption text which contains the classification code
		const captionText = clean($table.find('caption').first().text());

		// Extract classification from caption (e.g., "AS-07", "EX-01")
		let classification = firstClassificationIn(captionText);

		// Check for RCMP rank-based classifications
		if (!classification) {
			const captionLower = captionText.toLowerCase();
			for (const [rank, code] of Object.entries(rcmpRankMap)) {
				if (captionLower.includes(rank)) {
					classification = code;
					break;
				}
			}
		}

		if (!classification) {
			// Try looking for classification in heading before table
			const $prevHeading = $table.prevAll('h1,h2,h3,h4,h5,h6').first();
			if ($prevHeading && $prevHeading.length) {
				classification = firstClassificationIn(clean($prevHeading.text()));
			}

			if (!classification) continue;
		} // Parse the table structure
		const { headers, rows } = simpleTable($, $table);

		if (!headers.length || !rows.length) continue;

		// Find the "Effective Date" column and salary step columns
		const dateColIndex = headers.findIndex((h) => /effective\s*date/i.test(clean(h)));
		if (dateColIndex === -1) continue;

		// Find all step columns (step-1, step-2, etc. or just numeric columns)
		const stepColumns: { index: number; stepNum: number; isMinMax?: boolean }[] = [];
		for (let i = 0; i < headers.length; i++) {
			if (i === dateColIndex) continue;

			const headerText = clean(headers[i]);
			// Match "Step 1", "Step-1", or just "1", "2", "3"
			const stepMatch = headerText.match(/step[-\s]*(\d+)/i) || headerText.match(/^(\d+)$/);
			if (stepMatch) {
				stepColumns.push({ index: i, stepNum: parseInt(stepMatch[1], 10) });
			}
			// Check for Minimum/Maximum columns (RCMP ranks)
			else if (/minimum/i.test(headerText)) {
				stepColumns.push({ index: i, stepNum: 1, isMinMax: true });
			} else if (/maximum/i.test(headerText)) {
				stepColumns.push({ index: i, stepNum: 2, isMinMax: true });
			}
		}

		// If no step columns found, look for any numeric columns after date
		if (stepColumns.length === 0) {
			for (let i = dateColIndex + 1; i < headers.length; i++) {
				// Assume columns after date are steps in order
				stepColumns.push({ index: i, stepNum: i - dateColIndex });
			}
		}

		if (stepColumns.length === 0) continue;

		// Initialize classification entry
		if (!result[classification]) {
			result[classification] = { 'annual-rates-of-pay': [] };
		}

		// Process each row
		for (const row of rows) {
			const dateText = clean(row[dateColIndex] ?? '');
			if (!dateText) continue;

			const entry: RatesEntry = {
				'effective-date': dateText
			};

			// Add source URL for tracking
			if (sourceUrl) {
				(entry as any)._source = sourceUrl;
			}

			// Extract salary values for each step
			for (const { index, stepNum } of stepColumns) {
				const cellText = clean(row[index] ?? '');
				if (!cellText) continue;

				// Check if cell contains a range (e.g., "100,220 to 114,592")
				const rangeMatch = cellText.match(/(\d[\d,]+)\s+to\s+(\d[\d,]+)/i);
				if (rangeMatch) {
					// Split range into step-1 (minimum) and step-2 (maximum)
					const minAmount = parseMoney(rangeMatch[1]);
					const maxAmount = parseMoney(rangeMatch[2]);
					if (minAmount !== null && minAmount > 0) {
						entry['step-1'] = minAmount;
					}
					if (maxAmount !== null && maxAmount > 0) {
						entry['step-2'] = maxAmount;
					}
				} else {
					// Single value - treat as normal step
					const amount = parseMoney(cellText);
					if (amount !== null && amount > 0) {
						entry[`step-${stepNum}`] = amount;
					}
				}
			}

			// Only add entry if it has at least one salary step
			const hasSteps = Object.keys(entry).some((k) => k.startsWith('step-'));
			if (hasSteps) {
				result[classification]['annual-rates-of-pay'].push(entry);
			}
		}
	}

	return result;
}

function parseAppendixFromDocument($: any, sourceUrl?: string): SalaryData {
	const starts = findAppendixOrRatesStarts($);
	if (!starts.length) return {};

	const result: SalaryData = {};

	for (const $start of starts) {
		const $section = $start.closest('section.pdf-section');

		// Collect tables from the section and from the sibling traversal
		const tables: any[] = [];
		const seenTables = new Set<any>();

		if ($section && $section.length) {
			$section
				.find('table')
				.toArray()
				.forEach((t: any) => {
					if (!seenTables.has(t)) {
						seenTables.add(t);
						tables.push($(t));
					}
				});
		}

		const nodes = collectUntilNextHeading($, $start);

		// Parse legend mappings from all collected nodes
		const legendMap = parseClassificationLegend($, nodes);

		for (const n of nodes) {
			const $n = $(n);
			$n.find('table')
				.toArray()
				.forEach((t: any) => {
					if (!seenTables.has(t)) {
						seenTables.add(t);
						tables.push($(t));
					}
				});
			// also if the node itself is a table
			if ($n.is('table') && !seenTables.has($n.get(0))) {
				seenTables.add($n.get(0));
				tables.push($n as any);
			}
		}

		// Process each table explicitly
		for (const $t of tables) {
			const captionText = clean($t.find('caption').first().text());
			const fromCaption = firstClassificationIn(captionText ?? '') ?? null;

			// Try to find nearest previous heading to this table for classification
			let useClass: string | null = fromCaption;
			if (!useClass) {
				const $prevHeading = $t.prevAll('h1,h2,h3,h4,h5,h6').first();
				if ($prevHeading && $prevHeading.length) {
					useClass = firstClassificationIn(clean($prevHeading.text())) ?? null;
				}
			}
			// Fallback to the start heading classification
			if (!useClass) useClass = firstClassificationIn(clean($start.text())) ?? null;

			// NEW: Check if this table contains multiple classifications in its rows
			const rowClassifications = new Map<string, any[]>();
			const { headers, rows } = simpleTable($, $t);

			// Enhanced classification detection for complex tables
			const allRowClassifications: string[] = [];
			const rowClassificationMapping: { [rowIndex: number]: string } = {};

			for (let i = 0; i < rows.length; i++) {
				const row = rows[i];
				let rowClass: string | null = null;

				// Try multiple approaches to find classification in this row
				// Look in first 3 columns for classification codes
				for (let cellIndex = 0; cellIndex < Math.min(3, row.length); cellIndex++) {
					const cellText = clean(row[cellIndex] ?? '');
					const foundClass = firstClassificationIn(cellText);
					if (foundClass) {
						rowClass = foundClass;
						break;
					}

					// Additional aggressive pattern matching for variations like "AS 1" or just "1" in AS tables
					if (!foundClass && useClass && useClass.startsWith('AS')) {
						// Look for standalone digits 1-8 that might be AS levels
						const digitMatch = cellText.match(/^\s*(\d)\s*$/);
						if (digitMatch && digitMatch[1]) {
							const level = digitMatch[1];
							if (parseInt(level) >= 1 && parseInt(level) <= 8) {
								rowClass = `AS-0${level}`;
								break;
							}
						}
					}
				}

				if (rowClass) {
					allRowClassifications.push(rowClass);
					rowClassificationMapping[i] = rowClass;
				}
			}

			// Group rows by classification
			for (let i = 0; i < rows.length; i++) {
				const rowClass = rowClassificationMapping[i];
				if (rowClass) {
					if (!rowClassifications.has(rowClass)) {
						rowClassifications.set(rowClass, []);
					}
					rowClassifications.get(rowClass)!.push(rows[i]);
				}
			}

			// If we found multiple classifications in rows, process each separately
			if (rowClassifications.size > 0) {
				rowClassifications.forEach((classRows, classification) => {
					if (!result[classification]) result[classification] = { 'annual-rates-of-pay': [] };

					// Create blocks using the existing tableToRatesBlocks logic but with filtered rows
					const blocks = tableToRatesBlocksWithRows($, $t, classRows, sourceUrl, legendMap);

					for (const block of blocks) {
						const m = classification.match(/^([A-Z]{1,4})(?:-(\d{1,3}))?$/);
						if (m) {
							block.group = m[1];
							block.level = m[2] ?? null;
						} else {
							const mm = classification.match(/^([A-Z]{2,4})/);
							if (mm) block.group = mm[1];
						}
						result[classification]['annual-rates-of-pay'].push(block);
					}
				});
			} else {
				// Fallback to original single-classification logic
				if (!useClass) continue;
				if (!result[useClass]) result[useClass] = { 'annual-rates-of-pay': [] };

				const blocks = tableToRatesBlocks($, $t, sourceUrl, legendMap);
				for (const block of blocks) {
					const m = (fromCaption ?? useClass).match(/^([A-Z]{1,4})(?:-(\d{1,3}))?$/);
					if (m) {
						block.group = m[1];
						block.level = m[2] ?? null;
					} else {
						const mm = (fromCaption ?? useClass).match(/^([A-Z]{2,4})/);
						if (mm) block.group = mm[1];
					}
					result[useClass]['annual-rates-of-pay'].push(block);
				}
			}
		}
	}

	// Merge/sort/dedupe similar to previous behavior
	for (const k of Object.keys(result)) {
		result[k]['annual-rates-of-pay'] = dedupe(result[k]['annual-rates-of-pay'].map(sortSteps), (x) =>
			JSON.stringify(x)
		);
	}

	// Keep last occurrence per effective-date
	for (const k of Object.keys(result)) {
		const arr = result[k]['annual-rates-of-pay'];
		const rev: any[] = [];
		const seenDates = new Set<string>();
		for (let i = arr.length - 1; i >= 0; i--) {
			const d = String(arr[i]['effective-date'] ?? '').trim();
			if (d && !seenDates.has(d)) {
				seenDates.add(d);
				rev.push(arr[i]);
			}
		}
		result[k]['annual-rates-of-pay'] = rev.reverse();
	}

	return result;
}

async function scrapeAll(urls: string[]): Promise<SalaryData> {
	const result: SalaryData = {};
	let ok = 0;
	const failed: string[] = [];

	for (const url of urls) {
		try {
			log(`Processing ${urls.indexOf(url) + 1}/${urls.length}: ${url}`);
			const pageData = await scrapeAppendixAFromPage(url);
			const classificationCount = Object.keys(pageData).length;

			if (classificationCount > 0) {
				mergeData(result, pageData, url); // Pass URL to track source
				log(`✓ Success: ${url} -> ${classificationCount} classifications`);
				ok++;
			} else {
				log(`⚠ Warning: ${url} -> No classifications found`);
				failed.push(url);
			}
		} catch (e: unknown) {
			const errorMsg = e instanceof Error ? e.message : String(e);
			log(`✗ FAIL: ${url} -> ${errorMsg}`);
			failed.push(url);
		}
	}

	log(`\n=== SCRAPING SUMMARY ===`);
	log(`Successful: ${ok}/${urls.length} pages`);
	log(`Total classifications found: ${Object.keys(result).length}`);

	if (failed.length > 0) {
		log(`\nFailed URLs (${failed.length}):`);
		failed.forEach((url) => log(`  - ${url}`));
	}

	// Display AI usage statistics if AI was used
	if (USE_AI_PARSING || FORCE_AI) {
		const stats = usageTracker.getStats();
		if (stats.totalCalls > 0) {
			log(`\n📊 AI Usage Statistics:`);
			log(`   Total AI calls: ${stats.totalCalls}`);
			log(`   Successful: ${stats.successfulCalls} (${(stats.successRate * 100).toFixed(1)}%)`);
			log(`   Total cost: $${stats.totalCost.toFixed(3)}`);
			log(`   Average cost per call: $${stats.averageCost.toFixed(4)}`);
		}
	}

	return result;
}

/* ---------------- entry point ---------------- */

// Helper to detect if we're running in a serverless environment
function isServerless(): boolean {
	return !!(
		process.env.LAMBDA_TASK_ROOT ||
		process.env.AWS_LAMBDA_FUNCTION_NAME ||
		process.env.VERCEL ||
		process.env.NETLIFY
	);
}

async function main() {
	try {
		log('Starting scraper');
		const data = await scrapeAll(URLS);

		// Sort the data alphabetically by classification code
		const sortedData = sortSalaryData(data);

		// In serverless environments, return the data instead of writing to file
		// (serverless file systems are read-only except /tmp)
		if (isServerless()) {
			log('Serverless environment detected - returning data');
			return sortedData;
		}

		// In local/non-serverless environments, write to file as before
		await fs.writeFile(OUTPUT_JSON, JSON.stringify(sortedData, null, 2), 'utf-8');
		log(`Saved ${OUTPUT_JSON}`);
		return sortedData;
	} catch (e: unknown) {
		log(`Fatal error: ${(e as Error).message}`);
		process.exitCode = 1;
		throw e; // Re-throw so API can handle the error
	}
}

// If NODE_LOCAL_TEST is set, allow parsing a local HTML file instead of fetching
// remote URLs. This is useful for quickly validating parsing against
// `sample.html` in the repo.
async function runLocalTestIfRequested() {
	if (process.env.NODE_LOCAL_TEST !== '1') return false;
	try {
		const localPath = process.env.NODE_LOCAL_FILE || 'sample.html';
		log(`Local test: reading ${localPath}`);
		const html = await fs.readFile(localPath, 'utf-8');
		const $ = load(html);
		const starts = findAppendixOrRatesStarts($);
		if (!starts.length) {
			log('WARN no Appendix A or Rates of pay headings found in local file');
			return true;
		}

		const parsedPerStart: any[] = [];
		for (const $start of starts) {
			const nodes = collectUntilNextHeading($, $start);
			parsedPerStart.push(parseAppendixInNodes($, nodes, `local:${localPath}`));
		}

		const merged: SalaryData = {};
		for (const chunk of parsedPerStart) mergeData(merged, chunk);
		for (const k of Object.keys(merged)) {
			merged[k]['annual-rates-of-pay'] = dedupe(merged[k]['annual-rates-of-pay'].map(sortSteps), (x) =>
				JSON.stringify(x)
			);
		}

		console.log(JSON.stringify(merged, null, 2));
		return true;
	} catch (e: unknown) {
		log(`Local test failed: ${(e as Error).message}`);
		return true;
	}
}

// Run local test when requested, otherwise run normal main
(async () => {
	const didLocal = await runLocalTestIfRequested();
	if (!didLocal) await main();
})();

export { main, scrapeAppendixAFromPage, scrapeAll, parseAppendixFromDocument, sortSalaryData, URLS };
