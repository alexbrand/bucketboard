import Link from 'next/link';

export function Navigation() {
  return (
    <nav className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
                <span className="text-lg font-bold text-white">B</span>
              </div>
              <span className="text-xl font-semibold text-gray-900 dark:text-white">
                BucketBoard
              </span>
            </Link>
            <div className="ml-10 flex items-baseline space-x-4">
              <Link
                href="/buckets"
                className="rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
              >
                Buckets
              </Link>
              <Link
                href="/analytics"
                className="rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
              >
                Analytics
              </Link>
              <Link
                href="/credentials"
                className="rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
              >
                Credentials
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
