'use client';

import { useState, useEffect, Fragment } from 'react';
import { StorageProvider } from '@/lib/types/credentials';
import { CredentialForm } from '@/components/CredentialForm';
import { useCachedFetch, DEFAULT_TTL } from '@/lib/utils/use-cached-fetch';
import { cacheManager } from '@/lib/utils/cache';

interface CredentialSummary {
  id: string;
  name: string;
  provider: StorageProvider;
  createdAt: string;
  updatedAt: string;
}

interface CredentialsResponse {
  credentials: CredentialSummary[];
}

export default function CredentialsPage() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [testingCredentialId, setTestingCredentialId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});

  // Fetch credentials with caching
  const {
    data: credentialsData,
    loading,
    refetch: refetchCredentials,
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

  const loadCredentials = async () => {
    await refetchCredentials();
  };

  const handleTestConnection = async (id: string) => {
    setTestingCredentialId(id);
    setTestResults((prev) => {
      const newResults = { ...prev };
      delete newResults[id];
      return newResults;
    });

    try {
      const response = await fetch('/api/credentials/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ credentialId: id }),
      });

      const result = await response.json();
      setTestResults((prev) => ({ ...prev, [id]: result }));
    } catch (error) {
      console.error('Error testing connection:', error);
      setTestResults((prev) => ({
        ...prev,
        [id]: {
          success: false,
          message: 'Failed to test connection. Please try again.',
        },
      }));
    } finally {
      setTestingCredentialId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this credential?')) {
      return;
    }

    try {
      const response = await fetch(`/api/credentials/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Invalidate credentials cache
        cacheManager.invalidate('credentials', { useLocalStorage: true });
        await loadCredentials();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting credential:', error);
      alert('Failed to delete credential');
    }
  };

  const getProviderLabel = (provider: StorageProvider): string => {
    const labels: Record<StorageProvider, string> = {
      'aws-s3': 'AWS S3 / S3-Compatible',
      'azure-blob': 'Azure Blob Storage',
      'gcp-storage': 'Google Cloud Storage',
    };
    return labels[provider] || provider;
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400">Loading credentials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Credentials</h1>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            Manage your cloud storage provider credentials
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0">
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Add Credential
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="mt-8">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Add New Credential
            </h2>
            <div className="mt-4">
              <CredentialForm
                onSuccess={() => {
                  setShowAddForm(false);
                  // Invalidate credentials cache
                  cacheManager.invalidate('credentials', { useLocalStorage: true });
                  loadCredentials();
                }}
                onCancel={() => setShowAddForm(false)}
              />
            </div>
          </div>
        </div>
      )}

      <div className="mt-8">
        {credentials.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-12 text-center shadow-sm dark:border-gray-800 dark:bg-gray-950">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
              No credentials
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Get started by adding a credential for your cloud storage provider.
            </p>
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Add Credential
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow dark:border-gray-800 dark:bg-gray-950">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Provider
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-800 dark:bg-gray-950">
                {credentials.map((credential) => (
                  <Fragment key={credential.id}>
                    <tr>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                        {credential.name}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {getProviderLabel(credential.provider)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {new Date(credential.createdAt).toLocaleDateString()}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                        <button
                          onClick={() => handleTestConnection(credential.id)}
                          disabled={testingCredentialId === credential.id}
                          className="mr-4 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50"
                        >
                          {testingCredentialId === credential.id ? 'Testing...' : 'Test'}
                        </button>
                        <button
                          onClick={() => handleDelete(credential.id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                    {testResults[credential.id] && (
                      <tr key={`${credential.id}-test-result`}>
                        <td colSpan={4} className="px-6 py-2">
                          <div
                            className={`rounded-md p-3 text-sm ${
                              testResults[credential.id].success
                                ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                            }`}
                          >
                            <div className="flex items-center">
                              <div className="flex-shrink-0">
                                {testResults[credential.id].success ? (
                                  <svg
                                    className="h-5 w-5 text-green-400"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                ) : (
                                  <svg
                                    className="h-5 w-5 text-red-400"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                )}
                              </div>
                              <div className="ml-3 flex-1">
                                <p className="font-medium">{testResults[credential.id].message}</p>
                              </div>
                              <button
                                onClick={() => {
                                  setTestResults((prev) => {
                                    const newResults = { ...prev };
                                    delete newResults[credential.id];
                                    return newResults;
                                  });
                                }}
                                className="ml-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                              >
                                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path
                                    fillRule="evenodd"
                                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
