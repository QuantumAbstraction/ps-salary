const data = require('./data/data.json');

console.log('=== INVESTIGATING CLASSIFICATIONS WITH MISSING DATA ===\n');

const problematicCodes = [
    'ED-LAT-01',
    'GL-GHW-9',
    'HP',
    'HS',
    'HS-PHS-07',
    'LI',
    'NP',
    'NU'
];

problematicCodes.forEach(code => {
    console.log(`\n${code}:`);
    const classification = data[code];

    if (!classification) {
        console.log('  ❌ Classification not found in data.json');
        return;
    }

    console.log('  Structure:', JSON.stringify(classification, null, 2).substring(0, 500));

    if (!classification['annual-rates-of-pay']) {
        console.log('  ❌ Missing annual-rates-of-pay property');
    } else if (!Array.isArray(classification['annual-rates-of-pay'])) {
        console.log('  ❌ annual-rates-of-pay is not an array, type:', typeof classification['annual-rates-of-pay']);
    } else if (classification['annual-rates-of-pay'].length === 0) {
        console.log('  ❌ annual-rates-of-pay array is empty');
    } else {
        console.log('  ✓ Has', classification['annual-rates-of-pay'].length, 'rate entries');
    }
});

console.log('\n\n=== CHECKING FOR BASE CODES WITHOUT LEVEL ===\n');

// These look like base codes that should have been skipped or are classification families
const baseCodes = Object.keys(data).filter(code => {
    return code.match(/^[A-Z]+$/) && code.length <= 3 && !code.match(/^[A-Z]+-\d+/);
});

console.log('Base codes found (no level suffix):', baseCodes.length);
baseCodes.slice(0, 10).forEach(code => {
    const hasRates = data[code]['annual-rates-of-pay'] && data[code]['annual-rates-of-pay'].length > 0;
    console.log(`  ${code.padEnd(10)} has rates: ${hasRates ? '✓' : '❌'}`);
});
