const data = require('./data/data.json');

console.log('=== CHECKING FOR BADLY PARSED SALARIES ===\n');

// Check all classifications for suspiciously low or high values
const issues = [];

Object.keys(data).forEach(code => {
    const classification = data[code];
    if (!classification['annual-rates-of-pay'] || classification['annual-rates-of-pay'].length === 0) {
        return;
    }

    const latestRate = classification['annual-rates-of-pay'][classification['annual-rates-of-pay'].length - 1];
    const steps = Object.keys(latestRate).filter(k => k.startsWith('step-'));

    if (steps.length === 0) return;

    const salaries = steps.map(step => latestRate[step]).filter(s => typeof s === 'number');

    if (salaries.length === 0) return;

    const minSalary = Math.min(...salaries);
    const maxSalary = Math.max(...salaries);

    // Flag hourly rates (under $100) or suspiciously high values (over $500k)
    if (minSalary < 100) {
        issues.push({
            code,
            type: 'HOURLY_RATE',
            min: minSalary,
            max: maxSalary,
            steps: steps.length,
            effectiveDate: latestRate['effective-date']
        });
    } else if (maxSalary > 500000) {
        issues.push({
            code,
            type: 'CONCATENATED',
            min: minSalary,
            max: maxSalary,
            steps: steps.length,
            effectiveDate: latestRate['effective-date']
        });
    }
});

console.log(`Found ${issues.length} issues:\n`);

// Group by type
const hourlyRates = issues.filter(i => i.type === 'HOURLY_RATE');
const concatenated = issues.filter(i => i.type === 'CONCATENATED');

if (hourlyRates.length > 0) {
    console.log(`⚠️  HOURLY RATES (${hourlyRates.length}) - These are likely per-hour, not annual:`);
    hourlyRates.forEach(({ code, min, max, steps, effectiveDate }) => {
        console.log(`  ${code.padEnd(20)} $${min.toFixed(2).padStart(8)} to $${max.toFixed(2).padStart(8)} (${steps} steps) - ${effectiveDate}`);
    });
    console.log('');
}

if (concatenated.length > 0) {
    console.log(`❌ CONCATENATED VALUES (${concatenated.length}) - Parsing errors:`);
    concatenated.forEach(({ code, min, max, steps }) => {
        console.log(`  ${code.padEnd(20)} $${min.toLocaleString().padStart(12)} to $${max.toLocaleString().padStart(12)} (${steps} steps)`);
    });
    console.log('');
}

if (issues.length === 0) {
    console.log('✅ All salaries look valid (between $100 and $500k)');
} else {
    console.log('💡 RECOMMENDATION:');
    if (hourlyRates.length > 0) {
        console.log('  - Hourly rates should be excluded from statistics or converted to annual equivalents');
        console.log('  - Or these classifications should be flagged as "hourly" in the UI');
    }
    if (concatenated.length > 0) {
        console.log('  - Concatenated values indicate parsing errors that need to be fixed');
    }
}
