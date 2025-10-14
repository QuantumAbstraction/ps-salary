const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, 'data', 'data.json');
const rawData = fs.readFileSync(dataPath, 'utf8');
const data = JSON.parse(rawData);

const codesToRemove = ["AIM","AMW","AR","CO","COI","CT","DA","DS","ED","EIM","ELE","FR","HP","HS","INM","LI","LS","MAM","MAN","MDO","MST","NU","OM","PCF","PE","PIP","PM","PRW","SMW","SO","ST","VHE","WOW"];

console.log('Removing', codesToRemove.length, 'base codes with leveled versions...');
codesToRemove.forEach(code => {
  if (code in data) {
    console.log('  ✓ Removing', code);
    delete data[code];
  }
});

fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf8');
console.log('\n✅ Done! Removed', codesToRemove.length, 'codes');
console.log('New total:', Object.keys(data).length);
