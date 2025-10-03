import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs/promises';
import path from 'path';

// Cache the computed top salaries to avoid recalculation
let cachedTopSalaries: Record<string, number> | null = null;
let lastModified: number = 0;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Set cache headers for better performance
    res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
    
    // Define the path to the JSON file
    const filePath = path.join(process.cwd(), 'data', 'data.json');

    // Check if the file exists and get stats
    let fileStats;
    try {
      fileStats = await fs.stat(filePath);
    } catch {
      return res.status(404).json({ error: 'File not found' });
    }

    // Use cached data if file hasn't changed
    if (cachedTopSalaries && fileStats.mtime.getTime() === lastModified) {
      return res.status(200).json({ top: cachedTopSalaries });
    }

    // Read the file asynchronously
    const data = await fs.readFile(filePath, 'utf8');

    // Attempt to parse the JSON
    let jsonData;
    try {
      jsonData = JSON.parse(data);
    } catch (parseError) {
      return res.status(400).json({ error: 'Failed to parse the JSON file' });
    }

    // Extract the top values for each code and aggregate them into an object
    const topResult: Record<string, number> = {};

    // Loop over each key (pay scale code) in jsonData
    for (const code of Object.keys(jsonData)) {
      try {
        const entry = jsonData[code];
        if (!entry) continue;
        const rates = entry["annual-rates-of-pay"];
        if (!rates || rates.length === 0) continue;
        const lastRate = rates[rates.length - 1];
        const stepKeys = Object.keys(lastRate).filter(k => /^step-\d+$/.test(k));
        if (stepKeys.length === 0) continue;
        const lastStepKey = stepKeys.sort((a,b) => Number(a.split('-')[1]) - Number(b.split('-')[1]))[stepKeys.length -1];
        const val = lastRate[lastStepKey];
        const num = typeof val === 'number' ? val : Number(String(val).replace(/[^0-9.]/g, ''));
        if (!Number.isNaN(num)) topResult[code] = num;
      } catch (e) {
        // ignore malformed entries
        continue;
      }
    }

    // Build a popular list: prefer these codes but substitute if missing
    const preferred = ['IT', 'AS', 'PM', 'EC', 'FI', 'IS'];
    const popular: string[] = [];

    // helper: sorted codes by top salary desc
    const sortedByTop = Object.entries(topResult)
      .sort((a,b) => (b[1] as number) - (a[1] as number))
      .map(([k]) => k);

    for (const p of preferred) {
      if (popular.length >= preferred.length) break;
      // exact match first (like 'CS') or codes that start with the prefix (CS-01 etc.)
      const exact = sortedByTop.find(k => k.toUpperCase() === p.toUpperCase());
      if (exact) {
        popular.push(exact);
        continue;
      }
      const starts = sortedByTop.find(k => k.toUpperCase().startsWith(p.toUpperCase() + '-'));
      if (starts) {
        popular.push(starts);
        continue;
      }
      // otherwise pick a top available code not already picked
      const fallback = sortedByTop.find(k => !popular.includes(k));
      if (fallback) popular.push(fallback);
    }

    // if we still have fewer than preferred length, fill from sorted list
    for (const k of sortedByTop) {
      if (popular.length >= preferred.length) break;
      if (!popular.includes(k)) popular.push(k);
    }

    // Cache the computed results
    cachedTopSalaries = topResult;
    lastModified = fileStats.mtime.getTime();

    res.status(200).json({ top: topResult, popular });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An unexpected error occurred' });
  }
}
