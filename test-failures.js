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

async function analyzeFailures() {
    console.log('\n=== SRW (Ship Repair West) - Collective Agreement ===');
    const srwHtml = await fetchPage('https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/srw.html');
    const $srw = load(srwHtml);
    console.log('Tables found:', $srw('table').length);

    $srw('table').each((i, table) => {
        const $table = $srw(table);
        const caption = $table.find('caption').text().trim();
        const headers = [];
        $table.find('tr').first().find('th, td').each((j, cell) => {
            headers.push($srw(cell).text().trim());
        });
        console.log(`\nTable ${i + 1}:`);
        console.log('  Caption:', caption.substring(0, 100));
        console.log('  Headers:', headers.join(' | '));
    });

    // Check for headings
    console.log('\nHeadings (h2-h6):');
    $srw('h2, h3, h4, h5, h6').each((i, heading) => {
        const text = $srw(heading).text().trim();
        if (text.includes('SRW') || text.includes('step') || text.includes('rates') || /\b[A-Z]{2,3}-\d+\b/.test(text)) {
            console.log('  -', text.substring(0, 80));
        }
    });

    console.log('\n\n=== CO-RCMP - Unrepresented ===');
    const coHtml = await fetchPage('https://www.canada.ca/en/treasury-board-secretariat/services/pay/rates-pay/rates-pay-unrepresented-senior-excluded-employees/co-rcmp.html');
    const $co = load(coHtml);
    console.log('Tables found:', $co('table').length);

    $co('table').each((i, table) => {
        const $table = $co(table);
        const caption = $table.find('caption').text().trim();
        const headers = [];
        $table.find('tr').first().find('th, td').each((j, cell) => {
            headers.push($co(cell).text().trim());
        });
        console.log(`\nTable ${i + 1}:`);
        console.log('  Caption:', caption.substring(0, 150));
        console.log('  Headers:', headers.join(' | '));
    });

    // Check for headings
    console.log('\nHeadings (h2-h6):');
    $co('h2, h3, h4, h5, h6').each((i, heading) => {
        const text = $co(heading).text().trim();
        console.log('  -', text.substring(0, 80));
    });
}

analyzeFailures().catch(console.error);
