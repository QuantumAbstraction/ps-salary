const data = require('./data/data.json');

let hasSource = false;
let collectiveCount = 0;
let unrepresentedCount = 0;
const unrepresentedCodes = [];
const collectiveCodes = [];

Object.entries(data).forEach(([code, info]) => {
    if (info['annual-rates-of-pay'] && info['annual-rates-of-pay'].length > 0) {
        const firstRate = info['annual-rates-of-pay'][0];
        if (firstRate._source) {
            hasSource = true;
            if (firstRate._source.includes('unrepresented')) {
                unrepresentedCount++;
                unrepresentedCodes.push(code);
            } else {
                collectiveCount++;
                collectiveCodes.push(code);
            }
        } else {
            collectiveCount++;
            collectiveCodes.push(code);
        }
    }
});

console.log('Has _source metadata:', hasSource);
console.log('Collective agreement classifications:', collectiveCount);
console.log('Unrepresented classifications:', unrepresentedCount);
console.log('Total:', collectiveCount + unrepresentedCount);

console.log('\nSample unrepresented codes:', unrepresentedCodes.slice(0, 10).join(', '));
console.log('\nSample collective codes:', collectiveCodes.slice(0, 10).join(', '));
