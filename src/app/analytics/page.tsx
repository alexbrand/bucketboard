'use client';

import { useState, useEffect } from 'react';
import { StorageProvider } from '@/lib/types/credentials';
import { useCachedFetch, createCacheKey, DEFAULT_TTL } from '@/lib/utils/use-cached-fetch';

interface Credential {
  id: string;
  name: string;
  provider: StorageProvider;
}

interface BucketAnalytics {
  name: string;
  totalSize: number;
  objectCount: number;
  fileTypes: Record<string, number>;
  storageClasses: Record<string, number>;
  largestFiles: Array<{ key: string; size: number }>;
}

interface AnalyticsData {
  summary: {
    totalBuckets: number;
    totalStorageSize: number;
    totalObjectCount: number;
    fileTypes: Record<string, number>;
    storageClasses: Record<string, number>;
  };
  buckets: BucketAnalytics[];
}

interface CredentialsResponse {
  credentials: Credential[];
}

export default function AnalyticsPage() {
  const [selectedCredentialId, setSelectedCredentialId] = useState<string>('');

  // Fetch credentials with caching
  const {
    data: credentialsData,
    loading: credentialsLoading,
  } = useCachedFetch<CredentialsResponse>(
    'credentials',
    async () => {
      const response = await fetch('/api/credentials');
      if (!response.ok) throw new Error('Failed to fetch credentials');
      return response.json();
    },
    {
      ttl: DEFAULT_TTL.CREDENTIALS,
      useLocalStorage: true,
    }
  );

  const credentials = credentialsData?.credentials || [];

  // Auto-select first credential when credentials load
  useEffect(() => {
    if (credentials.length > 0 && !selectedCredentialId) {
      setSelectedCredentialId(credentials[0].id);
    }
  }, [credentials, selectedCredentialId]);

  // Fetch analytics with caching
  const {
    data: analytics,
    loading,
  } = useCachedFetch<AnalyticsData>(
    createCacheKey('analytics', selectedCredentialId),
    async () => {
      if (!selectedCredentialId) throw new Error('No credential selected');
      const response = await fetch(`/api/analytics?credentialId=${selectedCredentialId}`);
      if (!response.ok) throw new Error('Failed to fetch analytics');
      return response.json();
    },
    {
      ttl: DEFAULT_TTL.ANALYTICS,
      enabled: !!selectedCredentialId,
    }
  );

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileTypeColor = (index: number): string => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-red-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-cyan-500',
    ];
    return colors[index % colors.length];
  };

  if (credentialsLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-2 text-gray-500 dark:text-gray-400">Loading credentials...</p>
        </div>
      </div>
    );
  }

  if (credentials.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">No credentials found</h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Please add a credential first to view analytics.
          </p>
          <div className="mt-6">
            <a
              href="/credentials"
              className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Add Credential
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Storage Analytics</h1>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            View insights and statistics about your cloud storage
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0">
          <select
            value={selectedCredentialId}
            onChange={(e) => setSelectedCredentialId(e.target.value)}
            className="block w-full rounded-md border-gray-300 bg-white px-4 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          >
            {credentials.map((cred) => (
              <option key={cred.id} value={cred.id}>
                {cred.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="mt-8 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-2 text-gray-500 dark:text-gray-400">Loading analytics...</p>
        </div>
      ) : analytics ? (
        <div className="mt-8 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg
                    className="h-8 w-8 text-blue-600 dark:text-blue-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                    />
                  </svg>
                </div>
                <div className="ml-5">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Total Buckets
                  </p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {analytics.summary.totalBuckets}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg
                    className="h-8 w-8 text-green-600 dark:text-green-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
                    />
                  </svg>
                </div>
                <div className="ml-5">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Total Storage
                  </p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {formatBytes(analytics.summary.totalStorageSize)}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg
                    className="h-8 w-8 text-yellow-600 dark:text-yellow-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <div className="ml-5">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Total Objects
                  </p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {analytics.summary.totalObjectCount.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg
                    className="h-8 w-8 text-purple-600 dark:text-purple-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                    />
                  </svg>
                </div>
                <div className="ml-5">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    File Types
                  </p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {Object.keys(analytics.summary.fileTypes).length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* File Types Distribution */}
          {Object.keys(analytics.summary.fileTypes).length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                File Types Distribution
              </h3>
              <div className="mt-4">
                <div className="space-y-3">
                  {Object.entries(analytics.summary.fileTypes)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 10)
                    .map(([type, count], index) => {
                      const percentage =
                        (count / analytics.summary.totalObjectCount) * 100;
                      return (
                        <div key={type}>
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-gray-700 dark:text-gray-300">
                              .{type}
                            </span>
                            <span className="text-gray-500 dark:text-gray-400">
                              {count} files ({percentage.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                            <div
                              className={`h-full ${getFileTypeColor(index)}`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}

          {/* Bucket Details */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Bucket Breakdown
            </h3>
            <div className="mt-4 space-y-4">
              {analytics.buckets.map((bucket) => (
                <div
                  key={bucket.name}
                  className="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                      {bucket.name}
                    </h4>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {formatBytes(bucket.totalSize)}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Objects</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {bucket.objectCount.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">File Types</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {Object.keys(bucket.fileTypes).length}
                      </p>
                    </div>
                  </div>

                  {/* Largest Files */}
                  {bucket.largestFiles.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                        Largest Files
                      </p>
                      <div className="mt-2 space-y-1">
                        {bucket.largestFiles.map((file) => (
                          <div
                            key={file.key}
                            className="flex items-center justify-between text-xs"
                          >
                            <span className="truncate text-gray-700 dark:text-gray-300">
                              {file.key.split('/').pop()}
                            </span>
                            <span className="ml-2 text-gray-500 dark:text-gray-400">
                              {formatBytes(file.size)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Storage Classes */}
          {Object.keys(analytics.summary.storageClasses).length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Storage Classes
              </h3>
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {Object.entries(analytics.summary.storageClasses).map(([className, count]) => (
                  <div
                    key={className}
                    className="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
                  >
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      {className}
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                      {count}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
