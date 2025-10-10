// pages/api/scraper-stream.ts
// Server-Sent Events endpoint for real-time scraper progress updates

import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs/promises';
import path from 'path';
import { load } from 'cheerio';
import { parseAppendixFromDocument, sortSalaryData, URLS } from '../../scrape';

type SalaryData = Record<string, any>;

function isServerless(): boolean {
	return !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.FUNCTION_NAME);
}

async function fetchPage(url: string): Promise<string> {
	const res = await fetch(url);
	if (!res.ok) {
		throw new Error(`HTTP ${res.status} for ${url}`);
	}
	return await res.text();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'GET') {
		return res.status(405).json({ error: 'Method not allowed. Use GET for SSE.' });
	}

	// Set SSE headers
	res.setHeader('Content-Type', 'text/event-stream');
	res.setHeader('Cache-Control', 'no-cache, no-transform');
	res.setHeader('Connection', 'keep-alive');
	res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

	// Helper to send SSE events
	const sendEvent = (event: string, data: any) => {
		res.write(`event: ${event}\n`);
		res.write(`data: ${JSON.stringify(data)}\n\n`);
	};

	try {
		// Send start event
		sendEvent('start', { total: URLS.length });

		// Load existing data if available
		let existingData: SalaryData = {};
		const dataPath = path.join(process.cwd(), 'data/data.json');

		try {
			const content = await fs.readFile(dataPath, 'utf-8');
			existingData = JSON.parse(content);
		} catch {
			// No existing data, start fresh
		}

		const allData: SalaryData = {};
		let processedCount = 0;

		// Process each URL
		for (let i = 0; i < URLS.length; i++) {
			const url = URLS[i];
			const urlName = url.split('/').pop()?.replace('.html', '') || 'unknown';
			const percentage = Math.round(((i + 1) / URLS.length) * 100);

			sendEvent('progress', {
				current: i + 1,
				total: URLS.length,
				percentage,
				url: urlName,
				status: 'fetching'
			});

			try {
				const html = await fetchPage(url);
				const $ = load(html);
				const data = parseAppendixFromDocument($, url);

				// Merge data
				Object.assign(allData, data);
				const newCodes = Object.keys(data);
				processedCount += newCodes.length;

				sendEvent('progress', {
					current: i + 1,
					total: URLS.length,
					percentage,
					url: urlName,
					status: 'parsed',
					codesFound: newCodes.length,
					codes: newCodes.slice(0, 5) // Send first 5 codes
				});

				// Small delay to be polite
				await new Promise((resolve) => setTimeout(resolve, 100));
			} catch (err) {
				sendEvent('error', {
					url: urlName,
					error: err instanceof Error ? err.message : 'Unknown error'
				});
			}
		}

		// Merge with existing data
		const existingKeys = new Set(Object.keys(existingData).map((k) => k.toUpperCase()));
		const newCodes = Object.keys(allData).filter((k) => !existingKeys.has(k.toUpperCase()));
		const newCodesCount = newCodes.length;

		const mergedData = { ...existingData, ...allData };

		// Sort the merged data alphabetically
		const sortedData = sortSalaryData(mergedData);

		// Save data if not in serverless environment
		if (!isServerless()) {
			try {
				await fs.writeFile(dataPath, JSON.stringify(sortedData, null, 2), 'utf-8');
			} catch (writeError: any) {
				sendEvent('error', {
					error: `Failed to write data.json: ${writeError.message}`,
					fatal: true
				});
			}
		}

		// Send completion event
		sendEvent('complete', {
			processedClassifications: processedCount,
			newClassifications: newCodesCount,
			persistedTotal: Object.keys(sortedData).length,
			updatedAt: new Date().toISOString()
		});

		res.end();
	} catch (error) {
		sendEvent('error', {
			error: error instanceof Error ? error.message : 'Unknown error',
			fatal: true
		});
		res.end();
	}
}
