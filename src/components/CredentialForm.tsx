'use client';

import { useState } from 'react';
import { StorageProvider } from '@/lib/types/credentials';

interface CredentialFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function CredentialForm({ onSuccess, onCancel }: CredentialFormProps) {
  const [provider, setProvider] = useState<StorageProvider>('aws-s3');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // S3 / S3-compatible fields
  const [awsAccessKeyId, setAwsAccessKeyId] = useState('');
  const [awsSecretAccessKey, setAwsSecretAccessKey] = useState('');
  const [awsRegion, setAwsRegion] = useState('us-east-1');
  const [s3Endpoint, setS3Endpoint] = useState('');

  // Azure Blob fields
  const [azureAccountName, setAzureAccountName] = useState('');
  const [azureAccountKey, setAzureAccountKey] = useState('');

  // GCP Storage fields
  const [gcpProjectId, setGcpProjectId] = useState('');
  const [gcpClientEmail, setGcpClientEmail] = useState('');
  const [gcpPrivateKey, setGcpPrivateKey] = useState('');

  const isS3Provider = provider === 'aws-s3';

  const handleTestConnection = async () => {
    setTestLoading(true);
    setTestResult(null);

    try {
      let config: any = {};

      if (provider === 'aws-s3') {
        config = {
          accessKeyId: awsAccessKeyId,
          secretAccessKey: awsSecretAccessKey,
          region: awsRegion,
        };
        if (s3Endpoint) {
          config.endpoint = s3Endpoint;
        }
      } else if (provider === 'azure-blob') {
        config = {
          accountName: azureAccountName,
          accountKey: azureAccountKey,
        };
      } else if (provider === 'gcp-storage') {
        config = {
          projectId: gcpProjectId,
          clientEmail: gcpClientEmail,
          privateKey: gcpPrivateKey,
        };
      }

      const response = await fetch('/api/credentials/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider,
          config,
        }),
      });

      const result = await response.json();
      setTestResult(result);
    } catch (error) {
      console.error('Error testing connection:', error);
      setTestResult({
        success: false,
        message: 'Failed to test connection. Please check your credentials and try again.',
      });
    } finally {
      setTestLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const id = `${provider}-${Date.now()}`;
      let config: any = {};

      if (provider === 'aws-s3') {
        config = {
          accessKeyId: awsAccessKeyId,
          secretAccessKey: awsSecretAccessKey,
          region: awsRegion,
        };
        // Add endpoint for S3-compatible services (MinIO, Backblaze B2, etc.)
        if (s3Endpoint) {
          config.endpoint = s3Endpoint;
        }
      } else if (provider === 'azure-blob') {
        config = {
          accountName: azureAccountName,
          accountKey: azureAccountKey,
        };
      } else if (provider === 'gcp-storage') {
        config = {
          projectId: gcpProjectId,
          clientEmail: gcpClientEmail,
          privateKey: gcpPrivateKey,
        };
      }

      const response = await fetch('/api/credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          name,
          provider,
          config,
        }),
      });

      if (response.ok) {
        onSuccess();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating credential:', error);
      alert('Failed to create credential');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Credential Name
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white sm:text-sm"
          placeholder="My AWS Credentials"
        />
      </div>

      <div>
        <label
          htmlFor="provider"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Provider
        </label>
        <select
          id="provider"
          value={provider}
          onChange={(e) => setProvider(e.target.value as StorageProvider)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white sm:text-sm"
        >
          <option value="aws-s3">AWS S3 / S3-Compatible</option>
          <option value="azure-blob">Azure Blob Storage</option>
          <option value="gcp-storage">Google Cloud Storage</option>
        </select>
      </div>

      {isS3Provider && (
        <>
          <div>
            <label
              htmlFor="awsAccessKeyId"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Access Key ID
            </label>
            <input
              type="text"
              id="awsAccessKeyId"
              value={awsAccessKeyId}
              onChange={(e) => setAwsAccessKeyId(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white sm:text-sm"
            />
          </div>
          <div>
            <label
              htmlFor="awsSecretAccessKey"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Secret Access Key
            </label>
            <input
              type="password"
              id="awsSecretAccessKey"
              value={awsSecretAccessKey}
              onChange={(e) => setAwsSecretAccessKey(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white sm:text-sm"
            />
          </div>
          <div>
            <label
              htmlFor="awsRegion"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Region
            </label>
            <input
              type="text"
              id="awsRegion"
              value={awsRegion}
              onChange={(e) => setAwsRegion(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white sm:text-sm"
              placeholder="us-east-1"
            />
          </div>
          <div>
            <label
              htmlFor="s3Endpoint"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Endpoint URL (optional)
            </label>
            <input
              type="url"
              id="s3Endpoint"
              value={s3Endpoint}
              onChange={(e) => setS3Endpoint(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white sm:text-sm"
              placeholder="https://s3.example.com"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Leave empty for AWS S3. For S3-compatible services (MinIO, Backblaze B2, DigitalOcean Spaces, Wasabi), provide the endpoint URL.
            </p>
          </div>
        </>
      )}

      {provider === 'azure-blob' && (
        <>
          <div>
            <label
              htmlFor="azureAccountName"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Account Name
            </label>
            <input
              type="text"
              id="azureAccountName"
              value={azureAccountName}
              onChange={(e) => setAzureAccountName(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white sm:text-sm"
            />
          </div>
          <div>
            <label
              htmlFor="azureAccountKey"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Account Key
            </label>
            <input
              type="password"
              id="azureAccountKey"
              value={azureAccountKey}
              onChange={(e) => setAzureAccountKey(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white sm:text-sm"
            />
          </div>
        </>
      )}

      {provider === 'gcp-storage' && (
        <>
          <div>
            <label
              htmlFor="gcpProjectId"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Project ID
            </label>
            <input
              type="text"
              id="gcpProjectId"
              value={gcpProjectId}
              onChange={(e) => setGcpProjectId(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white sm:text-sm"
            />
          </div>
          <div>
            <label
              htmlFor="gcpClientEmail"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Client Email
            </label>
            <input
              type="email"
              id="gcpClientEmail"
              value={gcpClientEmail}
              onChange={(e) => setGcpClientEmail(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white sm:text-sm"
            />
          </div>
          <div>
            <label
              htmlFor="gcpPrivateKey"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Private Key
            </label>
            <textarea
              id="gcpPrivateKey"
              value={gcpPrivateKey}
              onChange={(e) => setGcpPrivateKey(e.target.value)}
              required
              rows={4}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white sm:text-sm"
              placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----"
            />
          </div>
        </>
      )}

      {testResult && (
        <div
          className={`rounded-md p-4 ${
            testResult.success
              ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400'
              : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400'
          }`}
        >
          <div className="flex">
            <div className="flex-shrink-0">
              {testResult.success ? (
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
            <div className="ml-3">
              <p className="text-sm font-medium">{testResult.message}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <button
          type="button"
          onClick={handleTestConnection}
          disabled={testLoading}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 disabled:opacity-50"
        >
          {testLoading ? 'Testing...' : 'Test Connection'}
        </button>
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Credential'}
          </button>
        </div>
      </div>
    </form>
  );
}
