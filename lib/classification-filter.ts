// Utility functions for classification filtering

export type ClassificationType = 'all' | 'collective' | 'unrepresented';

/**
 * Determines if a classification is from unrepresented employees
 * by checking the _source metadata in the salary data
 */
export function isUnrepresented(salaryData: any, code: string): boolean {
	const classificationData = salaryData[code];
	if (!classificationData || !classificationData['annual-rates-of-pay']) {
		return false;
	}

	const rates = classificationData['annual-rates-of-pay'];
	if (rates.length === 0) return false;

	// Check if any rate entry has _source metadata pointing to unrepresented URL
	return rates.some((rate: any) => rate._source && rate._source.includes('unrepresented'));
}

/**
 * Filters classification codes by type (collective, unrepresented, or all)
 */
export function filterByType(codes: string[], salaryData: any, type: ClassificationType): string[] {
	if (type === 'all') return codes;

	return codes.filter((code) => {
		const isUnrep = isUnrepresented(salaryData, code);
		return type === 'unrepresented' ? isUnrep : !isUnrep;
	});
}

/**
 * Gets a human-readable label for the classification type
 */
export function getTypeLabel(type: ClassificationType): string {
	switch (type) {
		case 'collective':
			return 'Collective Agreements';
		case 'unrepresented':
			return 'Unrepresented/Excluded';
		case 'all':
		default:
			return 'All Classifications';
	}
}

/**
 * Gets the source description for a classification
 */
export function getSourceDescription(salaryData: any, code: string): string {
	return isUnrepresented(salaryData, code) ? 'Unrepresented Senior Excluded Employee' : 'Collective Agreement';
}
