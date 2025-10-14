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

async function checkAppendix() {
    const html = await fetchPage('https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/srw.html');
    const $ = load(html);

    console.log('=== Looking for Appendix or Rates headings ===\n');
    $('h1,h2,h3,h4,h5,h6').each((i, h) => {
        const text = $(h).text().trim();
        if (/appendix|rates\s+of\s+pay|annual\s+rates|salary/i.test(text)) {
            console.log(`${h.name}: ${text}`);
        }
    });

    console.log('\n=== Checking for pay tables with classification codes ===\n');
    $('table').each((tIdx, table) => {
        const $table = $(table);
        let hasClassifications = false;

        $table.find('tr').each((rIdx, row) => {
            const rowText = $(row).text();
            if (/\b[A-Z]{2,4}-\d+\b/.test(rowText)) {
                hasClassifications = true;
            }
        });

        if (hasClassifications) {
            console.log(`Table ${tIdx + 1} contains classification codes`);
            // Get preceding heading
            const $prev = $table.prevAll('h1,h2,h3,h4,h5,h6').first();
            if ($prev.length) {
                console.log(`  Preceded by: ${$prev.prop('tagName')}: ${$prev.text().trim().substring(0, 80)}`);
            }
        }
    });
}

checkAppendix().catch(console.error);
