export default function Home() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl md:text-6xl">
          Welcome to BucketBoard
        </h1>
        <p className="mx-auto mt-3 max-w-md text-base text-gray-500 dark:text-gray-400 sm:text-lg md:mt-5 md:max-w-3xl md:text-xl">
          A high-performance web-based object storage explorer for managing cloud storage across
          multiple platforms.
        </p>
        <div className="mx-auto mt-10 max-w-2xl space-y-6">
          <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-950">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Getting Started</h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Configure your cloud storage credentials to start managing your buckets.
            </p>
            <div className="mt-6 flex space-x-4">
              <a
                href="/buckets"
                className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Browse Buckets
              </a>
              <a
                href="/credentials"
                className="inline-flex items-center rounded-md bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Configure Credentials
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
