// pages/api/scraper-stream.ts
// Server-Sent Events endpoint for real-time scraper progress updates

import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs/promises';
import path from 'path';
import { load } from 'cheerio';
import { parseAppendixFromDocument, scrapeAppendixAFromPage, sortSalaryData, URLS } from '../../scrape';

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

	// Get AI parameters from query string
	const useAI = req.query.useAI === 'true';
	const forceAI = req.query.forceAI === 'true';

	// Set environment variables for this request
	if (useAI) {
		process.env.USE_AI_PARSING = 'true';
	}
	if (forceAI) {
		process.env.FORCE_AI = 'true';
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

		// AI tracking (import usageTracker from ai-parser if available)
		let aiCalls = 0;
		let aiSuccessful = 0;
		let aiTotalCost = 0;

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
				// Use scrapeAppendixAFromPage which has AI support built-in
				// It fetches the HTML internally
				const data = await scrapeAppendixAFromPage(url);

				// Merge data
				Object.assign(allData, data);
				const newCodes = Object.keys(data);
				processedCount += newCodes.length;

				const progressData: any = {
					current: i + 1,
					total: URLS.length,
					percentage,
					url: urlName,
					status: 'parsed',
					codesFound: newCodes.length,
					codes: newCodes.slice(0, 5) // Send first 5 codes
				};

				sendEvent('progress', progressData);

				// Small delay to be polite
				await new Promise((resolve) => setTimeout(resolve, 100));
			} catch (err) {
				sendEvent('progress', {
					current: i + 1,
					total: URLS.length,
					percentage,
					url: urlName,
					status: 'error'
				});
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
		const completeData: any = {
			processedClassifications: processedCount,
			newClassifications: newCodesCount,
			persistedTotal: Object.keys(sortedData).length,
			updatedAt: new Date().toISOString()
		};

		// Add AI stats if AI was used
		if (useAI && aiCalls > 0) {
			completeData.aiStats = {
				calls: aiCalls,
				successful: aiSuccessful,
				cost: aiTotalCost
			};
		}

		sendEvent('complete', completeData);

		// Clean up environment variables
		if (useAI) {
			delete process.env.USE_AI_PARSING;
		}
		if (forceAI) {
			delete process.env.FORCE_AI;
		}

		res.end();
	} catch (error) {
		sendEvent('error', {
			error: error instanceof Error ? error.message : 'Unknown error',
			fatal: true
		});

		// Clean up environment variables on error
		delete process.env.USE_AI_PARSING;
		delete process.env.FORCE_AI;

		res.end();
	}
}
