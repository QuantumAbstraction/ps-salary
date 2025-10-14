// Test scraping just the AS page
const fs = require('fs');
const { parseAppendixFromDocument } = require('./scrape.js');
const cheerio = require('cheerio');

const html = fs.readFileSync('as-page.html', 'utf-8');
const $ = cheerio.load(html);

console.log('\n=== TESTING AS PAGE PARSING ===\n');

const result = parseAppendixFromDocument($, 'https://www.canada.ca/en/treasury-board-secretariat/services/pay/rates-pay/rates-pay-unrepresented-senior-excluded-employees/as.html');

const codes = Object.keys(result);
console.log(`Classifications found: ${codes.length}`);

if (codes.length > 0) {
    console.log('\n✓ SUCCESS! Found classifications:');
    codes.forEach(code => {
        const rates = result[code]['annual-rates-of-pay'];
        console.log(`  - ${code}: ${rates.length} rate periods`);
    });
} else {
    console.log('\n❌ FAILED: No classifications extracted');
    console.log('This matches the scraper output "No classifications found"');
}

console.log('\n');
