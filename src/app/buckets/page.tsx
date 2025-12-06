'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { StorageProvider } from '@/lib/types/credentials';
import type { FileProgress } from '@/components/ProgressTracker';
import { useCachedFetch, createCacheKey, DEFAULT_TTL } from '@/lib/utils/use-cached-fetch';
import { cacheManager } from '@/lib/utils/cache';
import { LastUpdated } from '@/components/LastUpdated';
import { useKeyboardShortcuts, KeyboardShortcut } from '@/lib/utils/use-keyboard-shortcuts';
import { useShortcuts } from '@/components/ShortcutsContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Package, RefreshCw, FolderPlus, Upload, Search, Filter, X, Download } from 'lucide-react';

// Lazy load heavy components
const ProgressTracker = dynamic(
  () => import('@/components/ProgressTracker').then((mod) => mod.ProgressTracker),
  { ssr: false }
);

const VirtualizedObjectList = dynamic(
  () => import('@/components/VirtualizedObjectList').then((mod) => mod.VirtualizedObjectList),
  { ssr: false }
);

const FilePreview = dynamic(
  () => import('@/components/FilePreview').then((mod) => mod.FilePreview),
  { ssr: false }
);

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

  // Reset to page 1 and clear selected bucket when credential changes
  useEffect(() => {
    setCurrentPage(1);
    setSelectedBucket('');
  }, [selectedCredentialId, buckets.length]);

  if (credentialsLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-muted-foreground">Loading credentials...</p>
        </div>
      </div>
    );
  }

  if (credentials.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold">No credentials found</h2>
          <p className="mt-2 text-muted-foreground">
            Please add a credential first to browse your buckets.
          </p>
          <div className="mt-6">
            <Button asChild>
              <a href="/credentials">Add Credential</a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Buckets</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Browse and manage your cloud storage buckets
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0">
          <Select value={selectedCredentialId} onValueChange={setSelectedCredentialId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select credential" />
            </SelectTrigger>
            <SelectContent>
              {credentials.map((cred) => (
                <SelectItem key={cred.id} value={cred.id}>
                  {cred.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-8">
        {buckets.length > 0 && !bucketsLoading && (
          <div className="mb-4 flex items-center justify-end gap-3">
            <LastUpdated timestamp={bucketsLastUpdated} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchBuckets()}
              disabled={bucketsLoading}
              title="Refresh buckets"
            >
              <RefreshCw className={`h-4 w-4 ${bucketsLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        )}
        {loading ? (
          <div className="text-center">
            <p className="text-muted-foreground">Loading buckets...</p>
          </div>
        ) : buckets.length === 0 ? (
          <Card className="p-12 text-center">
            <CardHeader>
              <CardTitle>No buckets found</CardTitle>
              <CardDescription>
                No buckets found for the selected credential.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {paginatedBuckets.map((bucket) => (
              <Card
                key={bucket.name}
                className={`cursor-pointer transition-all hover:border-primary hover:shadow-md ${
                  selectedBucket === bucket.name
                    ? 'border-primary bg-primary/5'
                    : ''
                }`}
                onClick={() => setSelectedBucket(bucket.name)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Package className="h-8 w-8 text-primary" />
                    <h3 className="ml-3 text-lg font-semibold">
                      {bucket.name}
                    </h3>
                  </div>
                  {bucket.region && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Region: {bucket.region}
                    </p>
                  )}
                  {bucket.creationDate && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Created: {new Date(bucket.creationDate).toLocaleDateString()}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between border-t px-4 py-3 sm:px-6">
              <div className="flex flex-1 justify-between sm:hidden">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <p className="text-sm">
                    Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(endIndex, buckets.length)}</span> of{' '}
                    <span className="font-medium">{buckets.length}</span> bucket{buckets.length !== 1 ? 's' : ''}
                  </p>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="items-per-page" className="text-sm">
                      Per page:
                    </Label>
                    <Select
                      value={itemsPerPage.toString()}
                      onValueChange={(value) => {
                        setItemsPerPage(Number(value));
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger id="items-per-page" className="w-[80px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="6">6</SelectItem>
                        <SelectItem value="12">12</SelectItem>
                        <SelectItem value="24">24</SelectItem>
                        <SelectItem value="48">48</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="rounded-r-none"
                    >
                      <span className="sr-only">Previous</span>
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </Button>
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
                            className="relative inline-flex items-center border px-4 py-2 text-sm font-medium"
                          >
                            ...
                          </span>
                        );
                      }

                      if (!showPage) return null;

                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? 'default' : 'outline'}
                          onClick={() => setCurrentPage(page)}
                          className="rounded-none border-l-0"
                        >
                          {page}
                        </Button>
                      );
                    })}
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="rounded-l-none"
                    >
                      <span className="sr-only">Next</span>
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </Button>
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

  // Keyboard shortcuts context
  const { showHelp, hideHelp } = useShortcuts();

  // Keyboard navigation in object list
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  // File preview state
  const [previewFile, setPreviewFile] = useState<StorageObject | null>(null);

  // Refs for triggering file uploads
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  const isFilePreviewable = (key: string): boolean => {
    const ext = getFileExtension(key);
    const previewableExts = [
      // Images
      'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico',
      // Text files
      'txt', 'json', 'xml', 'html', 'htm', 'css', 'js', 'ts', 'tsx', 'jsx',
      'md', 'yaml', 'yml', 'csv', 'log', 'py', 'java', 'cpp', 'c', 'h',
      'cs', 'go', 'rs', 'rb', 'php', 'sh', 'bash',
    ];
    return previewableExts.includes(ext);
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

  // Reset focused index when objects change
  useEffect(() => {
    setFocusedIndex(-1);
  }, [filteredObjects.length, currentPrefix]);

  // Get the item count including the "Navigate Up" button if shown
  const totalItemCount = filteredObjects.length + (currentPrefix ? 1 : 0);

  // Helper to get the object at focused index
  const getFocusedObject = () => {
    if (focusedIndex < 0) return null;
    
    // If "Navigate Up" is shown and focused index is 0, return null (it's the up button)
    if (currentPrefix && focusedIndex === 0) return null;
    
    const objectIndex = currentPrefix ? focusedIndex - 1 : focusedIndex;
    return filteredObjects[objectIndex] || null;
  };

  // Keyboard shortcuts for object browser actions
  const objectBrowserShortcuts: KeyboardShortcut[] = [
    {
      key: 'u',
      description: 'Upload files',
      action: () => {
        if (!uploadingFile) {
          fileInputRef.current?.click();
        }
      },
    },
    {
      key: 'n',
      description: 'Create new folder',
      action: () => {
        if (!showCreateFolder) {
          setShowCreateFolder(true);
        }
      },
    },
    {
      key: 'r',
      description: 'Refresh objects',
      action: () => {
        loadObjects();
      },
    },
    {
      key: '/',
      description: 'Focus search',
      action: () => {
        searchInputRef.current?.focus();
      },
      ignoreInInput: false,
    },
    {
      key: 'Escape',
      description: 'Cancel/Close',
      action: () => {
        if (showCreateFolder) {
          setShowCreateFolder(false);
          setNewFolderName('');
        } else if (isEditingMetadata) {
          cancelEditingMetadata();
        } else {
          hideHelp();
        }
      },
      ignoreInInput: false,
    },
    {
      key: 'Backspace',
      description: 'Navigate up to parent folder',
      action: () => {
        if (currentPrefix) {
          navigateUp();
        }
      },
    },
    {
      key: 'ArrowDown',
      description: 'Navigate down in object list',
      action: () => {
        if (totalItemCount > 0) {
          setFocusedIndex((prev) => Math.min(prev + 1, totalItemCount - 1));
        }
      },
      ignoreInInput: false,
    },
    {
      key: 'ArrowUp',
      description: 'Navigate up in object list',
      action: () => {
        if (totalItemCount > 0) {
          setFocusedIndex((prev) => (prev <= 0 ? 0 : prev - 1));
        }
      },
      ignoreInInput: false,
    },
    {
      key: 'Enter',
      description: 'Open focused folder or view file metadata',
      action: () => {
        // If focused on "Navigate Up" button
        if (currentPrefix && focusedIndex === 0) {
          navigateUp();
          return;
        }

        const focusedObject = getFocusedObject();
        if (focusedObject) {
          if (focusedObject.isFolder) {
            navigateToFolder(focusedObject.key);
          } else {
            viewObjectMetadata(focusedObject);
          }
        }
      },
      ignoreInInput: false,
    },
    {
      key: ' ',
      description: 'Toggle selection of focused item',
      action: () => {
        const focusedObject = getFocusedObject();
        if (focusedObject) {
          toggleFileSelection(focusedObject.key);
        }
      },
      ignoreInInput: false,
    },
    {
      key: 'Home',
      description: 'Jump to first item in list',
      action: () => {
        if (totalItemCount > 0) {
          setFocusedIndex(0);
        }
      },
      ignoreInInput: false,
    },
    {
      key: 'End',
      description: 'Jump to last item in list',
      action: () => {
        if (totalItemCount > 0) {
          setFocusedIndex(totalItemCount - 1);
        }
      },
      ignoreInInput: false,
    },
    {
      key: '?',
      shiftKey: true,
      description: 'Show shortcuts help',
      action: () => showHelp(),
      ignoreInInput: false,
    },
    {
      key: 'p',
      description: 'Preview selected file',
      action: () => {
        if (selectedObject && !selectedObject.isFolder && isFilePreviewable(selectedObject.key)) {
          setPreviewFile(selectedObject);
        }
      },
    },
  ];

  useKeyboardShortcuts(objectBrowserShortcuts, true);

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
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              variant="link"
              onClick={() => setCurrentPrefix('')}
              className="h-auto p-0 text-sm"
            >
              {bucketName}
            </Button>
            {breadcrumbs.map((crumb) => (
              <div key={crumb.path} className="flex items-center space-x-2">
                <span className="text-muted-foreground">/</span>
                <Button
                  variant="link"
                  onClick={() => navigateToFolder(crumb.path)}
                  className="h-auto p-0 text-sm"
                >
                  {crumb.name}
                </Button>
              </div>
            ))}
          </div>

          <div className="flex items-center space-x-2">
            {selectedFiles.size > 0 && (
              <>
                <Button
                  onClick={handleBulkDownload}
                  variant="default"
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Download className="mr-1.5 h-4 w-4" />
                  Download ({selectedFiles.size})
                </Button>
                <Button
                  onClick={handleDeleteSelected}
                  variant="destructive"
                  size="sm"
                >
                  <X className="mr-1.5 h-4 w-4" />
                  Delete ({selectedFiles.size})
                </Button>
              </>
            )}
            <Button
              onClick={() => setShowCreateFolder(true)}
              variant="secondary"
              size="sm"
            >
              <FolderPlus className="mr-1.5 h-4 w-4" />
              New Folder
            </Button>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFile}
              size="sm"
            >
              <Upload className="mr-1.5 h-4 w-4" />
              {uploadingFile ? 'Uploading...' : 'Upload Files'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileUpload}
              disabled={uploadingFile}
              className="hidden"
            />
          </div>
            </div>
          </CardContent>
        </Card>

        {/* Folder creation form */}
        {showCreateFolder && (
          <Card className="mt-4">
            <CardContent className="p-4">
              <Label htmlFor="folder-name">Folder Name</Label>
              <div className="mt-2 flex space-x-2">
                <Input
                  id="folder-name"
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Enter folder name"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') createFolder();
                    if (e.key === 'Escape') {
                      setShowCreateFolder(false);
                      setNewFolderName('');
                    }
                  }}
                />
                <Button onClick={createFolder}>Create</Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateFolder(false);
                    setNewFolderName('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search and Filter Section */}
        <div className="mt-4 space-y-3">
          {/* Search bar */}
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search files and folders..."
                className="pl-10"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-1/2 h-8 w-8 -translate-y-1/2"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant={showFilters || hasActiveFilters ? 'default' : 'outline'}
            >
              <Filter className="mr-2 h-4 w-4" />
              Filters
              {hasActiveFilters && (
                <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-background text-xs font-bold text-primary">
                  !
                </span>
              )}
            </Button>
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearAllFilters}>
                Clear All
              </Button>
            )}
          </div>

          {/* Results count */}
          {objects.length > 0 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Showing {filteredObjects.length} of {objects.length} item(s)
                {hasActiveFilters && ' (filtered)'}
              </span>
              <div className="flex items-center gap-3">
                <LastUpdated timestamp={lastUpdated} />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchObjects()}
                  disabled={loading}
                  title="Refresh data"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          )}

          {/* Filter panel */}
          {showFilters && (
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {/* File Type Filter */}
                  <div>
                    <Label htmlFor="file-type-filter">File Type</Label>
                    <Select value={fileTypeFilter} onValueChange={setFileTypeFilter}>
                      <SelectTrigger id="file-type-filter" className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="image">Images</SelectItem>
                        <SelectItem value="video">Videos</SelectItem>
                        <SelectItem value="audio">Audio</SelectItem>
                        <SelectItem value="document">Documents</SelectItem>
                        <SelectItem value="code">Code</SelectItem>
                        <SelectItem value="archive">Archives</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Size Filter */}
                  <div>
                    <Label htmlFor="size-filter">Size Range</Label>
                    <Select
                      value={
                        sizeFilter.min === 0 && sizeFilter.max === Infinity
                          ? 'all'
                          : sizeFilter.max === 1024 * 1024
                            ? 'small'
                            : sizeFilter.max === 100 * 1024 * 1024
                              ? 'medium'
                              : 'large'
                      }
                      onValueChange={(value) => {
                        if (value === 'all') setSizeFilter({ min: 0, max: Infinity });
                        else if (value === 'small') setSizeFilter({ min: 0, max: 1024 * 1024 });
                        else if (value === 'medium')
                          setSizeFilter({ min: 1024 * 1024, max: 100 * 1024 * 1024 });
                        else setSizeFilter({ min: 100 * 1024 * 1024, max: Infinity });
                      }}
                    >
                      <SelectTrigger id="size-filter" className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sizes</SelectItem>
                        <SelectItem value="small">&lt; 1 MB</SelectItem>
                        <SelectItem value="medium">1 MB - 100 MB</SelectItem>
                        <SelectItem value="large">&gt; 100 MB</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date Range Filter */}
                  <div>
                    <Label>Modified Date</Label>
                    <div className="mt-1 flex space-x-2">
                      <Input
                        type="date"
                        value={dateFilter.start}
                        onChange={(e) => setDateFilter({ ...dateFilter, start: e.target.value })}
                      />
                      <span className="flex items-center text-muted-foreground">to</span>
                      <Input
                        type="date"
                        value={dateFilter.end}
                        onChange={(e) => setDateFilter({ ...dateFilter, end: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Main content area */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Object list */}
        <div className="lg:col-span-2">
          <Card>
            {loading ? (
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground">Loading...</p>
              </CardContent>
            ) : objects.length === 0 ? (
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground">
                  {currentPrefix ? 'This folder is empty' : 'This bucket is empty'}
                </p>
              </CardContent>
            ) : filteredObjects.length === 0 ? (
              <CardContent className="p-12 text-center">
                <Search className="mx-auto h-12 w-12 text-muted-foreground" />
                <CardTitle className="mt-2">No results found</CardTitle>
                <CardDescription className="mt-1">
                  Try adjusting your search or filters to find what you're looking for.
                </CardDescription>
                {hasActiveFilters && (
                  <Button onClick={clearAllFilters} className="mt-4">
                    Clear All Filters
                  </Button>
                )}
              </CardContent>
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
                focusedIndex={focusedIndex}
                onFocusedIndexChange={setFocusedIndex}
              />
            )}
          </Card>
        </div>

        {/* Metadata panel */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Details</CardTitle>
                {selectedObject && !selectedObject.isFolder && !isEditingMetadata && (
                  <Button variant="link" onClick={startEditingMetadata} className="h-auto p-0 text-sm">
                    Edit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
            {selectedObject ? (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    Name
                  </p>
                  <p className="mt-1 break-all text-sm">
                    {selectedObject.key.split('/').filter(Boolean).pop()}
                  </p>
                </div>
                {!selectedObject.isFolder && (
                  <>
                    <div>
                      <p className="text-xs font-medium uppercase text-muted-foreground">
                        Size
                      </p>
                      <p className="mt-1 text-sm">
                        {formatBytes(selectedObject.size)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase text-muted-foreground">
                        Last Modified
                      </p>
                      <p className="mt-1 text-sm">
                        {new Date(selectedObject.lastModified).toLocaleString()}
                      </p>
                    </div>
                    {selectedObject.etag && (
                      <div>
                        <p className="text-xs font-medium uppercase text-muted-foreground">
                          ETag
                        </p>
                        <p className="mt-1 break-all text-sm">
                          {selectedObject.etag}
                        </p>
                      </div>
                    )}
                    {/* Editable fields */}
                    {isEditingMetadata ? (
                      <>
                        {/* Storage Class Editor */}
                        <div>
                          <Label className="text-xs font-medium uppercase">
                            Storage Class
                          </Label>
                          <Select
                            value={editedStorageClass}
                            onValueChange={setEditedStorageClass}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Default" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">Default</SelectItem>
                              <SelectItem value="STANDARD">Standard</SelectItem>
                              <SelectItem value="STANDARD_IA">Standard-IA</SelectItem>
                              <SelectItem value="INTELLIGENT_TIERING">Intelligent-Tiering</SelectItem>
                              <SelectItem value="ONEZONE_IA">One Zone-IA</SelectItem>
                              <SelectItem value="GLACIER">Glacier</SelectItem>
                              <SelectItem value="GLACIER_IR">Glacier Instant Retrieval</SelectItem>
                              <SelectItem value="DEEP_ARCHIVE">Glacier Deep Archive</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Content Type Editor */}
                        <div>
                          <Label className="text-xs font-medium uppercase">
                            Content Type
                          </Label>
                          <Input
                            type="text"
                            value={editedContentType}
                            onChange={(e) => setEditedContentType(e.target.value)}
                            placeholder="e.g., text/plain, image/jpeg"
                            className="mt-1"
                          />
                        </div>

                        {/* Custom Metadata Editor */}
                        <div>
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-medium uppercase">
                              Custom Metadata
                            </Label>
                            <Button
                              variant="link"
                              size="sm"
                              onClick={addMetadataField}
                              className="h-auto p-0 text-xs"
                            >
                              + Add
                            </Button>
                          </div>
                          <div className="mt-2 space-y-2">
                            {Object.entries(editedMetadata).map(([key, value]) => (
                              <div key={key} className="flex items-center space-x-2">
                                <Input
                                  type="text"
                                  value={key}
                                  disabled
                                  className="w-1/3 text-xs"
                                />
                                <Input
                                  type="text"
                                  value={value}
                                  onChange={(e) =>
                                    setEditedMetadata({ ...editedMetadata, [key]: e.target.value })
                                  }
                                  className="flex-1 text-xs"
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive"
                                  onClick={() => removeMetadataField(key)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Tags Editor */}
                        <div>
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-medium uppercase">
                              Tags
                            </Label>
                            <Button
                              variant="link"
                              size="sm"
                              onClick={addTagField}
                              className="h-auto p-0 text-xs"
                            >
                              + Add
                            </Button>
                          </div>
                          <div className="mt-2 space-y-2">
                            {Object.entries(editedTags).map(([key, value]) => (
                              <div key={key} className="flex items-center space-x-2">
                                <Input
                                  type="text"
                                  value={key}
                                  disabled
                                  className="w-1/3 text-xs"
                                />
                                <Input
                                  type="text"
                                  value={value}
                                  onChange={(e) =>
                                    setEditedTags({ ...editedTags, [key]: e.target.value })
                                  }
                                  className="flex-1 text-xs"
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive"
                                  onClick={() => removeTagField(key)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Save/Cancel buttons */}
                        <div className="flex space-x-2">
                          <Button
                            onClick={saveMetadata}
                            disabled={savingMetadata}
                            className="flex-1"
                          >
                            {savingMetadata ? 'Saving...' : 'Save Changes'}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={cancelEditingMetadata}
                            disabled={savingMetadata}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Read-only view */}
                        {selectedObject.storageClass && (
                          <div>
                            <p className="text-xs font-medium uppercase text-muted-foreground">
                              Storage Class
                            </p>
                            <p className="mt-1 text-sm">
                              {selectedObject.storageClass}
                            </p>
                          </div>
                        )}
                        {objectMetadata?.contentType && (
                          <div>
                            <p className="text-xs font-medium uppercase text-muted-foreground">
                              Content Type
                            </p>
                            <p className="mt-1 text-sm">
                              {objectMetadata.contentType}
                            </p>
                          </div>
                        )}
                        {objectMetadata?.metadata &&
                          Object.keys(objectMetadata.metadata).length > 0 && (
                            <div>
                              <p className="text-xs font-medium uppercase text-muted-foreground">
                                Custom Metadata
                              </p>
                              <div className="mt-2 space-y-2">
                                {Object.entries(objectMetadata.metadata).map(([key, value]) => (
                                  <Card key={key} className="p-2">
                                    <p className="text-xs font-medium">
                                      {key}
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                      {value}
                                    </p>
                                  </Card>
                                ))}
                              </div>
                            </div>
                          )}
                        {objectMetadata?.tags &&
                          Object.keys(objectMetadata.tags).length > 0 && (
                            <div>
                              <p className="text-xs font-medium uppercase text-muted-foreground">
                                Tags
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {Object.entries(objectMetadata.tags).map(([key, value]) => (
                                  <span
                                    key={key}
                                    className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                                  >
                                    {key}: {value}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                      </>
                    )}
                    
                    {/* Preview and Download buttons - show in view mode only */}
                    {!isEditingMetadata && (
                      <div className="space-y-2">
                        {isFilePreviewable(selectedObject.key) && (
                          <Button
                            onClick={() => setPreviewFile(selectedObject)}
                            className="w-full bg-green-600 hover:bg-green-700"
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
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                              />
                            </svg>
                            Preview
                          </Button>
                        )}
                        <Button
                          asChild
                          className="w-full"
                        >
                          <a
                            href={`/api/buckets/${bucketName}/download?credentialId=${credentialId}&key=${encodeURIComponent(selectedObject.key)}`}
                          >
                            <Download className="mr-1.5 h-4 w-4" />
                            Download
                          </a>
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Select an object to view its details
              </p>
            )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* File Preview Modal */}
      {previewFile && (
        <FilePreview
          bucketName={bucketName}
          objectKey={previewFile.key}
          credentialId={credentialId}
          fileName={previewFile.key.split('/').filter(Boolean).pop() || 'file'}
          isOpen={!!previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </>
  );
}
