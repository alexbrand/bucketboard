'use client';

import { useState, useEffect } from 'react';
import { StorageProvider } from '@/lib/types/credentials';
import { ProgressTracker, FileProgress } from '@/components/ProgressTracker';
import { VirtualizedObjectList } from '@/components/VirtualizedObjectList';
import { useCachedFetch, createCacheKey, DEFAULT_TTL } from '@/lib/utils/use-cached-fetch';
import { cacheManager } from '@/lib/utils/cache';
import { LastUpdated } from '@/components/LastUpdated';

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

interface CredentialsResponse {
  credentials: Credential[];
}

interface BucketsResponse {
  buckets: Bucket[];
  credentialId: string;
}

export default function BucketsPage() {
  const [selectedCredentialId, setSelectedCredentialId] = useState<string>('');
  const [selectedBucket, setSelectedBucket] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(12);

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

  // Fetch buckets with caching
  const {
    data: bucketsData,
    loading: bucketsLoading,
    lastUpdated: bucketsLastUpdated,
    refetch: refetchBuckets,
  } = useCachedFetch<BucketsResponse>(
    createCacheKey('buckets', selectedCredentialId),
    async () => {
      if (!selectedCredentialId) throw new Error('No credential selected');
      const response = await fetch(`/api/buckets?credentialId=${selectedCredentialId}`);
      if (!response.ok) throw new Error('Failed to fetch buckets');
      return response.json();
    },
    {
      ttl: DEFAULT_TTL.BUCKETS,
      enabled: !!selectedCredentialId,
    }
  );

  const buckets = bucketsData?.buckets || [];
  const loading = bucketsLoading;

  // Pagination calculations
  const totalPages = Math.ceil(buckets.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedBuckets = buckets.slice(startIndex, endIndex);

  // Reset to page 1 when credential changes or buckets data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCredentialId, buckets.length]);

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
        {buckets.length > 0 && !bucketsLoading && (
          <div className="mb-4 flex items-center justify-end gap-3">
            <LastUpdated timestamp={bucketsLastUpdated} />
            <button
              onClick={() => refetchBuckets()}
              disabled={bucketsLoading}
              className="inline-flex items-center rounded-md bg-white px-2 py-1 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              title="Refresh buckets"
            >
              <svg
                className={`h-4 w-4 ${bucketsLoading ? 'animate-spin' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>
        )}
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
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {paginatedBuckets.map((bucket) => (
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
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-950 sm:px-6">
              <div className="flex flex-1 justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(endIndex, buckets.length)}</span> of{' '}
                    <span className="font-medium">{buckets.length}</span> bucket{buckets.length !== 1 ? 's' : ''}
                  </p>
                  <div className="flex items-center gap-2">
                    <label htmlFor="items-per-page" className="text-sm text-gray-700 dark:text-gray-300">
                      Per page:
                    </label>
                    <select
                      id="items-per-page"
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="rounded-md border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    >
                      <option value={6}>6</option>
                      <option value={12}>12</option>
                      <option value={24}>24</option>
                      <option value={48}>48</option>
                    </select>
                  </div>
                </div>
                <div>
                  <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                    <button
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center rounded-l-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800"
                    >
                      <span className="sr-only">Previous</span>
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      // Show first page, last page, current page, and pages around current
                      const showPage =
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1);
                      
                      // Show ellipsis
                      const showEllipsisBefore = page === currentPage - 2 && currentPage > 3;
                      const showEllipsisAfter = page === currentPage + 2 && currentPage < totalPages - 2;

                      if (showEllipsisBefore || showEllipsisAfter) {
                        return (
                          <span
                            key={`ellipsis-${page}`}
                            className="relative inline-flex items-center border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                          >
                            ...
                          </span>
                        );
                      }

                      if (!showPage) return null;

                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`relative inline-flex items-center border px-4 py-2 text-sm font-medium ${
                            currentPage === page
                              ? 'z-10 border-blue-500 bg-blue-50 text-blue-600 dark:border-blue-400 dark:bg-blue-900/20 dark:text-blue-400'
                              : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center rounded-r-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800"
                    >
                      <span className="sr-only">Next</span>
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
          </>
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
  tags?: Record<string, string>;
}

interface ObjectsResponse {
  objects: StorageObject[];
  bucket: string;
  prefix: string;
}

function ObjectBrowser({ bucketName, credentialId }: ObjectBrowserProps) {
  const [currentPrefix, setCurrentPrefix] = useState<string>('');
  const [selectedObject, setSelectedObject] = useState<StorageObject | null>(null);
  const [objectMetadata, setObjectMetadata] = useState<ObjectMetadata | null>(null);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [fileTypeFilter, setFileTypeFilter] = useState<string>('all');
  const [sizeFilter, setSizeFilter] = useState<{ min: number; max: number }>({ min: 0, max: Infinity });
  const [dateFilter, setDateFilter] = useState<{ start: string; end: string }>({ start: '', end: '' });

  // Metadata editing state
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);
  const [editedMetadata, setEditedMetadata] = useState<Record<string, string>>({});
  const [editedTags, setEditedTags] = useState<Record<string, string>>({});
  const [editedStorageClass, setEditedStorageClass] = useState<string>('');
  const [editedContentType, setEditedContentType] = useState<string>('');
  const [savingMetadata, setSavingMetadata] = useState(false);

  // Progress tracking state
  const [fileProgress, setFileProgress] = useState<FileProgress[]>([]);
  const [abortControllers, setAbortControllers] = useState<Map<string, AbortController>>(new Map());

  // Fetch objects with caching
  const objectsCacheKey = createCacheKey('objects', bucketName, credentialId, currentPrefix);
  const {
    data: objectsData,
    loading,
    lastUpdated,
    refetch: refetchObjects,
  } = useCachedFetch<ObjectsResponse>(
    objectsCacheKey,
    async () => {
      const params = new URLSearchParams({
        credentialId,
        prefix: currentPrefix,
        delimiter: '/',
      });
      const response = await fetch(`/api/buckets/${bucketName}/objects?${params}`);
      if (!response.ok) throw new Error('Failed to fetch objects');
      return response.json();
    },
    {
      ttl: DEFAULT_TTL.OBJECTS,
      enabled: !!bucketName && !!credentialId,
    }
  );

  const objects = objectsData?.objects || [];

  // Prefetch function for folder contents
  const handleFolderHover = (folderKey: string) => {
    const cacheKey = createCacheKey('objects', bucketName, credentialId, folderKey);
    if (!cacheManager.get(cacheKey)) {
      cacheManager.prefetch<ObjectsResponse>(
        cacheKey,
        async () => {
          const params = new URLSearchParams({
            credentialId,
            prefix: folderKey,
            delimiter: '/',
          });
          const response = await fetch(`/api/buckets/${bucketName}/objects?${params}`);
          if (!response.ok) throw new Error('Failed to prefetch objects');
          return response.json();
        },
        { ttl: DEFAULT_TTL.OBJECTS }
      );
    }
  };

  // Prefetch function for metadata
  const handleFileHover = (object: StorageObject) => {
    if (!object.isFolder) {
      const cacheKey = createCacheKey('metadata', bucketName, credentialId, object.key);
      if (!cacheManager.get(cacheKey)) {
        cacheManager.prefetch<ObjectMetadata>(
          cacheKey,
          async () => {
            const response = await fetch(
              `/api/buckets/${bucketName}/metadata?credentialId=${credentialId}&key=${encodeURIComponent(object.key)}`
            );
            if (!response.ok) throw new Error('Failed to prefetch metadata');
            return response.json();
          },
          { ttl: DEFAULT_TTL.METADATA }
        );
      }
    }
  };

  const loadObjects = async () => {
    await refetchObjects();
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
        // Invalidate cache for all objects in this bucket/credential (including root folder)
        const baseKey = createCacheKey('objects', bucketName, credentialId);
        const escapedBaseKey = baseKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Match exact baseKey OR baseKey followed by colon and anything
        cacheManager.invalidatePattern(new RegExp(`^${escapedBaseKey}(:.*)?$`));
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
    const filesToUpload = Array.from(files);
    
    // Initialize progress tracking for all files
    const initialProgress: FileProgress[] = filesToUpload.map((file, index) => ({
      id: `upload-${Date.now()}-${index}`,
      filename: file.name,
      progress: 0,
      status: 'pending' as const,
      size: file.size,
      loaded: 0,
      type: 'upload' as const,
    }));
    
    setFileProgress((prev) => [...prev, ...initialProgress]);

    // Upload files concurrently (max 5 at a time)
    const maxConcurrent = 5;
    const uploadQueue = [...filesToUpload];
    const activeUploads: Promise<void>[] = [];

    const uploadFile = async (file: File, progressItem: FileProgress) => {
      const abortController = new AbortController();
      setAbortControllers((prev) => new Map(prev).set(progressItem.id, abortController));

      try {
        // Update status to uploading
        setFileProgress((prev) =>
          prev.map((item) =>
            item.id === progressItem.id ? { ...item, status: 'uploading' as const } : item
          )
        );

        const formData = new FormData();
        formData.append('file', file);
        formData.append('key', currentPrefix + file.name);

        // Create XMLHttpRequest for progress tracking
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();

          // Track upload progress
          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              const percentComplete = Math.round((e.loaded / e.total) * 100);
              setFileProgress((prev) =>
                prev.map((item) =>
                  item.id === progressItem.id
                    ? { ...item, progress: percentComplete, loaded: e.loaded }
                    : item
                )
              );
            }
          });

          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              setFileProgress((prev) =>
                prev.map((item) =>
                  item.id === progressItem.id
                    ? { ...item, status: 'completed' as const, progress: 100, loaded: file.size }
                    : item
                )
              );
              resolve();
            } else {
              let errorMessage = 'Upload failed';
              try {
                const response = JSON.parse(xhr.responseText);
                errorMessage = response.error || errorMessage;
              } catch (e) {
                // Ignore JSON parse errors
              }
              setFileProgress((prev) =>
                prev.map((item) =>
                  item.id === progressItem.id
                    ? { ...item, status: 'error' as const, error: errorMessage }
                    : item
                )
              );
              reject(new Error(errorMessage));
            }
          });

          xhr.addEventListener('error', () => {
            setFileProgress((prev) =>
              prev.map((item) =>
                item.id === progressItem.id
                  ? { ...item, status: 'error' as const, error: 'Network error' }
                  : item
              )
            );
            reject(new Error('Network error'));
          });

          xhr.addEventListener('abort', () => {
            setFileProgress((prev) =>
              prev.map((item) =>
                item.id === progressItem.id
                  ? { ...item, status: 'error' as const, error: 'Upload cancelled' }
                  : item
              )
            );
            reject(new Error('Upload cancelled'));
          });

          abortController.signal.addEventListener('abort', () => {
            xhr.abort();
          });

          xhr.open('POST', `/api/buckets/${bucketName}/objects?credentialId=${credentialId}`);
          xhr.send(formData);
        });
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
      } finally {
        setAbortControllers((prev) => {
          const newMap = new Map(prev);
          newMap.delete(progressItem.id);
          return newMap;
        });
      }
    };

    // Process uploads with concurrency limit
    while (uploadQueue.length > 0 || activeUploads.length > 0) {
      // Fill up to max concurrent uploads
      while (activeUploads.length < maxConcurrent && uploadQueue.length > 0) {
        const file = uploadQueue.shift()!;
        const progressItem = initialProgress[filesToUpload.indexOf(file)];
        const uploadPromise = uploadFile(file, progressItem);
        activeUploads.push(uploadPromise);
      }

      // Wait for at least one upload to complete
      if (activeUploads.length > 0) {
        await Promise.race(activeUploads);
        // Remove completed uploads
        const completedIndices: number[] = [];
        for (let i = 0; i < activeUploads.length; i++) {
          const settled = await Promise.allSettled([activeUploads[i]]);
          if (settled[0].status === 'fulfilled' || settled[0].status === 'rejected') {
            completedIndices.push(i);
          }
        }
        for (let i = completedIndices.length - 1; i >= 0; i--) {
          activeUploads.splice(completedIndices[i], 1);
        }
      }
    }

    setUploadingFile(false);
    event.target.value = '';
    // Invalidate cache for all objects in this bucket/credential (including root folder)
    const baseKey = createCacheKey('objects', bucketName, credentialId);
    const escapedBaseKey = baseKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Match exact baseKey OR baseKey followed by colon and anything
    cacheManager.invalidatePattern(new RegExp(`^${escapedBaseKey}(:.*)?$`));
    await loadObjects();
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
        // Invalidate cache for all objects in this bucket/credential (including root folder)
        const baseKey = createCacheKey('objects', bucketName, credentialId);
        const escapedBaseKey = baseKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Match exact baseKey OR baseKey followed by colon and anything
        cacheManager.invalidatePattern(new RegExp(`^${escapedBaseKey}(:.*)?$`));
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

  const handleBulkDownload = async () => {
    if (selectedFiles.size === 0) return;

    // Filter out folders - only download files
    const filesToDownload = Array.from(selectedFiles).filter((key) => {
      const obj = objects.find((o) => o.key === key);
      return obj && !obj.isFolder;
    });

    if (filesToDownload.length === 0) {
      alert('No files selected. Folders cannot be downloaded.');
      return;
    }

    if (filesToDownload.length > 20) {
      if (
        !confirm(
          `You are about to download ${filesToDownload.length} files. This may take a while. Continue?`
        )
      ) {
        return;
      }
    }

    // Initialize progress tracking for all files
    const initialProgress: FileProgress[] = filesToDownload.map((key, index) => {
      const obj = objects.find((o) => o.key === key);
      return {
        id: `download-${Date.now()}-${index}`,
        filename: key.split('/').pop() || 'download',
        progress: 0,
        status: 'pending' as const,
        size: obj?.size,
        loaded: 0,
        type: 'download' as const,
      };
    });

    setFileProgress((prev) => [...prev, ...initialProgress]);

    // Download files concurrently (max 3 at a time to avoid browser limits)
    const maxConcurrent = 3;
    const downloadQueue = [...filesToDownload];
    const activeDownloads: Promise<void>[] = [];

    const downloadFile = async (key: string, progressItem: FileProgress) => {
      const abortController = new AbortController();
      setAbortControllers((prev) => new Map(prev).set(progressItem.id, abortController));

      try {
        // Update status to downloading
        setFileProgress((prev) =>
          prev.map((item) =>
            item.id === progressItem.id ? { ...item, status: 'downloading' as const } : item
          )
        );

        // Use fetch with progress tracking
        const response = await fetch(
          `/api/buckets/${bucketName}/download?credentialId=${credentialId}&key=${encodeURIComponent(key)}`,
          { signal: abortController.signal }
        );

        if (!response.ok) {
          throw new Error(`Download failed: ${response.statusText}`);
        }

        const contentLength = response.headers.get('content-length');
        const total = contentLength ? parseInt(contentLength, 10) : progressItem.size || 0;

        // Read the response stream with progress tracking
        const reader = response.body?.getReader();
        const chunks: BlobPart[] = [];
        let loaded = 0;

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            chunks.push(value);
            loaded += value.length;

            const percentComplete = total > 0 ? Math.round((loaded / total) * 100) : 0;
            setFileProgress((prev) =>
              prev.map((item) =>
                item.id === progressItem.id
                  ? { ...item, progress: percentComplete, loaded, size: total }
                  : item
              )
            );
          }
        }

        // Create blob and download
        const blob = new Blob(chunks);
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = progressItem.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        setFileProgress((prev) =>
          prev.map((item) =>
            item.id === progressItem.id
              ? { ...item, status: 'completed' as const, progress: 100, loaded: total }
              : item
          )
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Download failed';
        console.error(`Error downloading ${key}:`, error);
        setFileProgress((prev) =>
          prev.map((item) =>
            item.id === progressItem.id
              ? { ...item, status: 'error' as const, error: errorMessage }
              : item
          )
        );
      } finally {
        setAbortControllers((prev) => {
          const newMap = new Map(prev);
          newMap.delete(progressItem.id);
          return newMap;
        });
      }
    };

    // Process downloads with concurrency limit
    while (downloadQueue.length > 0 || activeDownloads.length > 0) {
      // Fill up to max concurrent downloads
      while (activeDownloads.length < maxConcurrent && downloadQueue.length > 0) {
        const key = downloadQueue.shift()!;
        const progressItem = initialProgress[filesToDownload.indexOf(key)];
        const downloadPromise = downloadFile(key, progressItem);
        activeDownloads.push(downloadPromise);
      }

      // Wait for at least one download to complete
      if (activeDownloads.length > 0) {
        await Promise.race(activeDownloads);
        // Remove completed downloads
        const completedIndices: number[] = [];
        for (let i = 0; i < activeDownloads.length; i++) {
          const settled = await Promise.allSettled([activeDownloads[i]]);
          if (settled[0].status === 'fulfilled' || settled[0].status === 'rejected') {
            completedIndices.push(i);
          }
        }
        for (let i = completedIndices.length - 1; i >= 0; i--) {
          activeDownloads.splice(completedIndices[i], 1);
        }
      }
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
    setIsEditingMetadata(false);
    if (object.isFolder) {
      setObjectMetadata(null);
      return;
    }

    // Check cache first
    const metadataCacheKey = createCacheKey('metadata', bucketName, credentialId, object.key);
    const cached = cacheManager.get<ObjectMetadata>(metadataCacheKey, {
      ttl: DEFAULT_TTL.METADATA,
    });

    if (cached) {
      setObjectMetadata(cached);
      return;
    }

    try {
      const response = await fetch(
        `/api/buckets/${bucketName}/metadata?credentialId=${credentialId}&key=${encodeURIComponent(object.key)}`
      );
      if (!response.ok) throw new Error('Failed to fetch metadata');
      const data = await response.json();
      cacheManager.set(metadataCacheKey, data, { ttl: DEFAULT_TTL.METADATA });
      setObjectMetadata(data);
    } catch (error) {
      console.error('Error loading object metadata:', error);
    }
  };

  const startEditingMetadata = () => {
    if (!objectMetadata) return;
    setEditedMetadata(objectMetadata.metadata || {});
    setEditedTags(objectMetadata.tags || {});
    setEditedStorageClass(objectMetadata.storageClass || '');
    setEditedContentType(objectMetadata.contentType || '');
    setIsEditingMetadata(true);
  };

  const cancelEditingMetadata = () => {
    setIsEditingMetadata(false);
    setEditedMetadata({});
    setEditedTags({});
    setEditedStorageClass('');
    setEditedContentType('');
  };

  const saveMetadata = async () => {
    if (!selectedObject || !objectMetadata) return;

    setSavingMetadata(true);
    try {
      const response = await fetch(`/api/buckets/${bucketName}/metadata/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentialId,
          key: selectedObject.key,
          metadata: editedMetadata,
          tags: editedTags,
          storageClass: editedStorageClass || undefined,
          contentType: editedContentType || undefined,
        }),
      });

      if (response.ok) {
        setIsEditingMetadata(false);
        // Invalidate metadata cache
        const metadataCacheKey = createCacheKey('metadata', bucketName, credentialId, selectedObject.key);
        cacheManager.invalidate(metadataCacheKey, { ttl: DEFAULT_TTL.METADATA });
        // Also invalidate analytics cache since metadata changes might affect analytics
        cacheManager.invalidatePattern(/^analytics:.*/);
        // Reload metadata
        await viewObjectMetadata(selectedObject);
        alert('Metadata updated successfully');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error saving metadata:', error);
      alert('Failed to save metadata');
    } finally {
      setSavingMetadata(false);
    }
  };

  const addMetadataField = () => {
    const key = prompt('Enter metadata key:');
    if (key && key.trim()) {
      setEditedMetadata({ ...editedMetadata, [key.trim()]: '' });
    }
  };

  const removeMetadataField = (key: string) => {
    const newMetadata = { ...editedMetadata };
    delete newMetadata[key];
    setEditedMetadata(newMetadata);
  };

  const addTagField = () => {
    const key = prompt('Enter tag key:');
    if (key && key.trim()) {
      setEditedTags({ ...editedTags, [key.trim()]: '' });
    }
  };

  const removeTagField = (key: string) => {
    const newTags = { ...editedTags };
    delete newTags[key];
    setEditedTags(newTags);
  };

  const handleCancelTransfer = (id: string) => {
    const controller = abortControllers.get(id);
    if (controller) {
      controller.abort();
    }
  };

  const handleCloseProgressTracker = () => {
    // Only allow closing if no active transfers
    const hasActiveTransfers = fileProgress.some(
      (item) => item.status === 'uploading' || item.status === 'downloading' || item.status === 'pending'
    );
    if (!hasActiveTransfers) {
      setFileProgress([]);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileExtension = (key: string): string => {
    const fileName = key.split('/').filter(Boolean).pop() || '';
    const parts = fileName.split('.');
    return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : '';
  };

  const getFileType = (key: string): string => {
    const ext = getFileExtension(key);
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'];
    const videoExts = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'];
    const audioExts = ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'];
    const documentExts = ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'];
    const codeExts = ['js', 'ts', 'tsx', 'jsx', 'py', 'java', 'cpp', 'c', 'h', 'cs', 'go', 'rs', 'rb', 'php'];
    const archiveExts = ['zip', 'tar', 'gz', 'rar', '7z', 'bz2'];

    if (imageExts.includes(ext)) return 'image';
    if (videoExts.includes(ext)) return 'video';
    if (audioExts.includes(ext)) return 'audio';
    if (documentExts.includes(ext)) return 'document';
    if (codeExts.includes(ext)) return 'code';
    if (archiveExts.includes(ext)) return 'archive';
    return 'other';
  };

  const filteredObjects = objects.filter((object) => {
    // Skip filtering for folders if in current directory view
    if (object.isFolder && !searchQuery) return true;

    // Search filter
    const objectName = object.key.split('/').filter(Boolean).pop()?.toLowerCase() || '';
    if (searchQuery && !objectName.includes(searchQuery.toLowerCase())) {
      return false;
    }

    // File type filter
    if (fileTypeFilter !== 'all' && !object.isFolder) {
      const fileType = getFileType(object.key);
      if (fileType !== fileTypeFilter) return false;
    }

    // Size filter
    if (!object.isFolder && (object.size < sizeFilter.min || object.size > sizeFilter.max)) {
      return false;
    }

    // Date filter
    if (!object.isFolder && dateFilter.start) {
      const objDate = new Date(object.lastModified);
      const startDate = new Date(dateFilter.start);
      if (objDate < startDate) return false;
    }
    if (!object.isFolder && dateFilter.end) {
      const objDate = new Date(object.lastModified);
      const endDate = new Date(dateFilter.end);
      endDate.setHours(23, 59, 59, 999); // Include the entire end date
      if (objDate > endDate) return false;
    }

    return true;
  });

  const hasActiveFilters = 
    searchQuery !== '' || 
    fileTypeFilter !== 'all' || 
    sizeFilter.min > 0 || 
    sizeFilter.max < Infinity ||
    dateFilter.start !== '' ||
    dateFilter.end !== '';

  const clearAllFilters = () => {
    setSearchQuery('');
    setFileTypeFilter('all');
    setSizeFilter({ min: 0, max: Infinity });
    setDateFilter({ start: '', end: '' });
  };

  const breadcrumbs = currentPrefix
    .split('/')
    .filter(Boolean)
    .map((part, index, array) => ({
      name: part,
      path: array.slice(0, index + 1).join('/') + '/',
    }));

  return (
    <>
      <ProgressTracker
        items={fileProgress}
        onClose={handleCloseProgressTracker}
        onCancel={handleCancelTransfer}
      />
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
              <>
                <button
                  onClick={handleBulkDownload}
                  className="inline-flex items-center rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
                >
                  <svg
                    className="mr-1.5 h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  Download ({selectedFiles.size})
                </button>
                <button
                  onClick={handleDeleteSelected}
                  className="inline-flex items-center rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
                >
                  <svg
                    className="mr-1.5 h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  Delete ({selectedFiles.size})
                </button>
              </>
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

        {/* Search and Filter Section */}
        <div className="mt-4 space-y-3">
          {/* Search bar */}
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
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
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search files and folders..."
                className="block w-full rounded-md border-gray-300 py-2 pl-10 pr-3 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white sm:text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                >
                  <svg
                    className="h-4 w-4 text-gray-400 hover:text-gray-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center rounded-md px-4 py-2 text-sm font-medium shadow-sm ${
                showFilters || hasActiveFilters
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              <svg
                className="mr-2 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              Filters
              {hasActiveFilters && (
                <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-blue-600">
                  !
                </span>
              )}
            </button>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="inline-flex items-center rounded-md bg-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Results count */}
          {objects.length > 0 && (
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>
                Showing {filteredObjects.length} of {objects.length} item(s)
                {hasActiveFilters && ' (filtered)'}
              </span>
              <div className="flex items-center gap-3">
                <LastUpdated timestamp={lastUpdated} />
                <button
                  onClick={() => refetchObjects()}
                  disabled={loading}
                  className="inline-flex items-center rounded-md bg-white px-2 py-1 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  title="Refresh data"
                >
                  <svg
                    className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Filter panel */}
          {showFilters && (
            <div className="rounded-md border border-gray-300 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {/* File Type Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    File Type
                  </label>
                  <select
                    value={fileTypeFilter}
                    onChange={(e) => setFileTypeFilter(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white sm:text-sm"
                  >
                    <option value="all">All Types</option>
                    <option value="image">Images</option>
                    <option value="video">Videos</option>
                    <option value="audio">Audio</option>
                    <option value="document">Documents</option>
                    <option value="code">Code</option>
                    <option value="archive">Archives</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Size Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Size Range
                  </label>
                  <select
                    value={
                      sizeFilter.min === 0 && sizeFilter.max === Infinity
                        ? 'all'
                        : sizeFilter.max === 1024 * 1024
                          ? 'small'
                          : sizeFilter.max === 100 * 1024 * 1024
                            ? 'medium'
                            : 'large'
                    }
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === 'all') setSizeFilter({ min: 0, max: Infinity });
                      else if (value === 'small') setSizeFilter({ min: 0, max: 1024 * 1024 }); // < 1MB
                      else if (value === 'medium')
                        setSizeFilter({ min: 1024 * 1024, max: 100 * 1024 * 1024 }); // 1MB - 100MB
                      else setSizeFilter({ min: 100 * 1024 * 1024, max: Infinity }); // > 100MB
                    }}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white sm:text-sm"
                  >
                    <option value="all">All Sizes</option>
                    <option value="small">&lt; 1 MB</option>
                    <option value="medium">1 MB - 100 MB</option>
                    <option value="large">&gt; 100 MB</option>
                  </select>
                </div>

                {/* Date Range Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Modified Date
                  </label>
                  <div className="mt-1 flex space-x-2">
                    <input
                      type="date"
                      value={dateFilter.start}
                      onChange={(e) => setDateFilter({ ...dateFilter, start: e.target.value })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white sm:text-sm"
                    />
                    <span className="flex items-center text-gray-500">to</span>
                    <input
                      type="date"
                      value={dateFilter.end}
                      onChange={(e) => setDateFilter({ ...dateFilter, end: e.target.value })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white sm:text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
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
            ) : filteredObjects.length === 0 ? (
              <div className="p-12 text-center">
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
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No results found</p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Try adjusting your search or filters to find what you're looking for.
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={clearAllFilters}
                    className="mt-4 inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            ) : (
              <VirtualizedObjectList
                objects={filteredObjects}
                selectedFiles={selectedFiles}
                selectedObject={selectedObject}
                onToggleFileSelection={toggleFileSelection}
                onNavigateToFolder={navigateToFolder}
                onViewObjectMetadata={viewObjectMetadata}
                formatBytes={formatBytes}
                showNavigateUp={!!currentPrefix}
                onNavigateUp={navigateUp}
                onFolderHover={handleFolderHover}
                onFileHover={handleFileHover}
              />
            )}
          </div>
        </div>

        {/* Metadata panel */}
        <div className="lg:col-span-1">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Details</h3>
              {selectedObject && !selectedObject.isFolder && !isEditingMetadata && (
                <button
                  onClick={startEditingMetadata}
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  Edit
                </button>
              )}
            </div>
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
                    {/* Editable fields */}
                    {isEditingMetadata ? (
                      <>
                        {/* Storage Class Editor */}
                        <div>
                          <label className="block text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                            Storage Class
                          </label>
                          <select
                            value={editedStorageClass}
                            onChange={(e) => setEditedStorageClass(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                          >
                            <option value="">Default</option>
                            <option value="STANDARD">Standard</option>
                            <option value="STANDARD_IA">Standard-IA</option>
                            <option value="INTELLIGENT_TIERING">Intelligent-Tiering</option>
                            <option value="ONEZONE_IA">One Zone-IA</option>
                            <option value="GLACIER">Glacier</option>
                            <option value="GLACIER_IR">Glacier Instant Retrieval</option>
                            <option value="DEEP_ARCHIVE">Glacier Deep Archive</option>
                          </select>
                        </div>

                        {/* Content Type Editor */}
                        <div>
                          <label className="block text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                            Content Type
                          </label>
                          <input
                            type="text"
                            value={editedContentType}
                            onChange={(e) => setEditedContentType(e.target.value)}
                            placeholder="e.g., text/plain, image/jpeg"
                            className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                          />
                        </div>

                        {/* Custom Metadata Editor */}
                        <div>
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                              Custom Metadata
                            </p>
                            <button
                              onClick={addMetadataField}
                              className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                            >
                              + Add
                            </button>
                          </div>
                          <div className="mt-2 space-y-2">
                            {Object.entries(editedMetadata).map(([key, value]) => (
                              <div key={key} className="flex items-center space-x-2">
                                <input
                                  type="text"
                                  value={key}
                                  disabled
                                  className="block w-1/3 rounded-md border-gray-300 bg-gray-100 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
                                />
                                <input
                                  type="text"
                                  value={value}
                                  onChange={(e) =>
                                    setEditedMetadata({ ...editedMetadata, [key]: e.target.value })
                                  }
                                  className="block flex-1 rounded-md border-gray-300 text-xs shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                />
                                <button
                                  onClick={() => removeMetadataField(key)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M6 18L18 6M6 6l12 12"
                                    />
                                  </svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Tags Editor */}
                        <div>
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                              Tags
                            </p>
                            <button
                              onClick={addTagField}
                              className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                            >
                              + Add
                            </button>
                          </div>
                          <div className="mt-2 space-y-2">
                            {Object.entries(editedTags).map(([key, value]) => (
                              <div key={key} className="flex items-center space-x-2">
                                <input
                                  type="text"
                                  value={key}
                                  disabled
                                  className="block w-1/3 rounded-md border-gray-300 bg-gray-100 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
                                />
                                <input
                                  type="text"
                                  value={value}
                                  onChange={(e) =>
                                    setEditedTags({ ...editedTags, [key]: e.target.value })
                                  }
                                  className="block flex-1 rounded-md border-gray-300 text-xs shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                />
                                <button
                                  onClick={() => removeTagField(key)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M6 18L18 6M6 6l12 12"
                                    />
                                  </svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Save/Cancel buttons */}
                        <div className="flex space-x-2">
                          <button
                            onClick={saveMetadata}
                            disabled={savingMetadata}
                            className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                          >
                            {savingMetadata ? 'Saving...' : 'Save Changes'}
                          </button>
                          <button
                            onClick={cancelEditingMetadata}
                            disabled={savingMetadata}
                            className="flex-1 rounded-md bg-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-400 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-300"
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Read-only view */}
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
                                Custom Metadata
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
                        {objectMetadata?.tags &&
                          Object.keys(objectMetadata.tags).length > 0 && (
                            <div>
                              <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                                Tags
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {Object.entries(objectMetadata.tags).map(([key, value]) => (
                                  <span
                                    key={key}
                                    className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                  >
                                    {key}: {value}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                      </>
                    )}
                    
                    {/* Download button - show in view mode only */}
                    {!isEditingMetadata && (
                      <div>
                        <a
                          href={`/api/buckets/${bucketName}/download?credentialId=${credentialId}&key=${encodeURIComponent(selectedObject.key)}`}
                          className="inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                        >
                          Download
                        </a>
                      </div>
                    )}
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
    </>
  );
}
