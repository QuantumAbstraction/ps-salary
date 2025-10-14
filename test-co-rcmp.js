const { load } = require('cheerio');
const https = require('https');

// Import the scraper functions
const scraper = require('./scrape.js');

function fetchPage(url) {
    return new Promise((resolve, reject) => {
        https.get(url, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

async function testCORCMP() {
    console.log('Testing CO-RCMP page...\n');

    const url = 'https://www.canada.ca/en/treasury-board-secretariat/services/pay/rates-pay/rates-pay-unrepresented-senior-excluded-employees/co-rcmp.html';
    const html = await fetchPage(url);
    const $ = load(html);

    // Call the parseUnrepresentedPage function
    const data = scraper.parseUnrepresentedPage($, url);

    console.log('Classifications found:', Object.keys(data).length);
    console.log('Classification codes:', Object.keys(data).join(', '));

    // Show details for each classification
    for (const [code, info] of Object.entries(data)) {
        console.log(`\n${code}:`);
        console.log(`  Rates count: ${info['annual-rates-of-pay'].length}`);
        if (info['annual-rates-of-pay'].length > 0) {
            const firstRate = info['annual-rates-of-pay'][0];
            console.log(`  First rate effective: ${firstRate['effective-date']}`);
            console.log(`  Steps: ${Object.keys(firstRate).filter(k => k.startsWith('step-')).join(', ')}`);
            console.log(`  Sample: step-1 = $${firstRate['step-1']?.toLocaleString()}`);
        }
    }
}

testCORCMP().catch(console.error);
