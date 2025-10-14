// Quick test script for AI-assisted scraping
// Usage: npx tsx test-ai-scraping.ts

import { config } from 'dotenv';
import { parseTableWithAI, validateSalaryData } from './lib/ai-parser';

// Load environment variables from .env.local
config({ path: '.env.local' });

const testHTML = `
<table class="table table-bordered">
  <caption>AS-01 – Annual rates of pay (in dollars)</caption>
  <thead>
    <tr>
      <th>Effective Date</th>
      <th>Step 1</th>
      <th>Step 2</th>
      <th>Step 3</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>2023-06-22</td>
      <td>$53,045</td>
      <td>$55,735</td>
      <td>$58,425</td>
    </tr>
    <tr>
      <td>2024-06-22</td>
      <td>$54,137</td>
      <td>$56,899</td>
      <td>$59,654</td>
    </tr>
  </tbody>
</table>
`;

const testUrl = 'https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/as.html';

async function testAIParsing() {
	console.log('🧪 Testing AI-assisted table parsing...\n');

	if (!process.env.OPENAI_API_KEY) {
		console.error('❌ Error: OPENAI_API_KEY not set in environment');
		console.log('   Please create .env.local with your OpenAI API key');
		console.log('   Get free key: https://platform.openai.com/api-keys\n');
		process.exit(1);
	}

	console.log('📄 Test HTML table:');
	console.log('   Classification: AS-01');
	console.log('   Steps: 3');
	console.log('   Effective dates: 2');
	console.log('');

	console.log('🤖 Calling OpenAI API...');
	const startTime = Date.now();

	try {
		const result = await parseTableWithAI(testHTML, testUrl);
		const elapsed = Date.now() - startTime;

		console.log(`✅ API call successful (${elapsed}ms)\n`);

		if (result.success) {
			console.log('📊 Extracted data:');
			console.log(JSON.stringify(result.data, null, 2));
			console.log('');

			const validation = validateSalaryData(result.data);
			if (validation.isValid) {
				console.log('✅ Validation passed!');
				console.log(`   Found ${result.data.length} classification(s)`);
				console.log(`   Total steps: ${result.data.reduce((sum, d) => sum + d.steps.length, 0)}`);
			} else {
				console.log('⚠️  Validation warnings:');
				validation.errors.forEach((err) => console.log(`   - ${err}`));
			}

			console.log('');
			console.log(`💰 Cost: $${result.cost.toFixed(4)}`);
			console.log(`📈 Confidence: ${(result.confidence * 100).toFixed(1)}%`);
			console.log(`🔧 Method: ${result.method}`);
		} else {
			console.log('❌ Parsing failed');
		}
	} catch (error) {
		console.error('❌ Error:', error instanceof Error ? error.message : String(error));
		process.exit(1);
	}

	console.log('\n✨ Test complete!');
	console.log('\nNext steps:');
	console.log('1. Set USE_AI_PARSING=true in .env.local');
	console.log('2. Run: npx tsc scrape.ts --lib ES2015 --esModuleInterop --skipLibCheck');
	console.log('3. Run: node scrape.js');
	console.log('4. Check console for AI usage statistics');
}

testAIParsing().catch(console.error);
