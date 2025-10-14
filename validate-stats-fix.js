const data = require('./data/data.json');

console.log('=== STATISTICS VALIDATION (EXCLUDING HOURLY RATES) ===\n');

const ANNUAL_SALARY_THRESHOLD = 1000; // Anything under $1000 is considered hourly

let annualCount = 0;
let hourlyCount = 0;
let collectiveAnnual = 0;
let unrepresentedAnnual = 0;
let emptyCount = 0;

const annualTopSalaries = [];
const annualMinSalaries = [];

Object.keys(data).forEach(code => {
    const classification = data[code];
    const rates = classification['annual-rates-of-pay'];

    if (!rates || rates.length === 0) {
        emptyCount++;
        return;
    }

    const latestRate = rates[rates.length - 1];
    const steps = Object.keys(latestRate).filter(k => k.startsWith('step-'));

    if (steps.length === 0) return;

    const salaries = steps.map(step => latestRate[step]).filter(s => typeof s === 'number');
    if (salaries.length === 0) return;

    const minSalary = Math.min(...salaries);
    const maxSalary = Math.max(...salaries);

    // Classify as hourly or annual based on minimum salary
    if (minSalary < ANNUAL_SALARY_THRESHOLD) {
        hourlyCount++;
        return; // Skip hourly rates
    }

    // This is an annual salary classification
    annualCount++;
    annualTopSalaries.push(maxSalary);
    annualMinSalaries.push(minSalary);

    // Check if unrepresented
    const isUnrepresented = rates.some(rate =>
        rate._source &&
        typeof rate._source === 'string' &&
        rate._source.includes('unrepresented-senior-excluded')
    );

    if (isUnrepresented) {
        unrepresentedAnnual++;
    } else {
        collectiveAnnual++;
    }
});

console.log('📊 CLASSIFICATION COUNTS:');
console.log(`Total entries in data.json: ${Object.keys(data).length}`);
console.log(`  ├─ Annual salary classifications: ${annualCount}`);
console.log(`  ├─ Hourly wage classifications: ${hourlyCount}`);
console.log(`  └─ Empty/invalid entries: ${emptyCount}`);
console.log('');

console.log('📈 ANNUAL SALARY BREAKDOWN:');
console.log(`Total annual: ${annualCount}`);
console.log(`  ├─ Collective Agreement: ${collectiveAnnual} (${(collectiveAnnual / annualCount * 100).toFixed(1)}%)`);
console.log(`  └─ Unrepresented/Excluded: ${unrepresentedAnnual} (${(unrepresentedAnnual / annualCount * 100).toFixed(1)}%)`);
console.log('');

console.log('💰 SALARY STATISTICS (Annual Only):');
const highest = Math.max(...annualTopSalaries);
const lowest = Math.min(...annualMinSalaries);
const average = Math.round(annualTopSalaries.reduce((acc, val) => acc + val, 0) / annualTopSalaries.length);

console.log(`Highest top salary: $${highest.toLocaleString()}`);
console.log(`Lowest starting salary: $${lowest.toLocaleString()}`);
console.log(`Average top salary: $${average.toLocaleString()}`);
console.log('');

console.log('✅ These statistics now properly exclude hourly rates!');
console.log(`   (${hourlyCount} hourly wage classifications filtered out)`);
console.log('');

console.log('📝 UI WILL DISPLAY:');
console.log(`   Total classifications: ${annualCount}`);
console.log(`   Helper: "${collectiveAnnual} collective agreement, ${unrepresentedAnnual} unrepresented/excluded."`);
console.log(`   Highest: $${highest.toLocaleString()}`);
console.log(`   Average: $${average.toLocaleString()}`);
console.log(`   Lowest: $${lowest.toLocaleString()}`);
