const fs = require('fs');
const path = require('path');

// Read the data file
const dataPath = path.join(__dirname, 'data', 'data.json');
const rawData = fs.readFileSync(dataPath, 'utf8');
const data = JSON.parse(rawData);

// Find all codes without hyphens
const codesWithoutHyphens = Object.keys(data).filter(c => !c.includes('-')).sort();

console.log('='.repeat(80));
console.log('CLASSIFICATION CODE ANALYSIS');
console.log('='.repeat(80));
console.log(`Total classifications: ${Object.keys(data).length}`);
console.log(`Codes WITHOUT hyphens: ${codesWithoutHyphens.length}`);
console.log('='.repeat(80));

const problemCodes = [];
const legitimateCodes = [];

codesWithoutHyphens.forEach(baseCode => {
    const related = Object.keys(data).filter(c => c.startsWith(baseCode + '-'));
    const entries = data[baseCode]['annual-rates-of-pay'].length;

    if (related.length > 0) {
        problemCodes.push({
            code: baseCode,
            related: related.length,
            relatedCodes: related.sort(),
            entries
        });
    } else {
        legitimateCodes.push({ code: baseCode, entries });
    }
});

console.log('\n⚠️  POTENTIAL PARSING ERRORS (base code with leveled versions):');
console.log('-'.repeat(80));
problemCodes.forEach(({ code, related, relatedCodes, entries }) => {
    console.log(`\n${code}: ${entries} entries, has ${related} leveled versions`);
    console.log(`  → ${relatedCodes.join(', ')}`);
});

console.log('\n\n✅ LEGITIMATE BASE CODES (no leveled versions):');
console.log('-'.repeat(80));
legitimateCodes.forEach(({ code, entries }) => {
    console.log(`${code}: ${entries} entries`);
});

console.log('\n' + '='.repeat(80));
console.log(`SUMMARY: ${problemCodes.length} potential errors, ${legitimateCodes.length} legitimate`);
console.log('='.repeat(80));

// Create fix script
if (problemCodes.length > 0) {
    console.log('\n\nGenerating fix script...');
    const fixScript = `const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, 'data', 'data.json');
const rawData = fs.readFileSync(dataPath, 'utf8');
const data = JSON.parse(rawData);

const codesToRemove = ${JSON.stringify(problemCodes.map(p => p.code))};

console.log('Removing', codesToRemove.length, 'base codes with leveled versions...');
codesToRemove.forEach(code => {
  if (code in data) {
    console.log('  ✓ Removing', code);
    delete data[code];
  }
});

fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf8');
console.log('\\n✅ Done! Removed', codesToRemove.length, 'codes');
console.log('New total:', Object.keys(data).length);
`;

    fs.writeFileSync(path.join(__dirname, 'fix-all-base-codes.js'), fixScript, 'utf8');
    console.log('✅ Created fix-all-base-codes.js');
}
