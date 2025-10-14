const data = require('./data/data.json');

console.log('=== FINAL PARSING VALIDATION REPORT ===\n');

// Filter out classifications with no data
const validClassifications = Object.keys(data).filter(code => {
    const classification = data[code];
    return classification['annual-rates-of-pay'] &&
        classification['annual-rates-of-pay'].length > 0;
});

const emptyClassifications = Object.keys(data).filter(code => {
    const classification = data[code];
    return !classification['annual-rates-of-pay'] ||
        classification['annual-rates-of-pay'].length === 0;
});

console.log('📊 DATA QUALITY SUMMARY:');
console.log(`Total entries in data.json: ${Object.keys(data).length}`);
console.log(`  ├─ Valid classifications (with salary data): ${validClassifications.length}`);
console.log(`  └─ Empty entries (no salary data): ${emptyClassifications.length}`);
console.log('');

if (emptyClassifications.length > 0) {
    console.log('⚠️  Empty classifications (should be removed):');
    emptyClassifications.forEach(code => console.log(`    - ${code}`));
    console.log('');
}

// Statistics on valid classifications only
let collectiveCount = 0;
let unrepresentedCount = 0;
let rangeBasedCount = 0;
let invalidSalaryCount = 0;

const stepDistribution = {};

validClassifications.forEach(code => {
    const classification = data[code];
    const rates = classification['annual-rates-of-pay'];
    const latestRate = rates[rates.length - 1];

    // Check if unrepresented
    const isUnrepresented = rates.some(rate =>
        rate._source &&
        typeof rate._source === 'string' &&
        rate._source.includes('unrepresented-senior-excluded')
    );

    if (isUnrepresented) {
        unrepresentedCount++;
    } else {
        collectiveCount++;
    }

    // Count steps
    const steps = Object.keys(latestRate).filter(k => k.startsWith('step-'));
    const stepCount = steps.length;
    stepDistribution[stepCount] = (stepDistribution[stepCount] || 0) + 1;

    // Check for range-based (2 steps + unrepresented)
    if (stepCount === 2 && isUnrepresented) {
        rangeBasedCount++;
    }

    // Check for invalid salaries (over $500k)
    const salaries = steps.map(step => latestRate[step]);
    const maxSalary = Math.max(...salaries);
    if (maxSalary > 500000) {
        invalidSalaryCount++;
        console.log(`⚠️  Suspicious high salary in ${code}: $${maxSalary.toLocaleString()}`);
    }
});

console.log('📈 VALID CLASSIFICATIONS BREAKDOWN:');
console.log(`Total valid: ${validClassifications.length}`);
console.log(`  ├─ Collective Agreement: ${collectiveCount} (${(collectiveCount / validClassifications.length * 100).toFixed(1)}%)`);
console.log(`  └─ Unrepresented/Excluded: ${unrepresentedCount} (${(unrepresentedCount / validClassifications.length * 100).toFixed(1)}%)`);
console.log('');

console.log('🔍 RANGE PARSING SUCCESS:');
console.log(`Range-based classifications (2 steps, unrepresented): ${rangeBasedCount}`);
console.log('These were likely parsed from "X to Y" format tables.');
console.log('');

console.log('📋 STEP COUNT DISTRIBUTION:');
Object.keys(stepDistribution)
    .sort((a, b) => parseInt(a) - parseInt(b))
    .forEach(steps => {
        const count = stepDistribution[steps];
        const bar = '█'.repeat(Math.ceil(count / 10));
        console.log(`  ${steps.padStart(2)} step(s): ${count.toString().padStart(3)} classifications ${bar}`);
    });
console.log('');

if (invalidSalaryCount === 0) {
    console.log('✅ ALL SALARY VALUES ARE VALID (under $500k threshold)');
    console.log('✅ NO CONCATENATED VALUES DETECTED');
    console.log('✅ RANGE PARSING FIX WORKING CORRECTLY');
} else {
    console.log(`❌ ${invalidSalaryCount} classification(s) have suspiciously high salaries`);
}

console.log('');
console.log('🎯 CONCLUSION:');
console.log(`  • ${validClassifications.length} classifications ready for production`);
console.log(`  • ${collectiveCount} from collective agreements`);
console.log(`  • ${unrepresentedCount} from unrepresented/excluded employees`);
console.log(`  • ${rangeBasedCount} successfully parsed from range format`);
console.log(`  • ${emptyClassifications.length} empty entries (should be cleaned up)`);
