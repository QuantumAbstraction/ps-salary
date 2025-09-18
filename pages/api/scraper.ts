
import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs/promises';
import path from 'path';
import { scrapeAll, URLS } from '../../scrape';

interface SalaryData {
  [key: string]: {
    'annual-rates-of-pay': Array<{
      'effective-date': string;
      [key: string]: string | number;
    }>;
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Starting canonical scraper...');
    // Use the canonical scraper implementation from the repository root
    const scraped = await scrapeAll(URLS);

    // Load existing data and merge
    const dataPath = path.join(process.cwd(), 'data', 'data.json');
    let existingData: any = {};
    try {
      existingData = JSON.parse(await fs.readFile(dataPath, 'utf8'));
    } catch (_) {
      existingData = {};
    }

    const mergedData = { ...existingData, ...scraped };
    await fs.writeFile(dataPath, JSON.stringify(mergedData, null, 2), 'utf8');

    const processedCount = Object.keys(scraped).length;
    console.log(`Scraping completed. Found ${processedCount} classifications`);

    res.status(200).json({
      success: true,
      message: `Scraper run completed`,
      newClassifications: processedCount,
      data: scraped,
    });
    
  } catch (error) {
    console.error('Scraper error:', error);
    res.status(500).json({ 
      error: 'Scraping failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
