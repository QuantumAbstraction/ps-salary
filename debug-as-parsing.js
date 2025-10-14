// Quick debug script to test AS page parsing
const fs = require('fs');
const cheerio = require('cheerio');

const html = fs.readFileSync('as-page.html', 'utf-8');
const $ = cheerio.load(html);

console.log('\n=== CAPTION ANALYSIS ===\n');

// Find all captions
$('caption').each((i, elem) => {
    const $caption = $(elem);
    const text = $caption.text().trim();
    const html = $caption.html();

    console.log(`\nCaption ${i + 1}:`);
    console.log(`Text: "${text}"`);
    console.log(`HTML: ${html ? html.substring(0, 150) : '(empty)'}`);

    // Try to find classification in the text
    const match = text.match(/\b([A-Z]{2,4}-\d{1,3})\b/);
    if (match) {
        console.log(`✓ Found classification: ${match[1]}`);
    } else {
        console.log(`✗ No classification pattern found`);
    }
});

console.log('\n=== HEADING ANALYSIS ===\n');

// Find h1-h6 headings with "rates" in them
$('h1, h2, h3, h4, h5, h6').each((i, elem) => {
    const $heading = $(elem);
    const text = $heading.text().trim();

    if (/rates/i.test(text)) {
        console.log(`\n${elem.name.toUpperCase()}: "${text.substring(0, 100)}"`);
    }
});

console.log('\n=== TABLE COUNT ===\n');
console.log(`Total tables found: ${$('table').length}`);

console.log('\n');
