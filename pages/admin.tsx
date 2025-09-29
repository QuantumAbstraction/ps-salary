import { useState } from 'react';
import Head from 'next/head';

type SalaryEntry = {
  'annual-rates-of-pay': Array<{
    'effective-date': string;
    [key: string]: string | number;
  }>;
};

type SalaryMap = Record<string, SalaryEntry>;

interface GroupSummary {
  group: string;
  total: number;
  codes: string[];
}

interface ScraperResponse {
  success?: boolean;
  message?: string;
  newClassifications?: number;
  processedClassifications?: number;
  data?: SalaryMap;
  persistedTotal?: number;
  updatedAt?: string;
  groupSummary?: GroupSummary[];
  newCodes?: string[];
  error?: string;
  details?: string;
}

const buildGroupSummary = (payload?: SalaryMap | null): GroupSummary[] => {
  if (!payload) return [];
  const summary = new Map<string, Set<string>>();
  for (const rawCode of Object.keys(payload)) {
    if (!rawCode) continue;
    const normalizedCode = rawCode.toUpperCase();
    const groupMatch = normalizedCode.match(/^[A-Z]+/);
    const group = groupMatch ? groupMatch[0] : normalizedCode;
    if (!summary.has(group)) {
      summary.set(group, new Set());
    }
    summary.get(group)!.add(normalizedCode);
  }
  return Array.from(summary.entries())
    .map(([group, codes]) => ({
      group,
      total: codes.size,
      codes: Array.from(codes).sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => a.group.localeCompare(b.group));
};

const formatNumber = (value: number | null | undefined) =>
  typeof value === 'number' && Number.isFinite(value)
    ? value.toLocaleString('en-CA')
    : '0';

const formatTimestamp = (value: string | null | undefined) => {
  if (!value) return 'Unknown';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

export default function Admin() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ScraperResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [groupStats, setGroupStats] = useState<GroupSummary[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [persistedTotal, setPersistedTotal] = useState<number | null>(null);

  const runScraper = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setGroupStats([]);

    try {
      const response = await fetch('/api/scraper', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data: ScraperResponse = await response.json();

      if (response.ok) {
        setResult(data);
        setLastUpdated(data.updatedAt ?? null);
        setPersistedTotal(
          typeof data.persistedTotal === 'number' ? data.persistedTotal : null
        );

        const summary = data.groupSummary ?? buildGroupSummary(data.data);
        setGroupStats(summary);

        console.info('[admin] scraper summary', {
          processed:
            data.processedClassifications ??
            (data.data ? Object.keys(data.data).length : 0),
          newClassifications: data.newClassifications ?? 0,
          persistedTotal: data.persistedTotal ?? null,
        });

        if (summary.length) {
          console.table(summary.map(({ group, total }) => ({ group, total })));
        }
      } else {
        setError(data.error || data.details || data.message || 'Unknown error occurred');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const newCodes = result?.newCodes ?? [];
  const processedThisRun =
    result?.processedClassifications ??
    (result?.data ? Object.keys(result.data).length : null);

  return (
    <>
      <Head>
        <title>Admin - Salary Data Scraper</title>
      </Head>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Salary Data Scraper Admin
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Run the canonical scraper to refresh salary data and persist the latest snapshot to <code>data/data.json</code>.
            </p>

            <div className="mb-6">
              <button
                onClick={runScraper}
                disabled={isLoading}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  isLoading
                    ? 'bg-gray-400 cursor-not-allowed text-gray-100'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isLoading ? (
                  <span className="inline-flex items-center space-x-2">
                    <svg
                      className="h-5 w-5 animate-spin text-white"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-75"
                        d="M4 12a8 8 0 018-8v2a6 6 0 100 12v2a8 8 0 01-8-6z"
                        fill="currentColor"
                      />
                    </svg>
                    <span>Scraping in progress...</span>
                  </span>
                ) : (
                  <span>Run Scraper & Update Data</span>
                )}
              </button>
            </div>

            {isLoading && (
              <div className="mb-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2 w-3/4"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mt-4">
                  This may take a few minutes while the latest classifications are retrieved and persisted...
                </p>
              </div>
            )}

            {error && (
              <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 text-red-700 dark:text-red-400 rounded">
                <h3 className="font-semibold mb-2">Error occurred:</h3>
                <p>{error}</p>
              </div>
            )}

            {result && (
              <div className="mb-6 p-4 bg-green-100 dark:bg-green-900/20 border border-green-400 text-green-800 dark:text-green-300 rounded">
                <h3 className="font-semibold">Scraping completed successfully!</h3>
                {result.message && (
                  <p className="text-sm mt-1">{result.message}</p>
                )}

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-md bg-white/70 dark:bg-gray-900/40 border border-green-200 dark:border-green-900/40 p-3">
                    <div className="text-xs uppercase tracking-wide text-gray-600 dark:text-gray-400">
                      Processed this run
                    </div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {processedThisRun !== null ? formatNumber(processedThisRun) : '0'}
                    </div>
                  </div>
                  <div className="rounded-md bg-white/70 dark:bg-gray-900/40 border border-green-200 dark:border-green-900/40 p-3">
                    <div className="text-xs uppercase tracking-wide text-gray-600 dark:text-gray-400">
                      New classifications added
                    </div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {formatNumber(result.newClassifications ?? 0)}
                    </div>
                  </div>
                  <div className="rounded-md bg-white/70 dark:bg-gray-900/40 border border-green-200 dark:border-green-900/40 p-3">
                    <div className="text-xs uppercase tracking-wide text-gray-600 dark:text-gray-400">
                      Persisted total records
                    </div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {formatNumber(persistedTotal)}
                    </div>
                  </div>
                  <div className="rounded-md bg-white/70 dark:bg-gray-900/40 border border-green-200 dark:border-green-900/40 p-3">
                    <div className="text-xs uppercase tracking-wide text-gray-600 dark:text-gray-400">
                      data.json updated
                    </div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatTimestamp(lastUpdated)}
                    </div>
                  </div>
                </div>

                {newCodes.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      New classifications added in this run
                    </h4>
                    <p className="mt-1 text-xs text-gray-700 dark:text-gray-300 break-words">
                      {newCodes.join(', ')}
                    </p>
                  </div>
                )}

                {groupStats.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Classification group totals
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      Grouped by the alpha prefix (for example: AS-01 becomes AS).
                    </p>
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                      {groupStats.map((group) => (
                        <div
                          key={group.group}
                          className="border border-green-200 dark:border-green-900/40 rounded-md p-3 bg-white dark:bg-gray-900/40"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                              {group.group}
                            </span>
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              {group.total} codes
                            </span>
                          </div>
                          <div className="mt-2 text-xs text-gray-700 dark:text-gray-300 break-words">
                            {group.codes.slice(0, 8).join(', ')}
                            {group.codes.length > 8 && (
                              <span> +{group.codes.length - 8} more</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.data && Object.keys(result.data).length > 0 && (
                  <details className="mt-4">
                    <summary className="cursor-pointer font-medium">
                      View scraped data
                    </summary>
                    <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-auto max-h-64">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
