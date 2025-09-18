
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 dark:bg-gray-800 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">About This API</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              This API provides access to publicly accessible salary information for Canadian public service classifications, 
              sourced from{' '}
              <a
                href="https://www.tbs-sct.canada.ca/pubs_pol/hrpubs/coll_agre/rates-taux-eng.asp"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                TBS-SCT Canada
              </a>.
            </p>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              <p>⚠️ This API is not affiliated with the Government of Canada.</p>
              <p>📚 Data provided for educational purposes only.</p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Navigation</h3>
            <div className="space-y-2">
              <Link href="/" className="block text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400">
                🏠 Home
              </Link>
              <Link href="/search" className="block text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400">
                🔍 Advanced Search
              </Link>
              <Link href="/equivalency" className="block text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400">
                ⚖️ Salary Equivalency
              </Link>
              <a
                href="/api/data"
                target="_blank"
                className="block text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400"
              >
                📊 API Documentation
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Resources</h3>
            <div className="space-y-2">
              <a
                href="https://github.com/dougkeefe/ps-salary-data"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400"
              >
                📁 GitHub Repository
              </a>
              <a
                href="https://github.com/dougkeefe/ps-salary-data/blob/main/LICENSE"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400"
              >
                📜 MIT License
              </a>
            </div>
          </div>
        </div>

        <hr className="my-8 border-gray-200 dark:border-gray-700" />
        
        <div className="text-center text-gray-500 dark:text-gray-400">
          <p>Author: Doug Keefe • 2023</p>
          <p className="text-sm mt-1">Edit: Fabrice Ndizihiwe • 2025</p>
        </div>
      </div>
    </footer>
  );
}
