// Test if findAppendixOrRatesStarts would find headings on AS page
const fs = require('fs');
const cheerio = require('cheerio');

const html = fs.readFileSync('as-page.html', 'utf-8');
const $ = cheerio.load(html);

const clean = (s) =>
    String(s ?? '')
        .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g, '-')
        .replace(/\s+/g, ' ')
        .trim();

console.log('\n=== TESTING findAppendixOrRatesStarts LOGIC ===\n');

const all = $('h1,h2,h3,h4,h5,h6')
    .toArray()
    .map((e) => $(e));

const starts = all.filter(($h) => {
    const t = clean($h.text()).toLowerCase();
    const matches =
        /appendix\s*a\b/.test(t) ||
        /\b(annual\s+)?rates\s+of\s+pay\b/.test(t) ||
        /\brates\b/.test(t) ||
        /\bsalary\s+rates\b/.test(t);

    if (matches) {
        console.log(`✓ MATCH: <${$h.prop('tagName')}> "${t.substring(0, 80)}..."`);
    }
    return matches;
});

console.log(`\nTotal matching headings found: ${starts.length}`);
console.log(`Total headings scanned: ${all.length}`);

if (starts.length === 0) {
    console.log('\n❌ NO START HEADINGS FOUND! Parser would return empty {}');
} else {
    console.log('\n✓ Start headings found, parser should continue');
}

console.log('\n');
