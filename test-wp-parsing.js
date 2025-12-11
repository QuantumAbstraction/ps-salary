// Standalone test of PA page WP parsing
const fs = require('fs');
const cheerio = require('cheerio');

const html = fs.readFileSync('./pa-test.html', 'utf8');
const $ = cheerio.load(html);

const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();

const firstClassificationIn = (s) => {
    const txt = clean(s || '');
    if (/\bAS\s*[-‐‑‒–—―]\s*Develop(ment|mental)\b/i.test(txt)) {
        return 'AS-DEV';
    }
    const patterns = [
        /\b([A-Z]{1,4}(?:-[A-Z]{2,4})*-\d{1,3})\b/,
        /\b([A-Z]{1,4}-\d{1,3})\b/,
        /\b([A-Z]{2,4})\b/
    ];
    for (const re of patterns) {
        const m = txt.match(re);
        if (!m || !m[1]) continue;
        let cand = m[1].replace(/[,:;.]$/g, '');
        if (/^[A-Z]$/.test(cand)) continue;
        if (/^appendix$/i.test(cand)) continue;
        cand = cand.replace(/^([A-Z]{2,4})-(\d)$/, (match, letters, digit) => {
            return `${letters}-0${digit}`;
        });
        return cand;
    }
    return null;
};

// Find WP heading
const wpHeading = $('h3').filter((i, el) => {
    return clean($(el).text()).startsWith('WP: Welfare');
});

console.log('WP Heading found:', wpHeading.length ? 'YES' : 'NO');
if (wpHeading.length) {
    const headingClass = firstClassificationIn(clean(wpHeading.text()));
    console.log('Classification from heading:', headingClass);
}

// Collect nodes between WP heading and next h3
let nodes = [];
let $cur = wpHeading.next();
while ($cur.length) {
    const tag = $cur.prop('tagName');
    if (tag === 'H3' || tag === 'H2' || tag === 'H1') break;
    nodes.push($cur.get(0));
    $cur = $cur.next();
}
console.log('Nodes collected:', nodes.length);

// Process each node looking for tables
let currentClass = firstClassificationIn(clean(wpHeading.text()));
const out = {};

for (const node of nodes) {
    const $el = $(node);
    const tag = ($el.prop('tagName') || '').toLowerCase();

    if (/^h[1-6]$/.test(tag)) {
        const maybe = firstClassificationIn(clean($el.text()));
        if (maybe) {
            currentClass = maybe;
            console.log('Found sub-heading classification:', currentClass);
        }
        continue;
    }

    // Find tables
    const tables = $el.is('table')
        ? [$el]
        : $el.find('table').toArray().map(e => $(e));

    for (const $t of tables) {
        const captionText = clean($t.find('caption').first().text());
        const fromCaption = firstClassificationIn(captionText);
        const useClass = fromCaption || currentClass;

        console.log(`Table: caption="${captionText.substring(0, 50)}" -> classification="${useClass}"`);

        if (useClass && useClass.startsWith('WP-')) {
            if (!out[useClass]) out[useClass] = [];
            out[useClass].push({caption: captionText, cols: $t.find('tr').first().find('td,th').length});
        }
    }
}

console.log('\nWP classifications found:');
for (const [k, v] of Object.entries(out)) {
    console.log(`  ${k}: ${v.length} tables`, v.map(x => x.cols).join(', '), 'columns');
}
