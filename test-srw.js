const { load } = require('cheerio');
const https = require('https');

function fetchPage(url) {
    return new Promise((resolve, reject) => {
        https.get(url, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

async function analyzeSRW() {
    console.log('=== SRW (Ship Repair West) Analysis ===\n');
    const srwHtml = await fetchPage('https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/srw.html');
    const $srw = load(srwHtml);

    console.log('Total tables:', $srw('table').length);

    // Analyze each table
    $srw('table').each((i, table) => {
        const $table = $srw(table);
        console.log(`\n--- Table ${i + 1} ---`);

        // Caption
        const caption = $table.find('caption').text().trim();
        console.log('Caption:', caption || '(empty)');

        // Headers
        const headers = [];
        $table.find('tr').first().find('th, td').each((j, cell) => {
            const text = $srw(cell).text().trim();
            headers.push(text);
        });
        console.log('Headers:', headers);

        // First data row
        const firstDataRow = [];
        $table.find('tr').eq(1).find('th, td').each((j, cell) => {
            const text = $srw(cell).text().trim();
            firstDataRow.push(text);
        });
        console.log('First data row:', firstDataRow);

        // Look for classification codes in rows
        let foundCodes = [];
        $table.find('tr').each((rowIdx, row) => {
            const rowText = $srw(row).text();
            const codeMatch = rowText.match(/\b[A-Z]{2,4}-[A-Z0-9]+\b/g);
            if (codeMatch) {
                foundCodes.push(...codeMatch);
            }
        });
        if (foundCodes.length > 0) {
            console.log('Classification codes found in table:', [...new Set(foundCodes)].join(', '));
        }
    });

    // Look for headings with classification codes
    console.log('\n--- Headings with potential classifications ---');
    $srw('h1, h2, h3, h4, h5, h6').each((i, heading) => {
        const text = $srw(heading).text().trim();
        if (/\b[A-Z]{2,4}-[A-Z0-9]+\b/.test(text) || text.includes('SRW') || text.includes('pay') || text.includes('rate')) {
            console.log(`${heading.name}: ${text.substring(0, 100)}`);
        }
    });

    // Check for pdf-section
    console.log('\n--- PDF Sections ---');
    console.log('PDF sections found:', $srw('section.pdf-section').length);
}

analyzeSRW().catch(console.error);
