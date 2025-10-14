const data = require('./data/data.json');

const excluded = Object.keys(data).filter(k => k.includes('EXCLUDED') || k.includes('CO-RCMP'));

console.log('Checking unrepresented classification step structure:\n');

excluded.slice(0, 10).forEach(code => {
    const rates = data[code]['annual-rates-of-pay'];
    if (rates && rates.length > 0) {
        const firstRate = rates[0];
        const stepKeys = Object.keys(firstRate).filter(k => k !== 'effective-date' && k !== '_source');
        console.log(`${code}:`);
        console.log(`  Keys: ${stepKeys.join(', ')}`);
        stepKeys.forEach(key => {
            console.log(`  ${key}: $${firstRate[key].toLocaleString()}`);
        });
        console.log('');
    }
});
