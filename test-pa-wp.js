const fs = require('fs');
const cheerio = require('cheerio');

// Parse PA page and check WP classifications
const { parseAppendixFromDocument } = require('./scrape.js');

const html = fs.readFileSync('./pa-test.html', 'utf8');
const $ = cheerio.load(html);

// First check the HTML structure for WP sections
const wpH2 = $('h2').filter((i, el) => $(el).text().includes('WP:'));
console.log('Found WP h2 sections in PA page:', wpH2.length);
wpH2.each((i, el) => console.log('  Section', i, ':', $(el).text().substring(0, 80)));

// Now parse using the actual parser
console.log('\nParsing PA page with parseAppendixFromDocument...');
const parsed = parseAppendixFromDocument($, 'test-pa');

// Find WP keys
const wpKeys = Object.keys(parsed).filter(k => k.startsWith('WP-'));
console.log('\nWP keys found:', wpKeys);

if (wpKeys.length > 0) {
    for (const k of wpKeys) {
        const rates = parsed[k]['annual-rates-of-pay'];
        const lastRate = rates[rates.length - 1];
        const steps = Object.keys(lastRate).filter(s => s.startsWith('step-'));
        console.log(`${k}: ${rates.length} date entries, ${steps.length} steps in latest`);
    }
}
