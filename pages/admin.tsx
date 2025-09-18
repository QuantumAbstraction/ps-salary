
import { useState } from 'react';
import Head from 'next/head';

export default function Admin() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const runScraper = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/scraper', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || 'Unknown error occurred');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Admin - Salary Data Scraper</title>
      </Head>
      
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Salary Data Scraper Admin
            </h1>
            
            <div className="mb-6">
              <button
                onClick={runScraper}
                disabled={isLoading}
                className={`px-6 py-3 rounded-lg font-medium ${
                  isLoading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isLoading ? 'Scraping in progress...' : 'Run Scraper'}
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
                  This may take a few minutes...
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
              <div className="mb-6 p-4 bg-green-100 dark:bg-green-900/20 border border-green-400 text-green-700 dark:text-green-400 rounded">
                <h3 className="font-semibold mb-2">Scraping completed successfully!</h3>
                <p>Message: {result.message}</p>
                <p>New classifications found: {result.newClassifications}</p>
                
                {result.data && Object.keys(result.data).length > 0 && (
                  <details className="mt-4">
                    <summary className="cursor-pointer font-medium">View scraped data</summary>
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
