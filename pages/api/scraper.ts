
import { NextApiRequest, NextApiResponse } from 'next';
import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import path from 'path';

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
    console.log('Starting scraper...');
    
    // Fetch main page
    const mainResponse = await fetch('https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements.html');
    const mainHtml = await mainResponse.text();
    const $ = cheerio.load(mainHtml);
    
    const links: string[] = [];
    
    // Extract collective agreement links
    $('a').each((_, element) => {
      const href = $(element).attr('href');
      if (href && href.includes('/collective-agreements/')) {
        const fullUrl = href.startsWith('http') ? href : `https://www.canada.ca${href}`;
        links.push(fullUrl);
      }
    });

    console.log(`Found ${links.length} collective agreement links`);
    
    const salaryData: SalaryData = {};
    let processedCount = 0;

    // Process each collective agreement
    for (const link of links.slice(0, 5)) { // Limit to first 5 for testing
      try {
        console.log(`Processing: ${link}`);
        
        const pageResponse = await fetch(link);
        const pageHtml = await pageResponse.text();
        const page$ = cheerio.load(pageHtml);
        
        // Look for "Rates of pay" or similar links
        let ratesLink = '';
        page$('a').each((_, element) => {
          const text = page$(element).text().toLowerCase();
          const href = page$(element).attr('href');
          if (text.includes('rates of pay') || text.includes('salary') || text.includes('pay rates')) {
            ratesLink = href?.startsWith('http') ? href : `https://www.canada.ca${href}`;
            return false; // Break loop
          }
        });
        
        if (ratesLink) {
          console.log(`Found rates link: ${ratesLink}`);
          
          const ratesResponse = await fetch(ratesLink);
          const ratesHtml = await ratesResponse.text();
          const rates$ = cheerio.load(ratesHtml);
          
          // Extract tables with salary data
          rates$('table').each((tableIndex, table) => {
            const tableData: any[] = [];
            const headers: string[] = [];
            
            // Extract headers
            rates$(table).find('tr').first().find('th, td').each((_, cell) => {
              headers.push(rates$(cell).text().trim());
            });
            
            // Extract data rows
            rates$(table).find('tr').slice(1).each((_, row) => {
              const rowData: any = {};
              rates$(row).find('td').each((cellIndex, cell) => {
                const cellText = rates$(cell).text().trim();
                const header = headers[cellIndex] || `column-${cellIndex}`;
                
                if (header.toLowerCase().includes('effective') || header.toLowerCase().includes('date')) {
                  rowData['effective-date'] = cellText;
                } else if (header.toLowerCase().includes('step') || header.toLowerCase().includes('level')) {
                  const stepNum = header.match(/\d+/)?.[0] || cellIndex;
                  const value = parseFloat(cellText.replace(/[,$]/g, ''));
                  if (!isNaN(value)) {
                    rowData[`step-${stepNum}`] = value;
                  }
                }
              });
              
              if (Object.keys(rowData).length > 1) {
                tableData.push(rowData);
              }
            });
            
            // Create classification code from URL or page title
            const urlParts = link.split('/');
            const classification = urlParts[urlParts.length - 1] || `table-${tableIndex}`;
            
            if (tableData.length > 0) {
              salaryData[classification] = {
                'annual-rates-of-pay': tableData
              };
            }
          });
        }
        
        processedCount++;
        
        // Add delay to be respectful to the server
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`Error processing ${link}:`, error);
      }
    }
    
    // Update data.json file
    const dataPath = path.join(process.cwd(), 'data', 'data.json');
    const existingData = JSON.parse(await fs.readFile(dataPath, 'utf8'));
    
    // Merge new data with existing data
    const mergedData = { ...existingData, ...salaryData };
    
    await fs.writeFile(dataPath, JSON.stringify(mergedData, null, 2));
    
    console.log(`Scraping completed. Processed ${processedCount} agreements, found ${Object.keys(salaryData).length} classifications`);
    
    res.status(200).json({
      success: true,
      message: `Processed ${processedCount} collective agreements`,
      newClassifications: Object.keys(salaryData).length,
      data: salaryData
    });
    
  } catch (error) {
    console.error('Scraper error:', error);
    res.status(500).json({ 
      error: 'Scraping failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
