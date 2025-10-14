const data = require('./data/data.json');
const { isUnrepresented } = require('./lib/classification-filter.ts');

console.log('=== COMPREHENSIVE PARSING VALIDATION ===\n');

// Statistics
let totalClassifications = 0;
let collectiveClassifications = 0;
let unrepresentedClassifications = 0;
let invalidClassifications = [];
let singleStepClassifications = [];
let multiStepClassifications = [];
let rangeBasedClassifications = []; // Likely parsed from "X to Y" format

// Validate each classification
Object.keys(data).forEach(code => {
    totalClassifications++;

    const classification = data[code];
    const isUnrep = isUnrepresented(data, code);

    if (isUnrep) {
        unrepresentedClassifications++;
    } else {
        collectiveClassifications++;
    }

    // Check if classification has valid data structure
    if (!classification['annual-rates-of-pay'] || classification['annual-rates-of-pay'].length === 0) {
        invalidClassifications.push({ code, reason: 'No annual-rates-of-pay array' });
        return;
    }

    const latestRate = classification['annual-rates-of-pay'][classification['annual-rates-of-pay'].length - 1];
    const steps = Object.keys(latestRate).filter(k => k.startsWith('step-'));

    if (steps.length === 0) {
        invalidClassifications.push({ code, reason: 'No salary steps found' });
        return;
    }

    // Sort steps numerically
    steps.sort((a, b) => {
        const aNum = parseInt(a.split('-')[1]);
        const bNum = parseInt(b.split('-')[1]);
        return aNum - bNum;
    });

    // Check for invalid (suspiciously large) values
    const salaries = steps.map(step => latestRate[step]);
    const maxSalary = Math.max(...salaries);
    const minSalary = Math.min(...salaries);

    // Flag if any salary is over $500k (likely concatenation error)
    if (maxSalary > 500000) {
        invalidClassifications.push({
            code,
            reason: `Suspiciously high salary: $${maxSalary.toLocaleString()}`,
            steps: steps.length,
            salaries: salaries.map(s => `$${s.toLocaleString()}`)
        });
    }

    // Categorize by step count
    if (steps.length === 1) {
        singleStepClassifications.push(code);
    } else if (steps.length === 2 && isUnrep) {
        // Likely a range-based classification (parsed from "X to Y")
        rangeBasedClassifications.push({
            code,
            min: minSalary,
            max: maxSalary,
            effectiveDate: latestRate['effective-date']
        });
    } else {
        multiStepClassifications.push({ code, steps: steps.length });
    }
});

// Print Summary Statistics
console.log('📊 OVERALL STATISTICS:');
console.log(`Total Classifications: ${totalClassifications}`);
console.log(`  ├─ Collective Agreement: ${collectiveClassifications} (${(collectiveClassifications / totalClassifications * 100).toFixed(1)}%)`);
console.log(`  └─ Unrepresented/Excluded: ${unrepresentedClassifications} (${(unrepresentedClassifications / totalClassifications * 100).toFixed(1)}%)`);
console.log('');

console.log('📈 STEP DISTRIBUTION:');
console.log(`Single Step Classifications: ${singleStepClassifications.length}`);
console.log(`Multi-Step Classifications: ${multiStepClassifications.length}`);
console.log(`Range-Based (2 steps, unrepresented): ${rangeBasedClassifications.length}`);
console.log('');

// Show range-based classifications (these were likely parsed from "X to Y" format)
if (rangeBasedClassifications.length > 0) {
    console.log('🔍 RANGE-BASED CLASSIFICATIONS (Parsed from "X to Y" format):');
    rangeBasedClassifications.slice(0, 10).forEach(({ code, min, max }) => {
        console.log(`  ${code.padEnd(20)} $${min.toLocaleString().padStart(10)} to $${max.toLocaleString().padStart(10)}`);
    });
    if (rangeBasedClassifications.length > 10) {
        console.log(`  ... and ${rangeBasedClassifications.length - 10} more`);
    }
    console.log('');
}

// Show validation errors
if (invalidClassifications.length > 0) {
    console.log('❌ VALIDATION ERRORS:');
    invalidClassifications.forEach(({ code, reason, salaries }) => {
        console.log(`  ${code}: ${reason}`);
        if (salaries) {
            console.log(`    Steps: ${salaries.join(', ')}`);
        }
    });
    console.log('');
} else {
    console.log('✅ ALL CLASSIFICATIONS PARSED CORRECTLY - No validation errors!\n');
}

// Show step count distribution
console.log('📋 STEP COUNT DISTRIBUTION:');
const stepCounts = {};
Object.keys(data).forEach(code => {
    const classification = data[code];
    if (classification['annual-rates-of-pay'] && classification['annual-rates-of-pay'].length > 0) {
        const latestRate = classification['annual-rates-of-pay'][classification['annual-rates-of-pay'].length - 1];
        const steps = Object.keys(latestRate).filter(k => k.startsWith('step-')).length;
        stepCounts[steps] = (stepCounts[steps] || 0) + 1;
    }
});

Object.keys(stepCounts).sort((a, b) => parseInt(a) - parseInt(b)).forEach(steps => {
    console.log(`  ${steps} step(s): ${stepCounts[steps]} classifications`);
});
console.log('');

// Detailed breakdown by source
console.log('📊 COLLECTIVE vs UNREPRESENTED BREAKDOWN:');
const collectiveSampleCodes = Object.keys(data)
    .filter(code => !isUnrepresented(data, code))
    .slice(0, 5);
const unrepresentedSampleCodes = Object.keys(data)
    .filter(code => isUnrepresented(data, code))
    .slice(0, 5);

console.log('\nCollective Agreement Samples:');
collectiveSampleCodes.forEach(code => {
    const classification = data[code];
    const latestRate = classification['annual-rates-of-pay'][classification['annual-rates-of-pay'].length - 1];
    const steps = Object.keys(latestRate).filter(k => k.startsWith('step-')).length;
    const topSalary = Math.max(...Object.keys(latestRate)
        .filter(k => k.startsWith('step-'))
        .map(k => latestRate[k]));
    console.log(`  ${code.padEnd(20)} ${steps} steps, top: $${topSalary.toLocaleString()}`);
});

console.log('\nUnrepresented/Excluded Samples:');
unrepresentedSampleCodes.forEach(code => {
    const classification = data[code];
    const latestRate = classification['annual-rates-of-pay'][classification['annual-rates-of-pay'].length - 1];
    const steps = Object.keys(latestRate).filter(k => k.startsWith('step-')).length;
    const topSalary = Math.max(...Object.keys(latestRate)
        .filter(k => k.startsWith('step-'))
        .map(k => latestRate[k]));
    console.log(`  ${code.padEnd(20)} ${steps} steps, top: $${topSalary.toLocaleString()}`);
});

console.log('\n✅ Validation complete!');
