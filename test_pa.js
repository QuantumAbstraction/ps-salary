const fs = require('fs');

// Load the updated data to check AS-04
const data = JSON.parse(fs.readFileSync('data/data.json', 'utf8'));

function testPA() {
  console.log('Checking AS-04 data from latest scrape...');
  
  try {
    // Check AS classifications specifically
    const asClassifications = Object.keys(data).filter(k => k.startsWith('AS')).sort();
    console.log('All AS classifications found:', asClassifications);
    
    if (data['AS-04']) {
      const entries = data['AS-04']['annual-rates-of-pay'];
      console.log('\nAS-04 total entries:', entries.length);
      
      // Separate by source
      const ctEntries = entries.filter(e => e._source && e._source.includes('ct.html'));
      const paEntries = entries.filter(e => e._source && e._source.includes('pa.html'));
      
      console.log(`CT page entries: ${ctEntries.length}`);
      console.log(`PA page entries: ${paEntries.length}`);
      
      entries.forEach((entry, i) => {
        const date = entry['effective-date'] || 'No date';
        const steps = Object.keys(entry).filter(k => k.startsWith('step-')).length;
        const stepNumbers = Object.keys(entry).filter(k => k.startsWith('step-')).map(k => parseInt(k.split('-')[1]));
        const maxStep = Math.max(...stepNumbers);
        const maxSalary = entry[`step-${maxStep}`];
        console.log(`  ${i + 1}. ${date} - ${steps} steps, max: $${maxSalary} (source: ${entry._source?.split('/').pop() || 'unknown'})`);
      });
      
      // Check if we have 2024 data
      const has2024 = entries.some(e => e['effective-date'] && e['effective-date'].includes('2024'));
      console.log('\nHas 2024 data:', has2024);
      
      if (has2024) {
        const entries2024 = entries.filter(e => e['effective-date'] && e['effective-date'].includes('2024'));
        console.log('2024 entries:');
        entries2024.forEach((entry, i) => {
          const stepNumbers = Object.keys(entry).filter(k => k.startsWith('step-')).map(k => parseInt(k.split('-')[1]));
          const maxStep = Math.max(...stepNumbers);
          const maxSalary = entry[`step-${maxStep}`];
          console.log(`  ${entry['effective-date']} - max: $${maxSalary}`);
        });
      }
    } else {
      console.log('\nAS-04 not found in PA page');
      console.log('Available AS classifications:', asClassifications);
    }
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  }
}

testPA();