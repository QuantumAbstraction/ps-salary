import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs/promises';
import path from 'path';

// Cache the parsed data in memory to avoid reading/parsing on every request
let cachedData: any = null;
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
    if (cachedData && fileStats.mtime.getTime() === lastModified) {
      return res.status(200).json(cachedData);
    }

    // Read and parse the file
    const data = await fs.readFile(filePath, 'utf8');

    let jsonData;
    try {
      jsonData = JSON.parse(data);
      // Cache the parsed data
      cachedData = jsonData;
      lastModified = fileStats.mtime.getTime();
    } catch (parseError) {
      return res.status(400).json({ error: 'Failed to parse the JSON file' });
    }

    // Send parsed data as a response
    res.status(200).json(jsonData);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An unexpected error occurred' });
  }
}
