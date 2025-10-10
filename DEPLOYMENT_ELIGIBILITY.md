# Deployment Eligibility Feature Implementation Guide

## Overview

This document provides step-by-step instructions for implementing a **Deployment Eligibility Calculator** page in the PS Salary application. This feature determines whether an employee can be deployed from one classification group to another based on Treasury Board guidelines.

---

## The Math Behind Deployment Eligibility

### Core Concept

Deployment eligibility between two classification groups is determined by **comparing pay increments** rather than raw percentage differences.

**Rule:** To decide if someone can be deployed **from Group A to Group B**, we use the **minimum inter-step increment** within the _from_ group (Group A). If the difference between the **top salary of Group A** and **top salary of Group B** is **less than or equal to** that minimum increment, then deployment is allowed.

---

### Mathematical Formula

Let:

- $A_1, A_2, ..., A_n$ = step salaries for the _from_ group (e.g., AS-04)
- $B_1, B_2, ..., B_m$ = step salaries for the _to_ group (e.g., EC-03)

#### Step 1: Find the minimum inter-step increment for the "from" group

$$
\text{MinIncrement} = \min(A_{i+1} - A_i) \text{ for all } i
$$

**Example (AS-04):**

| Step | Salary |
| ---- | ------ |
| 1    | 80,612 |
| 2    | 83,675 |
| 3    | 87,108 |

Calculations:

- $A_2 - A_1 = 83,675 - 80,612 = 3,063$
- $A_3 - A_2 = 87,108 - 83,675 = 3,433$

$$
\text{MinIncrement} = \min(3063, 3433) = 3063
$$

---

#### Step 2: Compute the difference between top salaries

$$
\text{Diff} = B_m - A_n
$$

**Example:**

- $B_m$ (top EC-03) = 87,907
- $A_n$ (top AS-04) = 87,108

$$
\text{Diff} = 87,907 - 87,108 = 799
$$

---

#### Step 3: Compare and determine eligibility

**Deployment Rule:**

$$
|\text{Diff}| < \text{MinIncrement} \Rightarrow \text{Deployable = TRUE}
$$

Otherwise:

$$
|\text{Diff}| \geq \text{MinIncrement} \Rightarrow \text{Deployable = FALSE}
$$

**Example Result:**

$$
|799| < 3063 \Rightarrow \text{Deployable}
$$

---

### Key Distinctions

| Comparison Type | Method                | Tolerance                 | Use Case                            |
| --------------- | --------------------- | ------------------------- | ----------------------------------- |
| **Deployment**  | Inter-step increment  | Minimum step within group | Lateral moves within same pay range |
| **Alternation** | Percentage difference | 4-6% (configurable)       | Temporary assignments across groups |

> **Important:** The existing `/equivalency` page uses percentage-based comparison for alternations. This new deployment feature uses increment-based logic per Treasury Board guidelines.

---

## Implementation Guide

### 1. Create the Deployment Page Component

**File:** `pages/deployment.tsx`

```tsx
import { useState, useEffect, useMemo } from 'react';
import { AppShell } from '../components/AppShell';
import {
	Card,
	CardHeader,
	CardBody,
	Autocomplete,
	AutocompleteItem,
	Button,
	Table,
	TableHeader,
	TableColumn,
	TableBody,
	TableRow,
	TableCell
} from '@heroui/react';
import { cachedFetch } from '../lib/api-cache';

interface SalaryRate {
	'effective-date': string;
	[key: string]: number | string;
}

interface ClassificationData {
	'annual-rates-of-pay': SalaryRate[];
}

interface DeploymentResult {
	fromCode: string;
	toCode: string;
	fromMaxSalary: number;
	toMaxSalary: number;
	minIncrement: number;
	salaryDifference: number;
	isDeployable: boolean;
	reason: string;
}

export default function DeploymentPage() {
	const [mounted, setMounted] = useState(false);
	const [allData, setAllData] = useState<Record<string, ClassificationData>>({});
	const [fromCode, setFromCode] = useState('');
	const [toCode, setToCode] = useState('');
	const [result, setResult] = useState<DeploymentResult | null>(null);

	// Prevent hydration mismatch
	useEffect(() => {
		setMounted(true);
	}, []);

	// Load all classification data
	useEffect(() => {
		const loadData = async () => {
			try {
				const response = await cachedFetch('/api/data');
				const data = await response.json();
				setAllData(data);
			} catch (error) {
				console.error('Failed to load classification data:', error);
			}
		};
		loadData();
	}, []);

	// Get sorted classification codes
	const classificationCodes = useMemo(() => {
		return Object.keys(allData).sort();
	}, [allData]);

	// Format currency
	const formatSalary = (amount: number) => {
		return new Intl.NumberFormat('en-CA', {
			style: 'currency',
			currency: 'CAD',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(amount);
	};

	// Calculate deployment eligibility
	const calculateDeployment = () => {
		if (!fromCode || !toCode) {
			return;
		}

		const fromData = allData[fromCode.toUpperCase()];
		const toData = allData[toCode.toUpperCase()];

		if (!fromData || !toData) {
			setResult({
				fromCode: fromCode.toUpperCase(),
				toCode: toCode.toUpperCase(),
				fromMaxSalary: 0,
				toMaxSalary: 0,
				minIncrement: 0,
				salaryDifference: 0,
				isDeployable: false,
				reason: 'One or both classification codes not found.'
			});
			return;
		}

		// Get most recent rates (last element in array)
		const fromRates = fromData['annual-rates-of-pay'];
		const toRates = toData['annual-rates-of-pay'];

		const fromCurrentRate = fromRates[fromRates.length - 1];
		const toCurrentRate = toRates[toRates.length - 1];

		// Extract step salaries for "from" group
		const fromSteps = Object.keys(fromCurrentRate)
			.filter((key) => key.startsWith('step-'))
			.sort((a, b) => {
				const numA = parseInt(a.split('-')[1]);
				const numB = parseInt(b.split('-')[1]);
				return numA - numB;
			})
			.map((key) => fromCurrentRate[key] as number);

		// Extract step salaries for "to" group
		const toSteps = Object.keys(toCurrentRate)
			.filter((key) => key.startsWith('step-'))
			.sort((a, b) => {
				const numA = parseInt(a.split('-')[1]);
				const numB = parseInt(b.split('-')[1]);
				return numA - numB;
			})
			.map((key) => toCurrentRate[key] as number);

		if (fromSteps.length === 0 || toSteps.length === 0) {
			setResult({
				fromCode: fromCode.toUpperCase(),
				toCode: toCode.toUpperCase(),
				fromMaxSalary: 0,
				toMaxSalary: 0,
				minIncrement: 0,
				salaryDifference: 0,
				isDeployable: false,
				reason: 'No salary steps found for one or both classifications.'
			});
			return;
		}

		// Step 1: Calculate minimum inter-step increment for "from" group
		let minIncrement = Infinity;
		for (let i = 0; i < fromSteps.length - 1; i++) {
			const increment = fromSteps[i + 1] - fromSteps[i];
			if (increment < minIncrement) {
				minIncrement = increment;
			}
		}

		// Handle single-step classifications
		if (minIncrement === Infinity) {
			minIncrement = 0;
		}

		// Step 2: Get top salaries
		const fromMaxSalary = fromSteps[fromSteps.length - 1];
		const toMaxSalary = toSteps[toSteps.length - 1];

		// Step 3: Calculate difference
		const salaryDifference = toMaxSalary - fromMaxSalary;

		// Step 4: Determine deployability
		const isDeployable = Math.abs(salaryDifference) < minIncrement;

		let reason = '';
		if (isDeployable) {
			reason = `Deployment allowed: The salary difference ($${Math.abs(
				salaryDifference
			).toLocaleString()}) is less than the minimum step increment ($${minIncrement.toLocaleString()}) in ${fromCode.toUpperCase()}.`;
		} else {
			reason = `Deployment not allowed: The salary difference ($${Math.abs(
				salaryDifference
			).toLocaleString()}) exceeds the minimum step increment ($${minIncrement.toLocaleString()}) in ${fromCode.toUpperCase()}.`;
		}

		setResult({
			fromCode: fromCode.toUpperCase(),
			toCode: toCode.toUpperCase(),
			fromMaxSalary,
			toMaxSalary,
			minIncrement,
			salaryDifference,
			isDeployable,
			reason
		});
	};

	if (!mounted) {
		return <div className='animate-pulse h-screen w-full bg-default-100' />;
	}

	return (
		<AppShell title='Deployment Eligibility'>
			<div className='container mx-auto px-4 py-8 max-w-6xl'>
				<Card>
					<CardHeader className='flex flex-col gap-2 items-start'>
						<h1 className='text-3xl font-bold'>Deployment Eligibility Calculator</h1>
						<p className='text-default-600'>
							Determine if an employee can be deployed from one classification to another based on inter-step increment
							rules.
						</p>
					</CardHeader>
					<CardBody className='gap-6'>
						{/* Selection Controls */}
						<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
							<Autocomplete
								label='From Classification'
								placeholder='Select source classification'
								selectedKey={fromCode}
								onSelectionChange={(key) => setFromCode(key as string)}>
								{classificationCodes.map((code) => (
									<AutocompleteItem key={code} value={code}>
										{code}
									</AutocompleteItem>
								))}
							</Autocomplete>

							<Autocomplete
								label='To Classification'
								placeholder='Select target classification'
								selectedKey={toCode}
								onSelectionChange={(key) => setToCode(key as string)}>
								{classificationCodes.map((code) => (
									<AutocompleteItem key={code} value={code}>
										{code}
									</AutocompleteItem>
								))}
							</Autocomplete>
						</div>

						<Button color='primary' size='lg' onPress={calculateDeployment} isDisabled={!fromCode || !toCode}>
							Check Deployment Eligibility
						</Button>

						{/* Results Display */}
						{result && (
							<Card className={result.isDeployable ? 'border-success' : 'border-danger'}>
								<CardBody className='gap-4'>
									<div className='flex items-center gap-3'>
										<div className={`text-4xl ${result.isDeployable ? 'text-success' : 'text-danger'}`}>
											{result.isDeployable ? '✓' : '✗'}
										</div>
										<div>
											<h2 className='text-2xl font-bold'>{result.isDeployable ? 'Deployable' : 'Not Deployable'}</h2>
											<p className='text-default-600'>
												{result.fromCode} → {result.toCode}
											</p>
										</div>
									</div>

									<div className='bg-default-100 rounded-lg p-4'>
										<p className='text-sm'>{result.reason}</p>
									</div>

									<Table aria-label='Deployment calculation details'>
										<TableHeader>
											<TableColumn>Metric</TableColumn>
											<TableColumn>Value</TableColumn>
										</TableHeader>
										<TableBody>
											<TableRow>
												<TableCell className='font-medium'>{result.fromCode} Maximum Salary</TableCell>
												<TableCell>{formatSalary(result.fromMaxSalary)}</TableCell>
											</TableRow>
											<TableRow>
												<TableCell className='font-medium'>{result.toCode} Maximum Salary</TableCell>
												<TableCell>{formatSalary(result.toMaxSalary)}</TableCell>
											</TableRow>
											<TableRow>
												<TableCell className='font-medium'>Salary Difference</TableCell>
												<TableCell className={result.salaryDifference >= 0 ? 'text-success' : 'text-danger'}>
													{result.salaryDifference >= 0 ? '+' : ''}
													{formatSalary(Math.abs(result.salaryDifference))}
												</TableCell>
											</TableRow>
											<TableRow>
												<TableCell className='font-medium'>Minimum Step Increment ({result.fromCode})</TableCell>
												<TableCell>{formatSalary(result.minIncrement)}</TableCell>
											</TableRow>
										</TableBody>
									</Table>
								</CardBody>
							</Card>
						)}

						{/* Explanation Section */}
						<Card>
							<CardHeader>
								<h3 className='text-xl font-semibold'>How It Works</h3>
							</CardHeader>
							<CardBody className='gap-3 text-sm text-default-700'>
								<p>
									<strong>Deployment eligibility</strong> is determined by comparing the minimum inter-step increment
									within the source classification against the difference between maximum salaries.
								</p>
								<ol className='list-decimal list-inside space-y-2 pl-4'>
									<li>
										Calculate the <strong>minimum inter-step increment</strong> in the source classification (smallest
										salary jump between consecutive steps)
									</li>
									<li>
										Find the <strong>maximum salaries</strong> for both classifications
									</li>
									<li>
										Calculate the <strong>difference</strong> between maximum salaries
									</li>
									<li>
										If the absolute difference is <strong>less than</strong> the minimum increment, deployment is
										allowed
									</li>
								</ol>
								<p className='pt-2 border-t border-default-200'>
									<strong>Note:</strong> This method differs from the{' '}
									<a href='/equivalency' className='text-primary underline'>
										Equivalency Calculator
									</a>
									, which uses percentage-based tolerance for alternation comparisons.
								</p>
							</CardBody>
						</Card>
					</CardBody>
				</Card>
			</div>
		</AppShell>
	);
}
```

---

### 2. Add Navigation Link

Update `components/AppNavbar.tsx` to include the new deployment page in the navigation menu.

**Find this section:**

```tsx
const menuItems = [
	{ name: 'Home', href: '/' },
	{ name: 'Search', href: '/search' },
	{ name: 'Equivalency', href: '/equivalency' }
	// Add deployment here
];
```

**Add the deployment link:**

```tsx
const menuItems = [
	{ name: 'Home', href: '/' },
	{ name: 'Search', href: '/search' },
	{ name: 'Equivalency', href: '/equivalency' },
	{ name: 'Deployment', href: '/deployment' }
];
```

---

### 3. Update README.md

Add documentation about the new deployment feature in the Features section:

```markdown
### Deployment Eligibility Calculator

Check if an employee can be deployed from one classification to another using Treasury Board's inter-step increment rules:

- **Rule-based logic:** Uses minimum inter-step increment comparison
- **Detailed breakdown:** Shows all calculation steps
- **Visual feedback:** Clear indicators for deployable/non-deployable results
- **Explanation:** Built-in guide explaining the methodology
```

---

### 4. Testing Steps

1. **Start the development server:**

   ```bash
   npm run dev
   ```

2. **Navigate to the deployment page:**

   - Go to `http://localhost:3000/deployment`
   - Or click "Deployment" in the navigation menu

3. **Test cases to verify:**

   | From  | To    | Expected Result | Reason                                   |
   | ----- | ----- | --------------- | ---------------------------------------- |
   | AS-04 | EC-03 | Deployable      | Difference (799) < Min increment (3,063) |
   | CS-01 | IT-01 | Test            | Verify with actual data                  |
   | PM-01 | AS-01 | Test            | Verify with actual data                  |

4. **Verify UI elements:**
   - [ ] Autocomplete dropdowns populate with all classifications
   - [ ] Button is disabled until both selections are made
   - [ ] Results card shows green border for deployable, red for not deployable
   - [ ] All calculations display correctly formatted currency
   - [ ] Explanation section renders properly

---

### 5. Deployment to Production

1. **Build and test locally:**

   ```bash
   npm run build
   npm start
   ```

2. **Commit changes:**

   ```bash
   git add pages/deployment.tsx components/AppNavbar.tsx README.md DEPLOYMENT_ELIGIBILITY.md
   git commit -m "Add deployment eligibility calculator feature"
   git push origin main
   ```

3. **Vercel will automatically deploy** (if connected to your repository)

4. **Verify production deployment:**
   - Test all functionality on the live site
   - Check responsive design on mobile devices
   - Verify theme switching works correctly

---

## Technical Notes

### Data Structure Requirements

The deployment calculator relies on the existing data structure in `data/data.json`:

```json
{
	"AS-04": {
		"annual-rates-of-pay": [
			{
				"effective-date": "2023-01-01",
				"step-1": 80612,
				"step-2": 83675,
				"step-3": 87108
			}
		]
	}
}
```

**Key assumptions:**

- Steps are named `step-1`, `step-2`, etc.
- Most recent rates are at the end of the `annual-rates-of-pay` array
- Classification codes are uppercase in the data structure

### Performance Considerations

- Uses `cachedFetch` for 60-minute client-side caching
- Memoizes classification code list to avoid re-sorting on every render
- Calculations happen client-side (no additional API calls needed)

### Accessibility

- All interactive elements are keyboard navigable
- Semantic HTML structure with proper heading hierarchy
- Color-coded results include text indicators (not just colors)
- Table data includes proper labels and headers

---

## Future Enhancements

1. **Batch comparison:** Allow comparing one classification against multiple targets
2. **Historical data:** Show how deployment eligibility changed over time
3. **Export results:** Generate PDF or CSV reports
4. **Reverse lookup:** Find all classifications deployable to/from a given code
5. **API endpoint:** Create `/api/deployment` for programmatic access

---

## References

- [Treasury Board Collective Agreements](https://www.tbs-sct.canada.ca/agreements-conventions/index-eng.aspx)
- [Public Service Employment Act](https://laws-lois.justice.gc.ca/eng/acts/p-33.01/)
- Project-specific patterns: See `.github/copilot-instructions.md`

---

## Questions or Issues?

If you encounter problems during implementation:

1. Check that all HeroUI imports use `@heroui/react` (not `@nextui/react`)
2. Verify `npm install --legacy-peer-deps` was used for dependencies
3. Ensure the data structure in `data/data.json` matches expectations
4. Check browser console for client-side errors
5. Review Next.js build output for server-side issues
