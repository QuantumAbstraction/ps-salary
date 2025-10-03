const fs = require('fs');
const cheerio = require('cheerio');

// Create a specialized parser for PA page AS data
function analyzePA() {
  console.log('Analyzing PA page table structure for AS classifications...');
  
  // This would be the approach to manually check the PA page structure
  // Since we know AS-04 data exists up to 2024, let's create a targeted fix
  
  // Load current data
  const data = JSON.parse(fs.readFileSync('data/data.json', 'utf8'));
  
  console.log('Current AS-04 data status:');
  if (data['AS-04']) {
    const entries = data['AS-04']['annual-rates-of-pay'];
    console.log(`AS-04 entries: ${entries.length}`);
    entries.forEach((entry, i) => {
      const date = entry['effective-date'] || 'No date';
      const stepNumbers = Object.keys(entry).filter(k => k.startsWith('step-')).map(k => parseInt(k.split('-')[1]));
      const maxStep = Math.max(...stepNumbers);
      const maxSalary = entry[`step-${maxStep}`];
      console.log(`  ${i + 1}. ${date} - max: $${maxSalary} (${entry._source?.split('/').pop()})`);
    });
    
    const hasPA = entries.some(e => e._source && e._source.includes('pa.html'));
    const has2024 = entries.some(e => e['effective-date'] && e['effective-date'].includes('2024'));
    
    console.log(`\nHas PA page data: ${hasPA}`);
    console.log(`Has 2024 data: ${has2024}`);
    
    if (!has2024) {
      console.log('\n❌ AS-04 is missing 2024 data - this needs to be fixed');
      console.log('Expected: Complete progression through June 21, 2024 with max ~$90,121');
    }
  }
  
  // Check what we found in generic AS from PA
  console.log('\n--- Generic AS data from PA page ---');
  if (data['AS']) {
    const paEntries = data['AS']['annual-rates-of-pay'].filter(e => e._source && e._source.includes('pa.html'));
    const latest2024 = paEntries.filter(e => e['effective-date'] && e['effective-date'].includes('2024'));
    
    if (latest2024.length > 0) {
      console.log(`Found ${latest2024.length} 2024 entries in generic AS:`);
      latest2024.forEach(entry => {
        const stepNumbers = Object.keys(entry).filter(k => k.startsWith('step-')).map(k => parseInt(k.split('-')[1]));
        const maxStep = Math.max(...stepNumbers);
        const maxSalary = entry[`step-${maxStep}`];
        console.log(`  ${entry['effective-date']} - max: $${maxSalary}`);
      });
      
      console.log('\n🔍 This high salary range suggests this might be AS-07 or AS-08 data, not AS-04');
      console.log('📝 We need to find the actual AS-04 data in the PA page table structure');
    }
  }
  
  console.log('\n=== NEXT STEPS ===');
  console.log('1. The PA page has complex table structure with multiple AS levels');
  console.log('2. Our parser needs enhancement to correctly identify AS-04 rows');
  console.log('3. AS-04 should have 2024 data with max salary around $90,121');
  console.log('4. Current generic "AS" data from PA has much higher salaries, likely different level');
}

analyzePA();