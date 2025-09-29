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

export default function Home() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassification, setSelectedClassification] = useState('');
  const [salaryRange, setSalaryRange] = useState({ min: '', max: '' });
  const [sortBy, setSortBy] = useState('name');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [salaryData, setSalaryData] = useState<SalaryData | null>(null);
  const [topSalaries, setTopSalaries] = useState<TopSalaries | null>(null);
  const [popularList, setPopularList] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(true);
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

        if (dataResponse.ok && topResponse.ok) {
          const dataResult = await dataResponse.json();
          const topResult = await topResponse.json();
          // topResult now has shape { top: {...}, popular: [...] }
          setSalaryData(dataResult);
          setTopSalaries(topResult.top ?? topResult);
          setPopularList(topResult.popular ?? null);
        }
      } catch (err) {
        console.error('Failed to load data:', err);
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

  const getSuggestions = () => {
    if (!searchTerm || !topSalaries) return [];

    const allCodes = Object.keys(topSalaries);
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

  const getFilteredClassifications = () => {
    if (!topSalaries) return [];

    let filtered = Object.keys(topSalaries);

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(code =>
        code.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Classification filter
    if (selectedClassification) {
      filtered = filtered.filter(code =>
        code.startsWith(selectedClassification.toUpperCase())
      );
    }

    // Salary range filter
    if (salaryRange.min || salaryRange.max) {
      filtered = filtered.filter(code => {
        const topSalary = topSalaries[code];
        const min = salaryRange.min ? parseFloat(salaryRange.min) : 0;
        const max = salaryRange.max ? parseFloat(salaryRange.max) : Infinity;
        return topSalary >= min && topSalary <= max;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'salary-high') {
        return (topSalaries[b] || 0) - (topSalaries[a] || 0);
      } else if (sortBy === 'salary-low') {
        return (topSalaries[a] || 0) - (topSalaries[b] || 0);
      } else {
        return a.localeCompare(b);
      }
    });

    return filtered;
  };

  const filteredClassifications = getFilteredClassifications();
  const computeStats = (top: TopSalaries | null) => {
    if (!top) return null;
    const vals = Object.values(top)
      .map(v => (typeof v === 'number' ? v : Number(String(v).replace(/[^0-9.]/g, ''))))
      .filter((n) => Number.isFinite(n) && !Number.isNaN(n) && n > 0);
    const total = vals.length;
    if (total === 0) return { total: 0, highest: 0, lowest: 0, average: 0 };
    const highest = Math.max(...vals);
    const lowest = Math.min(...vals);
    const average = Math.round(vals.reduce((a, b) => a + b, 0) / total);
    return { total, highest, lowest, average };
  };

  const stats = computeStats(topSalaries);

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-white shadow-lg dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 sm:text-5xl md:text-6xl">
              <span className="text-blue-600">Public Servant</span>
              <br />
              Salary Data API
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-xl text-gray-600 dark:text-gray-300">
              Explore and analyze salary information for Canadian public service classifications. 
              Powered by official TBS-SCT data with real-time search and filtering.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/search"
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-lg dark:bg-blue-700 dark:hover:bg-blue-800"
              >
                Advanced Search
              </Link>
              <Link
                href="/equivalency"
                className="inline-flex items-center px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors shadow-lg dark:bg-purple-700 dark:hover:bg-purple-800"
              >
                Salary Equivalency
              </Link>
              <a
                href="/api/data"
                target="_blank"
                className="inline-flex items-center px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors shadow-lg dark:bg-green-700 dark:hover:bg-green-800"
              >
                API Documentation
              </a>
              {/* Admin refresh button */}
              <AdminRefreshLink />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Quick Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            <div className="bg-white rounded-xl shadow-lg p-6 text-center dark:bg-gray-800">
              <div className="text-3xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">Classifications</div>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6 text-center dark:bg-gray-800">
              <div className="text-3xl font-bold text-green-600">{formatSalary(stats.highest)}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">Highest Salary</div>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6 text-center dark:bg-gray-800">
              <div className="text-3xl font-bold text-orange-600">{formatSalary(stats.average)}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">Average Salary</div>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6 text-center dark:bg-gray-800">
              <div className="text-3xl font-bold text-purple-600">{formatSalary(stats.lowest)}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">Lowest Salary</div>
            </div>
          </div>
        )}

        {/* Enhanced Search Section */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-12 dark:bg-gray-800">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Quick Classification Search</h2>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-blue-600 hover:text-blue-800 font-medium dark:text-blue-400 dark:hover:text-blue-300"
            >
              {showAdvanced ? 'Hide' : 'Show'} Advanced Filters
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Search Classifications</label>
              <input
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                autoComplete="off"
              />

              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto dark:bg-gray-700 dark:border-gray-600">
                  {suggestions.map((suggestion, index) => {
                    const salaryInfo = getMostRecentSalaryInfo(suggestion);
                    const topSalary = topSalaries?.[suggestion];

                    return (
                      <div
                        key={suggestion}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className={`px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
                          index === selectedSuggestionIndex ? 'bg-blue-50 dark:bg-blue-900' : ''
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-blue-600 dark:text-blue-400">{suggestion}</span>
                          {topSalary && (
                            <span className="text-sm text-gray-600 dark:text-gray-300">
                              {formatSalary(topSalary)}
                            </span>
                          )}
                        </div>
                        {salaryInfo && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Range: {formatSalary(salaryInfo.minSalary)} - {formatSalary(salaryInfo.maxSalary)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Filter by Classification</label>
              <select
                value={selectedClassification}
                onChange={(e) => setSelectedClassification(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              >
                <option value="">All Classifications</option>
                {classifications.map(classification => (
                  <option key={classification} value={classification}>
                    {classification}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              >
                <option value="name">Name (A-Z)</option>
                <option value="salary-high">Salary (High to Low)</option>
                <option value="salary-low">Salary (Low to High)</option>
              </select>
            </div>
          </div>

          {/* Advanced Filters */}
          {showAdvanced && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4 dark:text-white">Advanced Filters</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Minimum Salary</label>
                  <input
                    type="number"
                    value={salaryRange.min}
                    onChange={(e) => setSalaryRange(prev => ({ ...prev, min: e.target.value }))}
                    placeholder="e.g., 50000"
                    list="salary-suggestions"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Maximum Salary</label>
                  <input
                    type="number"
                    value={salaryRange.max}
                    onChange={(e) => setSalaryRange(prev => ({ ...prev, max: e.target.value }))}
                    placeholder="e.g., 150000"
                    list="salary-suggestions"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                  />
                </div>
              </div>

              <datalist id="salary-suggestions">
                <option value="40000">40,000</option>
                <option value="50000">50,000</option>
                <option value="60000">60,000</option>
                <option value="70000">70,000</option>
                <option value="80000">80,000</option>
                <option value="90000">90,000</option>
                <option value="100000">100,000</option>
                <option value="120000">120,000</option>
                <option value="150000">150,000</option>
                <option value="200000">200,000</option>
              </datalist>
            </div>
          )}

          <div className="text-sm text-gray-600 dark:text-gray-300 mt-4">
            Showing {filteredClassifications.length} of {stats?.total || 0} classifications
          </div>
        </div>

        {/* Quick Results Preview */}
        {filteredClassifications.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-8 mb-12 dark:bg-gray-800">
            <h3 className="text-xl font-bold mb-6 dark:text-white">Quick Results</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredClassifications.slice(0, 8).map((code) => {
                const salaryInfo = getMostRecentSalaryInfo(code);
                const topSalary = topSalaries?.[code];

                return (
                  <div key={code} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow dark:bg-gray-700">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-blue-600 dark:text-blue-400">{code}</h4>
                      {topSalary && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full dark:bg-green-900 dark:text-green-300">
                          {formatSalary(topSalary)}
                        </span>
                      )}
                    </div>
                    {salaryInfo && (
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        <div>Range: {formatSalary(salaryInfo.minSalary)} - {formatSalary(salaryInfo.maxSalary)}</div>
                        <div>Steps: {salaryInfo.stepCount}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {filteredClassifications.length > 8 && (
              <div className="text-center mt-6">
                <Link
                  href="/search"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors dark:bg-blue-700 dark:hover:bg-blue-800"
                >
                  View All {filteredClassifications.length} Results
                </Link>
              </div>
            )}
          </div>
        )}

        {/* API Documentation Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <div className="bg-white rounded-xl shadow-lg p-8 dark:bg-gray-800">
            <h2 className="text-xl font-bold mb-4 dark:text-white">API Endpoints</h2>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-mono dark:bg-blue-900 dark:text-blue-300">/api/data</span>
                <span className="text-gray-600 dark:text-gray-300">Full salary data</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-mono dark:bg-green-900 dark:text-green-300">/api/top</span>
                <span className="text-gray-600 dark:text-gray-300">Top salary levels</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-sm font-mono dark:bg-purple-900 dark:text-purple-300">/api/cs-01</span>
                <span className="text-gray-600 dark:text-gray-300">Specific classification</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-sm font-mono dark:bg-orange-900 dark:text-orange-300">/api/cs-01/current</span>
                <span className="text-gray-600 dark:text-gray-300">Current salary steps</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8 dark:bg-gray-800">
            <h2 className="text-xl font-bold mb-4 dark:text-white">Popular Classifications</h2>
            <div className="space-y-2">
              {(popularList ?? ['IT', 'AS', 'PM', 'EC', 'FI', 'IS']).map(code => (
                <Link
                  key={code}
                  href={`/api/${code.toLowerCase()}`}
                  className="flex items-center justify-between p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <span className="font-medium text-gray-800 dark:text-gray-100">{code}</span>
                  <span className="text-blue-600 dark:text-blue-400">Open</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        
      </div>
    </main>
  );
}

function AdminRefreshLink() {
  return (
    <Link
      href="/admin"
      className="group inline-flex items-center px-6 py-3 bg-yellow-600 text-white font-medium rounded-lg hover:bg-yellow-700 transition-colors shadow-lg dark:bg-yellow-600 dark:hover:bg-yellow-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-yellow-500"
      title="Open the admin dashboard to run the salary data scraper"
      aria-label="Open the admin dashboard to run the salary data scraper"
    >
      <span className="inline-flex items-center space-x-2">
        <svg
          className="h-5 w-5 transition-transform duration-300 group-hover:rotate-180 group-active:scale-90"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 12a9 9 0 10-4.21 7.59" />
          <polyline points="21 12 21 18 15 18" />
        </svg>
        <span>Refresh Data (Admin)</span>
      </span>
    </Link>
  );
}
