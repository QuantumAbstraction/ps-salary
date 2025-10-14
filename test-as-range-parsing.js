const { load } = require('cheerio');
const https = require('https');
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

async function testASParsing() {
    console.log('Testing AS page with updated parser...\n');

    const url = 'https://www.canada.ca/en/treasury-board-secretariat/services/pay/rates-pay/rates-pay-unrepresented-senior-excluded-employees/as.html';
    const html = await fetchPage(url);
    const $ = load(html);

    const data = scraper.parseUnrepresentedPage($, url);

    console.log('Classifications found:', Object.keys(data).join(', '));

    for (const [code, info] of Object.entries(data)) {
        console.log(`\n=== ${code} ===`);
        console.log(`Number of rate entries: ${info['annual-rates-of-pay'].length}`);

        if (info['annual-rates-of-pay'].length > 0) {
            const firstRate = info['annual-rates-of-pay'][0];
            console.log('First rate entry:');
            console.log(`  Effective date: ${firstRate['effective-date']}`);

            const stepKeys = Object.keys(firstRate).filter(k => k.startsWith('step-'));
            stepKeys.sort((a, b) => {
                const aNum = parseInt(a.split('-')[1]);
                const bNum = parseInt(b.split('-')[1]);
                return aNum - bNum;
            });

            stepKeys.forEach(key => {
                console.log(`  ${key}: $${firstRate[key].toLocaleString()}`);
            });

            // Check the last (most recent) entry too
            const lastRate = info['annual-rates-of-pay'][info['annual-rates-of-pay'].length - 1];
            console.log('Most recent rate entry:');
            console.log(`  Effective date: ${lastRate['effective-date']}`);
            const lastStepKeys = Object.keys(lastRate).filter(k => k.startsWith('step-'));
            lastStepKeys.sort((a, b) => {
                const aNum = parseInt(a.split('-')[1]);
                const bNum = parseInt(b.split('-')[1]);
                return aNum - bNum;
            });
            lastStepKeys.forEach(key => {
                console.log(`  ${key}: $${lastRate[key].toLocaleString()}`);
            });
        }
    }
}

testASParsing().catch(console.error);
