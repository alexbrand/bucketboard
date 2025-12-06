'use client';

import { useState, useEffect } from 'react';
import { StorageProvider } from '@/lib/types/credentials';

interface Credential {
  id: string;
  name: string;
  provider: StorageProvider;
}

interface Bucket {
  name: string;
  creationDate?: string;
  region?: string;
}

export default function BucketsPage() {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [selectedCredentialId, setSelectedCredentialId] = useState<string>('');
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [selectedBucket, setSelectedBucket] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCredentials();
  }, []);

  useEffect(() => {
    if (selectedCredentialId) {
      loadBuckets();
    }
  }, [selectedCredentialId]);

  const loadCredentials = async () => {
    try {
      const response = await fetch('/api/credentials');
      const data = await response.json();
      setCredentials(data.credentials || []);
      if (data.credentials?.length > 0) {
        setSelectedCredentialId(data.credentials[0].id);
      }
    } catch (error) {
      console.error('Error loading credentials:', error);
    }
  };

  const loadBuckets = async () => {
    if (!selectedCredentialId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/buckets?credentialId=${selectedCredentialId}`);
      const data = await response.json();
      setBuckets(data.buckets || []);
    } catch (error) {
      console.error('Error loading buckets:', error);
    } finally {
      setLoading(false);
    }
  };

  if (credentials.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">No credentials found</h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Please add a credential first to browse your buckets.
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Buckets</h1>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            Browse and manage your cloud storage buckets
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

      <div className="mt-8">
        {loading ? (
          <div className="text-center">
            <p className="text-gray-500 dark:text-gray-400">Loading buckets...</p>
          </div>
        ) : buckets.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-12 text-center shadow-sm dark:border-gray-800 dark:bg-gray-950">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">No buckets found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              No buckets found for the selected credential.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {buckets.map((bucket) => (
              <button
                key={bucket.name}
                onClick={() => setSelectedBucket(bucket.name)}
                className={`rounded-lg border p-6 text-left transition-all hover:border-blue-500 hover:shadow-md ${
                  selectedBucket === bucket.name
                    ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20'
                    : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950'
                }`}
              >
                <div className="flex items-center">
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
                  <h3 className="ml-3 text-lg font-semibold text-gray-900 dark:text-white">
                    {bucket.name}
                  </h3>
                </div>
                {bucket.region && (
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Region: {bucket.region}
                  </p>
                )}
                {bucket.creationDate && (
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Created: {new Date(bucket.creationDate).toLocaleDateString()}
                  </p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedBucket && selectedCredentialId && (
        <div className="mt-8">
          <ObjectBrowser bucketName={selectedBucket} credentialId={selectedCredentialId} />
        </div>
      )}
    </div>
  );
}

interface ObjectBrowserProps {
  bucketName: string;
  credentialId: string;
}

interface StorageObject {
  key: string;
  size: number;
  lastModified: string;
  etag?: string;
  storageClass?: string;
  isFolder?: boolean;
}

interface ObjectMetadata extends StorageObject {
  contentType?: string;
  metadata?: Record<string, string>;
}

function ObjectBrowser({ bucketName, credentialId }: ObjectBrowserProps) {
  const [objects, setObjects] = useState<StorageObject[]>([]);
  const [currentPrefix, setCurrentPrefix] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [selectedObject, setSelectedObject] = useState<StorageObject | null>(null);
  const [objectMetadata, setObjectMetadata] = useState<ObjectMetadata | null>(null);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadObjects();
  }, [bucketName, currentPrefix]);

  const loadObjects = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        credentialId,
        prefix: currentPrefix,
        delimiter: '/',
      });

      const response = await fetch(`/api/buckets/${bucketName}/objects?${params}`);
      const data = await response.json();
      setObjects(data.objects || []);
    } catch (error) {
      console.error('Error loading objects:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigateToFolder = (folderKey: string) => {
    setCurrentPrefix(folderKey);
    setSelectedObject(null);
    setObjectMetadata(null);
  };

  const navigateUp = () => {
    const parts = currentPrefix.split('/').filter(Boolean);
    parts.pop();
    setCurrentPrefix(parts.length > 0 ? parts.join('/') + '/' : '');
    setSelectedObject(null);
    setObjectMetadata(null);
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      const folderKey = currentPrefix + newFolderName.trim() + '/';
      const formData = new FormData();
      formData.append('file', new Blob([]), folderKey);
      formData.append('key', folderKey);

      const response = await fetch(
        `/api/buckets/${bucketName}/objects?credentialId=${credentialId}`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (response.ok) {
        setShowCreateFolder(false);
        setNewFolderName('');
        await loadObjects();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating folder:', error);
      alert('Failed to create folder');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploadingFile(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('key', currentPrefix + file.name);

        const response = await fetch(
          `/api/buckets/${bucketName}/objects?credentialId=${credentialId}`,
          {
            method: 'POST',
            body: formData,
          }
        );

        if (!response.ok) {
          const error = await response.json();
          alert(`Error uploading ${file.name}: ${error.error}`);
        }
      }
      await loadObjects();
    } catch (error) {
      console.error('Error uploading files:', error);
      alert('Failed to upload files');
    } finally {
      setUploadingFile(false);
      event.target.value = '';
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedFiles.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedFiles.size} item(s)?`)) return;

    try {
      const response = await fetch(`/api/buckets/${bucketName}/objects`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentialId,
          keys: Array.from(selectedFiles),
        }),
      });

      if (response.ok) {
        setSelectedFiles(new Set());
        await loadObjects();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting objects:', error);
      alert('Failed to delete objects');
    }
  };

  const toggleFileSelection = (key: string) => {
    const newSelection = new Set(selectedFiles);
    if (newSelection.has(key)) {
      newSelection.delete(key);
    } else {
      newSelection.add(key);
    }
    setSelectedFiles(newSelection);
  };

  const viewObjectMetadata = async (object: StorageObject) => {
    setSelectedObject(object);
    if (object.isFolder) {
      setObjectMetadata(null);
      return;
    }

    try {
      const response = await fetch(
        `/api/buckets/${bucketName}/metadata?credentialId=${credentialId}&key=${encodeURIComponent(object.key)}`
      );
      const data = await response.json();
      setObjectMetadata(data);
    } catch (error) {
      console.error('Error loading object metadata:', error);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const breadcrumbs = currentPrefix
    .split('/')
    .filter(Boolean)
    .map((part, index, array) => ({
      name: part,
      path: array.slice(0, index + 1).join('/') + '/',
    }));

  return (
    <div className="space-y-6">
      {/* Header with breadcrumbs and actions */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPrefix('')}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              {bucketName}
            </button>
            {breadcrumbs.map((crumb) => (
              <div key={crumb.path} className="flex items-center space-x-2">
                <span className="text-gray-400">/</span>
                <button
                  onClick={() => navigateToFolder(crumb.path)}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  {crumb.name}
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center space-x-2">
            {selectedFiles.size > 0 && (
              <button
                onClick={handleDeleteSelected}
                className="inline-flex items-center rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Delete ({selectedFiles.size})
              </button>
            )}
            <button
              onClick={() => setShowCreateFolder(true)}
              className="inline-flex items-center rounded-md bg-gray-600 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              New Folder
            </button>
            <label className="inline-flex cursor-pointer items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
              {uploadingFile ? 'Uploading...' : 'Upload Files'}
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                disabled={uploadingFile}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Folder creation form */}
        {showCreateFolder && (
          <div className="mt-4 rounded-md border border-gray-300 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Folder Name
            </label>
            <div className="mt-2 flex space-x-2">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Enter folder name"
                className="block flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white sm:text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') createFolder();
                  if (e.key === 'Escape') {
                    setShowCreateFolder(false);
                    setNewFolderName('');
                  }
                }}
              />
              <button
                onClick={createFolder}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setShowCreateFolder(false);
                  setNewFolderName('');
                }}
                className="rounded-md bg-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-400 dark:bg-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main content area */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Object list */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
            {loading ? (
              <div className="p-12 text-center">
                <p className="text-gray-500 dark:text-gray-400">Loading...</p>
              </div>
            ) : objects.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-gray-500 dark:text-gray-400">
                  {currentPrefix ? 'This folder is empty' : 'This bucket is empty'}
                </p>
              </div>
            ) : (
              <div className="overflow-hidden">
                {currentPrefix && (
                  <button
                    onClick={navigateUp}
                    className="flex w-full items-center border-b border-gray-200 px-6 py-3 text-left hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
                  >
                    <svg
                      className="h-5 w-5 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 19l-7-7m0 0l7-7m-7 7h18"
                      />
                    </svg>
                    <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Go up
                    </span>
                  </button>
                )}
                <div className="divide-y divide-gray-200 dark:divide-gray-800">
                  {objects.map((object) => (
                    <div
                      key={object.key}
                      className={`flex items-center px-6 py-3 hover:bg-gray-50 dark:hover:bg-gray-900 ${
                        selectedObject?.key === object.key ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedFiles.has(object.key)}
                        onChange={() => toggleFileSelection(object.key)}
                        className="mr-3 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <button
                        onClick={() =>
                          object.isFolder ? navigateToFolder(object.key) : viewObjectMetadata(object)
                        }
                        className="flex flex-1 items-center"
                      >
                        {object.isFolder ? (
                          <svg
                            className="h-5 w-5 text-blue-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="h-5 w-5 text-gray-400"
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
                        )}
                        <div className="ml-3 flex-1 text-left">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {object.key.split('/').filter(Boolean).pop()}
                          </p>
                          {!object.isFolder && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {formatBytes(object.size)} •{' '}
                              {new Date(object.lastModified).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Metadata panel */}
        <div className="lg:col-span-1">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Details</h3>
            {selectedObject ? (
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                    Name
                  </p>
                  <p className="mt-1 break-all text-sm text-gray-900 dark:text-white">
                    {selectedObject.key.split('/').filter(Boolean).pop()}
                  </p>
                </div>
                {!selectedObject.isFolder && (
                  <>
                    <div>
                      <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                        Size
                      </p>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">
                        {formatBytes(selectedObject.size)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                        Last Modified
                      </p>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">
                        {new Date(selectedObject.lastModified).toLocaleString()}
                      </p>
                    </div>
                    {selectedObject.etag && (
                      <div>
                        <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                          ETag
                        </p>
                        <p className="mt-1 break-all text-sm text-gray-900 dark:text-white">
                          {selectedObject.etag}
                        </p>
                      </div>
                    )}
                    {selectedObject.storageClass && (
                      <div>
                        <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                          Storage Class
                        </p>
                        <p className="mt-1 text-sm text-gray-900 dark:text-white">
                          {selectedObject.storageClass}
                        </p>
                      </div>
                    )}
                    {objectMetadata?.contentType && (
                      <div>
                        <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                          Content Type
                        </p>
                        <p className="mt-1 text-sm text-gray-900 dark:text-white">
                          {objectMetadata.contentType}
                        </p>
                      </div>
                    )}
                    {objectMetadata?.metadata &&
                      Object.keys(objectMetadata.metadata).length > 0 && (
                        <div>
                          <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                            Metadata
                          </p>
                          <div className="mt-2 space-y-2">
                            {Object.entries(objectMetadata.metadata).map(([key, value]) => (
                              <div
                                key={key}
                                className="rounded bg-gray-50 p-2 dark:bg-gray-900"
                              >
                                <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                  {key}
                                </p>
                                <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                                  {value}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    <div>
                      <a
                        href={`/api/buckets/${bucketName}/download?credentialId=${credentialId}&key=${encodeURIComponent(selectedObject.key)}`}
                        className="inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                      >
                        Download
                      </a>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                Select an object to view its details
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
