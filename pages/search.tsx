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

export default function Search() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassification, setSelectedClassification] = useState('');
  const [salaryData, setSalaryData] = useState<SalaryData | null>(null);
  const [topSalaries, setTopSalaries] = useState<TopSalaries | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);

  const classifications = [
    'AC', 'AG', 'AI', 'AR', 'AS', 'AU', 'BI', 'CAI', 'CH', 'CM', 'CO', 'CR', 'CS', 'CX',
    'DA-CON', 'DA-PRO', 'DD', 'DE', 'DS', 'EC', 'EDS', 'EG', 'ETP', 'EX', 'FB', 'FI',
    'FO', 'FR', 'FS', 'GT', 'HPS', 'HR', 'IS', 'IT', 'LI', 'LS', 'MA', 'MD-MOF', 'MD-MSP',
    'MT', 'ND-ADV', 'ND-DIT', 'ND-HME', 'NU-EMA', 'OE-BEO', 'OE-CEO', 'OE-DEO', 'OE-MEO',
    'OE-MSE', 'OM', 'PC', 'PE', 'PG', 'PH', 'PI', 'PM', 'PO-IMA', 'PO-TCO', 'PRS', 'PS',
    'PY', 'RO', 'SE-REM', 'SE-RES', 'SG-PAT', 'SG-SRE', 'SO-INS', 'ST-COR', 'ST-OCE',
    'ST-SCY', 'ST-STN', 'ST-TYP', 'SW-CHA', 'SW-SCW', 'TI', 'TR', 'UT', 'VM', 'WP'
  ];

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

        setSalaryData(dataResult);
        setTopSalaries(topResult);

        // Check for searchTerm in URL params
        const urlParams = new URLSearchParams(window.location.search);
        const searchTermParam = urlParams.get('searchTerm');
        if (searchTermParam) {
          setSearchTerm(searchTermParam);
        }
      } catch (err) {
        setError('Failed to load salary data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredClassifications = classifications.filter(classification =>
    classification.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSuggestions = () => {
    if (!searchTerm || !salaryData) return [];

    const allCodes = Object.keys(salaryData);
    return allCodes
      .filter(code => code.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort();
  };

  const suggestions = getSuggestions();

  const handleSuggestionClick = (suggestion: string) => {
    setSearchTerm(suggestion);
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

  const getFilteredSalaryData = () => {
    if (!salaryData) return [];

    let filtered = Object.keys(salaryData);

    if (searchTerm) {
      filtered = filtered.filter(key =>
        key.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedClassification) {
      filtered = filtered.filter(key =>
        key.startsWith(selectedClassification.toUpperCase())
      );
    }

    return filtered.sort();
  };

  const formatSalary = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getMostRecentSalaryInfo = (code: string) => {
    if (!salaryData || !salaryData[code]) return null;

    const rates = salaryData[code]['annual-rates-of-pay'];
    if (!rates || rates.length === 0) return null;

    const mostRecent = rates[rates.length - 1];
    const steps = Object.keys(mostRecent).filter(key => key.startsWith('step-'));
    const stepCount = steps.length;
    const minSalary = mostRecent[steps[0]];
    const maxSalary = mostRecent[steps[steps.length - 1]];

    return {
      effectiveDate: mostRecent['effective-date'],
      stepCount,
      minSalary: typeof minSalary === 'number' ? minSalary : parseInt(minSalary as string),
      maxSalary: typeof maxSalary === 'number' ? maxSalary : parseInt(maxSalary as string),
    };
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

  const filteredSalaryData = getFilteredSalaryData();

  // Calculate stats from filtered data instead of all data
  const filteredStats = filteredSalaryData.length > 0 && topSalaries ? {
    total: filteredSalaryData.length,
    highest: Math.max(...filteredSalaryData.map(code => topSalaries[code]).filter(val => !isNaN(val) && val > 0)),
    lowest: Math.min(...filteredSalaryData.map(code => topSalaries[code]).filter(val => !isNaN(val) && val > 0)),
    average: Math.round(filteredSalaryData.map(code => topSalaries[code]).filter(val => !isNaN(val) && val > 0).reduce((a, b) => a + b, 0) / filteredSalaryData.map(code => topSalaries[code]).filter(val => !isNaN(val) && val > 0).length)
  } : null;

  return (
    <main className="min-h-screen p-8 text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-blue-500 hover:underline mb-4 inline-block">
            ← Back to API Documentation
          </Link>
          <h1 className="text-3xl font-bold mb-4">Public Servant Salary Search</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Search and explore salary data for Canadian public service classifications
          </p>
        </div>

        {/* Search and Filter Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="relative">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search Classifications
              </label>
              <input
                id="search"
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowSuggestions(e.target.value.length > 0);
                  setSelectedSuggestionIndex(-1);
                }}
                onKeyDown={handleKeyDown}
                onFocus={() => setShowSuggestions(searchTerm.length > 0)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                placeholder="e.g., CS-01, AS, PM..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoComplete="off"
              />

              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto">
                  {suggestions.map((suggestion, index) => {
                    const salaryInfo = getMostRecentSalaryInfo(suggestion);
                    const topSalary = topSalaries?.[suggestion];

                    return (
                      <div
                        key={suggestion}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className={`px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
                          index === selectedSuggestionIndex ? 'bg-blue-50 dark:bg-blue-900 ring-1 ring-blue-200 dark:ring-blue-700' : ''
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-blue-600 dark:text-blue-400">{suggestion}</span>
                          {topSalary && (
                            <span className="text-sm text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                              {formatSalary(topSalary)}
                            </span>
                          )}
                        </div>
                        {salaryInfo && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            <div className="flex justify-between">
                              <span>Range: {formatSalary(salaryInfo.minSalary)} - {formatSalary(salaryInfo.maxSalary)}</span>
                              <span>{salaryInfo.stepCount} steps</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div>
              <label htmlFor="classification" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Filter by Classification
              </label>
              <input
                id="classification"
                type="text"
                value={selectedClassification}
                onChange={(e) => setSelectedClassification(e.target.value.toUpperCase())}
                placeholder="Type or select classification..."
                list="classifications-list"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <datalist id="classifications-list">
                <option value="">All Classifications</option>
                {classifications.map(classification => (
                  <option key={classification} value={classification}>
                    {classification}
                  </option>
                ))}
              </datalist>
            </div>
          </div>

          <div className="text-sm text-gray-600 dark:text-gray-300">
            Showing {filteredSalaryData.length} results
          </div>
        </div>

        {/* Results Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSalaryData.map((code) => {
            const salaryInfo = getMostRecentSalaryInfo(code);
            const topSalary = topSalaries?.[code];

            return (
              <div key={code} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-xl font-semibold text-blue-600 dark:text-blue-400">{code}</h3>
                  {topSalary && (
                    <span className="bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 text-xs px-2 py-1 rounded-full">
                      Top: {formatSalary(topSalary)}
                    </span>
                  )}
                </div>

                {salaryInfo && (
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Range:</span> {formatSalary(salaryInfo.minSalary)} - {formatSalary(salaryInfo.maxSalary)}
                    </div>
                    <div>
                      <span className="font-medium">Steps:</span> {salaryInfo.stepCount}
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">
                      <span className="font-medium">Effective:</span> {salaryInfo.effectiveDate}
                    </div>
                  </div>
                )}

                <div className="mt-4 flex gap-2">
                  <Link
                    href={`/api/${code.toLowerCase()}`}
                    className="text-blue-500 hover:underline text-sm"
                    target="_blank"
                  >
                    View Full Data
                  </Link>
                  <Link
                    href={`/api/${code.toLowerCase()}/current`}
                    className="text-blue-500 hover:underline text-sm"
                    target="_blank"
                  >
                    Current Steps
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {filteredSalaryData.length === 0 && (
          <div className="text-center py-12">
            <div className="text-xl text-gray-500 dark:text-gray-400 mb-4">No results found</div>
            <div className="text-gray-400 dark:text-gray-500">
              Try adjusting your search terms or filters
            </div>
          </div>
        )}

        {/* Statistics Section */}
        {filteredStats && (
          <div className="mt-12 bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4 dark:text-white">Filtered Results Stats</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-900 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {filteredStats.total}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Total Classifications</div>
              </div>
              <div className="bg-white dark:bg-gray-900 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatSalary(filteredStats.highest)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Highest Salary</div>
              </div>
              <div className="bg-white dark:bg-gray-900 p-4 rounded-lg">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {formatSalary(filteredStats.average)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Average Salary</div>
              </div>
              <div className="bg-white dark:bg-gray-900 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {formatSalary(filteredStats.lowest)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Lowest Salary</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}