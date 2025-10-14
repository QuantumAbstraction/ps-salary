const fs = require('fs');
const path = require('path');

// Read the data file
const dataPath = path.join(__dirname, 'data', 'data.json');
const rawData = fs.readFileSync(dataPath, 'utf8');
const data = JSON.parse(rawData);

console.log('Current classifications:', Object.keys(data).length);
console.log('EX entry exists:', 'EX' in data);
console.log('EX-01 entry exists:', 'EX-01' in data);
console.log('EX-05 entry exists:', 'EX-05' in data);

if ('EX' in data) {
    console.log('\nEX entry has', data['EX']['annual-rates-of-pay'].length, 'rate entries');
    console.log('Deleting EX entry...');
    delete data['EX'];

    // Write back to file
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf8');
    console.log('✅ Successfully removed EX entry from data.json');
    console.log('New classification count:', Object.keys(data).length);
} else {
    console.log('❌ EX entry not found');
}
