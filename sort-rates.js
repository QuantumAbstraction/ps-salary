const fs = require('fs');
const path = require('path');

// Read the data file
const dataPath = path.join(__dirname, 'data', 'data.json');
const rawData = fs.readFileSync(dataPath, 'utf8');
const data = JSON.parse(rawData);

// Extract year from effective date string
function extractYear(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return 0;

  // Match 4-digit year in various formats
  const yearMatch = dateStr.match(/\b(19|20)\d{2}\b/);
  if (yearMatch) {
    return parseInt(yearMatch[0], 10);
  }
  return 0;
}

// Extract month from effective date string
function extractMonth(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return 0;

  const months = {
    'january': 1, 'february': 2, 'march': 3, 'april': 4,
    'may': 5, 'june': 6, 'july': 7, 'august': 8,
    'september': 9, 'october': 10, 'november': 11, 'december': 12
  };

  const lowerDate = dateStr.toLowerCase();
  for (const [monthName, monthNum] of Object.entries(months)) {
    if (lowerDate.includes(monthName)) {
      return monthNum;
    }
  }
  return 0;
}

// Extract day from effective date string
function extractDay(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return 1;

  // Look for day number after month name or before comma
  const dayMatch = dateStr.match(/\b(\d{1,2})\b(?=,|\s+\d{4})/);
  if (dayMatch) {
    return parseInt(dayMatch[1], 10);
  }
  return 1;
}

// Get sort order prefix ($ comes before A, A before B, etc.)
function getPrefixOrder(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return 999;

  const prefix = dateStr.charAt(0);

  // Define order: $ < A < B < C < D < X < Y < Z
  const prefixOrder = {
    '$': 0,
    'A': 1,
    'B': 2,
    'C': 3,
    'D': 4,
    'E': 5,
    'F': 6,
    'X': 10, // Wage adjustments typically come after the base rate for same year
    'Y': 11,
    'Z': 12
  };

  return prefixOrder[prefix] ?? 50;
}

// Compare two effective date entries
function compareRates(a, b) {
  const dateA = a['effective-date'] || '';
  const dateB = b['effective-date'] || '';

  const yearA = extractYear(dateA);
  const yearB = extractYear(dateB);

  // First sort by year
  if (yearA !== yearB) {
    return yearA - yearB;
  }

  // Same year - sort by month
  const monthA = extractMonth(dateA);
  const monthB = extractMonth(dateB);

  if (monthA !== monthB) {
    return monthA - monthB;
  }

  // Same month - sort by prefix order ($ < A < X < B < Y < C < Z < D)
  const prefixA = getPrefixOrder(dateA);
  const prefixB = getPrefixOrder(dateB);

  return prefixA - prefixB;
}

console.log('Sorting effective dates for all classifications...\n');

let sortedCount = 0;
let alreadySortedCount = 0;

Object.keys(data).forEach(code => {
  const rates = data[code]['annual-rates-of-pay'];
  if (!rates || rates.length <= 1) return;

  // Check if already sorted by comparing with sorted version
  const sortedRates = [...rates].sort(compareRates);

  const wasAlreadySorted = JSON.stringify(rates) === JSON.stringify(sortedRates);

  if (!wasAlreadySorted) {
    console.log(`Sorting ${code}: ${rates.length} entries`);

    // Show before/after for first and last entries
    const firstBefore = rates[0]['effective-date'];
    const lastBefore = rates[rates.length - 1]['effective-date'];
    const firstAfter = sortedRates[0]['effective-date'];
    const lastAfter = sortedRates[sortedRates.length - 1]['effective-date'];

    console.log(`  Before: ${firstBefore} → ${lastBefore}`);
    console.log(`  After:  ${firstAfter} → ${lastAfter}`);

    data[code]['annual-rates-of-pay'] = sortedRates;
    sortedCount++;
  } else {
    alreadySortedCount++;
  }
});

console.log(`\n${'='.repeat(60)}`);
console.log(`Sorted: ${sortedCount} classifications`);
console.log(`Already sorted: ${alreadySortedCount} classifications`);
console.log(`${'='.repeat(60)}`);

// Write back to file
fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf8');
console.log('\n✅ Data saved to data.json');
