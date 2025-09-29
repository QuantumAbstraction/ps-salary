import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface SalaryData {
  [key: string]: {
    'annual-rates-of-pay': Array<{
      'effective-date': string;
      [stepKey: string]: string | number;
    }>;
  };
}

interface TopSalaries {
  [key: string]: number;
}

interface ClassificationInfo {
  code: string;
  minSalary: number;
  maxSalary: number;
  topSalary: number;
  stepCount: number;
  effectiveDate: string;
}

export default function Equivalency() {
  const [salaryData, setSalaryData] = useState<SalaryData | null>(null);
  const [topSalaries, setTopSalaries] = useState<TopSalaries | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCode, setSelectedCode] = useState('');
  const [tolerancePercent, setTolerancePercent] = useState(6);
  const [comparisonType, setComparisonType] = useState<'top' | 'min' | 'max' | 'average'>('top');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dataResponse, topResponse] = await Promise.all([
          fetch('/api/data'),
          fetch('/api/top')
        ]);

        if (!dataResponse.ok || !topResponse.ok) {
          throw new Error('Failed to fetch data');
        }

        const dataResult = await dataResponse.json();
        const topResult = await topResponse.json();
        const normalizedTop = topResult?.top ?? topResult;

        if (!normalizedTop || typeof normalizedTop !== 'object') {
          throw new Error('Invalid top salary payload');
        }

        setSalaryData(dataResult);
        setTopSalaries(normalizedTop);
      } catch (err) {
        setError('Failed to load salary data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatSalary = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getClassificationInfo = (code: string): ClassificationInfo | null => {
    if (!salaryData || !salaryData[code] || !topSalaries || !topSalaries[code]) return null;

    const rates = salaryData[code]['annual-rates-of-pay'];
    if (!rates || rates.length === 0) return null;

    const mostRecent = rates[rates.length - 1];
    const steps = Object.keys(mostRecent).filter(key => key.startsWith('step-'));
    const stepCount = steps.length;
    const minSalary = mostRecent[steps[0]];
    const maxSalary = mostRecent[steps[steps.length - 1]];

    return {
      code,
      minSalary: typeof minSalary === 'number' ? minSalary : parseInt(minSalary as string),
      maxSalary: typeof maxSalary === 'number' ? maxSalary : parseInt(maxSalary as string),
      topSalary: topSalaries[code],
      stepCount,
      effectiveDate: mostRecent['effective-date']
    };
  };

  const getAllClassifications = (): ClassificationInfo[] => {
    if (!topSalaries) return [];

    return Object.keys(topSalaries)
      .map(code => getClassificationInfo(code))
      .filter((info): info is ClassificationInfo => info !== null)
      .sort((a, b) => a.code.localeCompare(b.code));
  };

  const getSuggestions = () => {
    if (!selectedCode || !topSalaries) return [];

    const allCodes = Object.keys(topSalaries);
    return allCodes
      .filter(code => code.toLowerCase().includes(selectedCode.toLowerCase()))
      .sort();
  };

  const suggestions = getSuggestions();

  const handleSuggestionClick = (suggestion: string) => {
    setSelectedCode(suggestion);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0) {
          handleSuggestionClick(suggestions[selectedSuggestionIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        break;
    }
  };

  const findEquivalentClassifications = (targetCode: string): ClassificationInfo[] => {
    const targetInfo = getClassificationInfo(targetCode);
    if (!targetInfo) return [];

    const allClassifications = getAllClassifications();

    let targetValue: number;
    switch (comparisonType) {
      case 'min':
        targetValue = targetInfo.minSalary;
        break;
      case 'max':
        targetValue = targetInfo.maxSalary;
        break;
      case 'average':
        targetValue = (targetInfo.minSalary + targetInfo.maxSalary) / 2;
        break;
      case 'top':
      default:
        targetValue = targetInfo.topSalary;
        break;
    }

    const tolerance = targetValue * (tolerancePercent / 100);
    const minRange = targetValue - tolerance;
    const maxRange = targetValue + tolerance;

    return allClassifications
      .filter(info => {
        if (info.code === targetCode) return false;

        let compareValue: number;
        switch (comparisonType) {
          case 'min':
            compareValue = info.minSalary;
            break;
          case 'max':
            compareValue = info.maxSalary;
            break;
          case 'average':
            compareValue = (info.minSalary + info.maxSalary) / 2;
            break;
          case 'top':
          default:
            compareValue = info.topSalary;
            break;
        }

        return compareValue >= minRange && compareValue <= maxRange;
      })
      .sort((a, b) => {
        let aValue: number, bValue: number;
        switch (comparisonType) {
          case 'min':
            aValue = a.minSalary;
            bValue = b.minSalary;
            break;
          case 'max':
            aValue = a.maxSalary;
            bValue = b.maxSalary;
            break;
          case 'average':
            aValue = (a.minSalary + a.maxSalary) / 2;
            bValue = (b.minSalary + b.maxSalary) / 2;
            break;
          case 'top':
          default:
            aValue = a.topSalary;
            bValue = b.topSalary;
            break;
        }
        return Math.abs(aValue - targetValue) - Math.abs(bValue - targetValue);
      });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading salary data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-red-600">{error}</div>
      </div>
    );
  }

  const allClassifications = getAllClassifications();
  const selectedInfo = selectedCode ? getClassificationInfo(selectedCode) : null;
  const equivalentClassifications = selectedCode ? findEquivalentClassifications(selectedCode) : [];

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-blue-500 hover:underline mb-4 inline-block">
            ← Back to Home
          </Link>
          <h1 className="text-3xl font-bold mb-4 dark:text-white">Salary Equivalency Tool</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Find classifications with similar salary ranges to help with job comparison and career planning.
          </p>
        </div>

        {/* Configuration Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold mb-4 dark:text-white">Comparison Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-4">
              <div className="relative">
                <label htmlFor="classificationInput" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Type Classification Code
                </label>
                <input
                  id="classificationInput"
                  type="text"
                  value={selectedCode}
                  onChange={(e) => {
                    setSelectedCode(e.target.value.toUpperCase());
                    setShowSuggestions(e.target.value.length > 0);
                    setSelectedSuggestionIndex(-1);
                  }}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setShowSuggestions(selectedCode.length > 0)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  placeholder="e.g., CS-01, AS-02, PM-05..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  autoComplete="off"
                />

                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
                    {suggestions.map((suggestion, index) => {
                      const info = getClassificationInfo(suggestion);

                      return (
                        <div
                          key={suggestion}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className={`px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
                            index === selectedSuggestionIndex ? 'bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-200 dark:ring-blue-400/30' : ''
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-blue-600 dark:text-blue-400">{suggestion}</span>
                            {info && (
                              <span className="text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                {formatSalary(info.topSalary)}
                              </span>
                            )}
                          </div>
                          {info && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              <div className="flex justify-between">
                                <span>Range: {formatSalary(info.minSalary)} - {formatSalary(info.maxSalary)}</span>
                                <span>{info.stepCount} steps</span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="text-center text-gray-500 dark:text-gray-400">
                <span className="text-xs">OR</span>
              </div>
              <div>
                <label htmlFor="classification" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select from Dropdown
                </label>
                <select
                  id="classification"
                  value={selectedCode}
                  onChange={(e) => setSelectedCode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Choose a classification...</option>
                  {allClassifications.map(info => (
                    <option key={info.code} value={info.code}>
                      {info.code} - {formatSalary(info.topSalary)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="comparisonType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Compare By
              </label>
              <select
                id="comparisonType"
                value={comparisonType}
                onChange={(e) => setComparisonType(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="top">Top Salary</option>
                <option value="max">Maximum Step</option>
                <option value="average">Average Range</option>
                <option value="min">Minimum Step</option>
              </select>
            </div>

            <div>
              <label htmlFor="tolerance" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tolerance ({tolerancePercent}%)
              </label>
              <input
                id="tolerance"
                type="range"
                min="1"
                max="25"
                value={tolerancePercent}
                onChange={(e) => setTolerancePercent(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                ±{tolerancePercent}% salary range
              </div>
            </div>
          </div>
        </div>

        {/* Selected Classification Info */}
        {selectedInfo && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 mb-8">
            <h3 className="text-xl font-bold mb-4 text-blue-800 dark:text-blue-200">
              Reference Classification: {selectedInfo.code}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {formatSalary(selectedInfo.minSalary)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Minimum</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {formatSalary(selectedInfo.maxSalary)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Maximum</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {formatSalary(selectedInfo.topSalary)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Top Salary</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {selectedInfo.stepCount}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Steps</div>
              </div>
            </div>
          </div>
        )}

        {/* Results Section */}
        {selectedCode && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold dark:text-white">
                Equivalent Classifications
              </h3>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {equivalentClassifications.length} matches found
              </span>
            </div>

            {equivalentClassifications.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-xl text-gray-500 dark:text-gray-400 mb-4">No equivalent classifications found</div>
                <div className="text-gray-400 dark:text-gray-500">
                  Try increasing the tolerance percentage or selecting a different comparison type
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {equivalentClassifications.map((info) => {
                  let compareValue: number;
                  let selectedCompareValue: number;

                  switch (comparisonType) {
                    case 'min':
                      compareValue = info.minSalary;
                      selectedCompareValue = selectedInfo!.minSalary;
                      break;
                    case 'max':
                      compareValue = info.maxSalary;
                      selectedCompareValue = selectedInfo!.maxSalary;
                      break;
                    case 'average':
                      compareValue = (info.minSalary + info.maxSalary) / 2;
                      selectedCompareValue = (selectedInfo!.minSalary + selectedInfo!.maxSalary) / 2;
                      break;
                    case 'top':
                    default:
                      compareValue = info.topSalary;
                      selectedCompareValue = selectedInfo!.topSalary;
                      break;
                  }

                  const difference = compareValue - selectedCompareValue;
                  const percentDiff = (difference / selectedCompareValue) * 100;

                  return (
                    <div key={info.code} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-lg transition-shadow">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="text-lg font-semibold text-blue-600 dark:text-blue-400">{info.code}</h4>
                        <div className={`text-xs px-2 py-1 rounded-full ${
                          Math.abs(percentDiff) <= 2 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                            : Math.abs(percentDiff) <= 5
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {percentDiff > 0 ? '+' : ''}{percentDiff.toFixed(1)}%
                        </div>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Range:</span>
                          <span className="dark:text-white">{formatSalary(info.minSalary)} - {formatSalary(info.maxSalary)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Top Salary:</span>
                          <span className="font-medium dark:text-white">{formatSalary(info.topSalary)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Steps:</span>
                          <span className="dark:text-white">{info.stepCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Difference:</span>
                          <span className={`font-medium ${
                            difference > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                          }`}>
                            {difference > 0 ? '+' : ''}{formatSalary(Math.abs(difference))}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 flex gap-2">
                        <Link
                          href={`/api/${info.code.toLowerCase()}`}
                          className="text-blue-500 hover:underline text-sm"
                          target="_blank"
                        >
                          View Details
                        </Link>
                        <Link
                          href={`/search?searchTerm=${info.code}`}
                          className="text-blue-500 hover:underline text-sm"
                        >
                          View
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {!selectedCode && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center">
            <div className="text-xl text-gray-500 dark:text-gray-400 mb-4">
              Select a classification to find equivalent positions
            </div>
            <div className="text-gray-400 dark:text-gray-500">
              Choose from the dropdown above to see classifications with similar salary ranges
            </div>
          </div>
        )}
      </div>
    </main>
  );
}