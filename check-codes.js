const fs = require('fs');
const path = require('path');

// Read the data file
const dataPath = path.join(__dirname, 'data', 'data.json');
const rawData = fs.readFileSync(dataPath, 'utf8');
const data = JSON.parse(rawData);

// Find all codes without hyphens
const codesWithoutHyphens = Object.keys(data).filter(c => !c.includes('-'));

console.log('Total classifications:', Object.keys(data).length);
console.log('\nClassifications WITHOUT hyphens:', codesWithoutHyphens.length);
console.log(codesWithoutHyphens.sort().join(', '));

// Check if these have corresponding -01, -02, etc. versions
console.log('\n--- Checking for related codes with levels ---');
codesWithoutHyphens.forEach(baseCode => {
    const related = Object.keys(data).filter(c => c.startsWith(baseCode + '-'));
    if (related.length > 0) {
        console.log(`\n⚠️  ${baseCode}: has ${related.length} related codes`);
        console.log(`   Related: ${related.join(', ')}`);
        console.log(`   Entries in base: ${data[baseCode]['annual-rates-of-pay'].length}`);
    } else {
        console.log(`\n✅ ${baseCode}: no related codes (might be legitimate)`);
    }
});
