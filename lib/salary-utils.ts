/**
 * Salary data utilities for filtering current rates and handling superseded classifications
 */

/**
 * List of superseded classification codes that have been replaced.
 * These should be filtered out from dropdowns and searches.
 *
 * FI (Financial Management) has been replaced by CT-FIN (Comptrollership - Finance)
 */
export const SUPERSEDED_CODES = new Set(['FI-01', 'FI-02', 'FI-03', 'FI-04']);

/**
 * Filters salary rates to only include those currently in effect (not future dates)
 * @param rates Array of salary rate objects with effective-date property
 * @returns Array of current salary rates
 */
export function getCurrentRates(rates: any[]): any[] {
	if (!rates || !rates.length) return [];

	const today = new Date();

	const currentRates = rates.filter((rate: any) => {
		const effectiveDate = rate['effective-date'];
		if (!effectiveDate || typeof effectiveDate !== 'string') return false;

		// Parse various date formats from the data
		// Matches dates like "November 7, 2025" or "August 5, 2024"
		const dateMatch = effectiveDate.match(
			/(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}/
		);
		if (!dateMatch) return true; // Include if we can't parse the date (legacy data)

		const rateDate = new Date(dateMatch[0]);
		return rateDate <= today;
	});

	return currentRates;
}

/**
 * Gets the most recent salary rate that is currently in effect
 * @param rates Array of salary rate objects
 * @returns Most recent current rate or null
 */
export function getMostRecentCurrentRate(rates: any[]): any | null {
	const currentRates = getCurrentRates(rates);
	if (!currentRates.length) return null;

	return currentRates[currentRates.length - 1];
}

/**
 * Filters out superseded classification codes from a list
 * @param codes Array of classification codes
 * @returns Filtered array without superseded codes
 */
export function filterSupersededCodes(codes: string[]): string[] {
	return codes.filter((code) => !SUPERSEDED_CODES.has(code));
}
