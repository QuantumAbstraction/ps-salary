const data = require('./data/data.json');

console.log('=== Checking AS-07-EXCLUDED ===');
const as07 = data['AS-07-EXCLUDED'];
if (as07) {
    const latestRate = as07['annual-rates-of-pay'][as07['annual-rates-of-pay'].length - 1];
    console.log('Effective date:', latestRate['effective-date']);
    const steps = Object.keys(latestRate).filter(k => k.startsWith('step-'));
    steps.sort((a, b) => {
        const aNum = parseInt(a.split('-')[1]);
        const bNum = parseInt(b.split('-')[1]);
        return aNum - bNum;
    });
    console.log('Steps found:', steps.length);
    steps.forEach(step => {
        console.log(`  ${step}: $${latestRate[step].toLocaleString()}`);
    });
} else {
    console.log('AS-07-EXCLUDED not found!');
}

console.log('\n=== Checking AS-08-EXCLUDED ===');
const as08 = data['AS-08-EXCLUDED'];
if (as08) {
    const latestRate = as08['annual-rates-of-pay'][as08['annual-rates-of-pay'].length - 1];
    console.log('Effective date:', latestRate['effective-date']);
    const steps = Object.keys(latestRate).filter(k => k.startsWith('step-'));
    steps.sort((a, b) => {
        const aNum = parseInt(a.split('-')[1]);
        const bNum = parseInt(b.split('-')[1]);
        return aNum - bNum;
    });
    console.log('Steps found:', steps.length);
    steps.forEach(step => {
        console.log(`  ${step}: $${latestRate[step].toLocaleString()}`);
    });
} else {
    console.log('AS-08-EXCLUDED not found!');
}

console.log('\n=== Checking FI-04-EXCLUDED ===');
const fi04 = data['FI-04-EXCLUDED'];
if (fi04) {
    const latestRate = fi04['annual-rates-of-pay'][fi04['annual-rates-of-pay'].length - 1];
    console.log('Effective date:', latestRate['effective-date']);
    const steps = Object.keys(latestRate).filter(k => k.startsWith('step-'));
    steps.sort((a, b) => {
        const aNum = parseInt(a.split('-')[1]);
        const bNum = parseInt(b.split('-')[1]);
        return aNum - bNum;
    });
    console.log('Steps found:', steps.length);
    steps.forEach(step => {
        console.log(`  ${step}: $${latestRate[step].toLocaleString()}`);
    });
} else {
    console.log('FI-04-EXCLUDED not found!');
}
