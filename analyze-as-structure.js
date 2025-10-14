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

async function analyzeAS() {
    const html = await fetchPage('https://www.canada.ca/en/treasury-board-secretariat/services/pay/rates-pay/rates-pay-unrepresented-senior-excluded-employees/as.html');
    const $ = load(html);

    console.log('=== AS (Administrative Services) Page Analysis ===\n');

    $('table').each((i, table) => {
        const $table = $(table);
        const caption = $table.find('caption').text().trim();

        if (caption.includes('AS-07') || caption.includes('AS-08')) {
            console.log(`\n--- Table with caption: "${caption.substring(0, 100)}" ---`);

            // Get headers
            const headers = [];
            $table.find('tr').first().find('th, td').each((j, cell) => {
                headers.push($(cell).text().trim());
            });
            console.log('Headers:', headers);

            // Get first data row
            const firstRow = [];
            $table.find('tr').eq(1).find('th, td').each((j, cell) => {
                firstRow.push($(cell).text().trim());
            });
            console.log('First row:', firstRow);

            // Get second data row if exists
            const secondRow = [];
            $table.find('tr').eq(2).find('th, td').each((j, cell) => {
                secondRow.push($(cell).text().trim());
            });
            if (secondRow.length > 0) {
                console.log('Second row:', secondRow);
            }
        }
    });
}

analyzeAS().catch(console.error);
