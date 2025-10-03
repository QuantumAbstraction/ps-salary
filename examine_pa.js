const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

// Load the PA page HTML
let html = '';
const paPath = path.join(__dirname, 'pa.html');
if (fs.existsSync(paPath)) {
  html = fs.readFileSync(paPath, 'utf8');
  console.log('Loaded PA page HTML');
} else {
  console.log('PA page HTML not found');
  process.exit(1);
}

const $ = cheerio.load(html);

// Find tables containing AS data
console.log('\n=== SEARCHING FOR AS TABLES ===');
$('table').each((i, table) => {
  const $table = $(table);
  const captionText = $table.find('caption').text();
  const tableText = $table.text();
  
  if (tableText.includes('AS-') || captionText.includes('AS')) {
    console.log(`\nTable ${i + 1}:`);
    console.log('Caption:', captionText.trim());
    
    // Show first few rows to understand structure
    const rows = [];
    $table.find('tr').slice(0, 10).each((ri, row) => {
      const cells = [];
      $(row).find('th, td').each((ci, cell) => {
        cells.push($(cell).text().trim());
      });
      rows.push(cells);
    });
    
    console.log('First 10 rows:');
    rows.forEach((row, ri) => {
      console.log(`  Row ${ri + 1}:`, row.slice(0, 5).join(' | '));
    });
  }
});
