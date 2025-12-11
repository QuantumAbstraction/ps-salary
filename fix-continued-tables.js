/**
 * Fix malformed entries where entire "continued" tables were captured as effective-date strings
 * These entries contain table text like "AC-01: annual rates of pay (in dollars) - continued..."
 * They should be removed because they are parsing artifacts, not actual rate entries
 */

const fs = require('fs')

const dataPath = './data/data.json'
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'))

let removedCount = 0
let affectedClassifications = []

// Process each classification
for (const code of Object.keys(data)) {
  const rates = data[code]['annual-rates-of-pay']
  if (!rates || !Array.isArray(rates)) continue

  const originalLength = rates.length

  // Filter out entries with malformed effective-dates
  data[code]['annual-rates-of-pay'] = rates.filter(entry => {
    const effDate = entry['effective-date']
    if (!effDate) return true // Keep entries without effective-date

    // Check for malformed effective-date (contains "continued" or is way too long)
    const isMalformed = (
      effDate.includes('continued') ||
      effDate.includes('annual rates of pay') ||
      effDate.includes('Effective date Step') ||
      effDate.length > 100 // Normal effective dates are short
    )

    if (isMalformed) {
      console.log(`\n[${code}] Removing malformed entry:`)
      console.log(`  effective-date: ${effDate.substring(0, 80)}...`)
      const steps = Object.keys(entry).filter(k => k.startsWith('step-'))
      console.log(`  steps: ${steps.length} (${steps.join(', ')})`)
      return false // Remove this entry
    }

    return true // Keep this entry
  })

  const removedFromThis = originalLength - data[code]['annual-rates-of-pay'].length
  if (removedFromThis > 0) {
    removedCount += removedFromThis
    affectedClassifications.push(`${code} (${removedFromThis} removed)`)
  }
}

console.log('\n=== SUMMARY ===')
console.log(`Total malformed entries removed: ${removedCount}`)
console.log(`Affected classifications: ${affectedClassifications.length}`)
affectedClassifications.forEach(c => console.log(`  - ${c}`))

// Write the cleaned data
fs.writeFileSync(dataPath, JSON.stringify(data, null, 2))
console.log(`\nData saved to ${dataPath}`)
console.log(`Total classifications: ${Object.keys(data).length}`)
