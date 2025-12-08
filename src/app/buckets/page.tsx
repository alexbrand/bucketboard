'use client';

import { useState, useRef, Fragment, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { AppSidebar } from '@/components/AppSidebar';
import { FileDetailsPanel } from '@/components/FileDetailsPanel';
import { ObjectListSkeleton } from '@/components/ObjectListSkeleton';
import type { FileProgress } from '@/components/ProgressTracker';
import { useCachedFetch, createCacheKey, DEFAULT_TTL } from '@/lib/utils/use-cached-fetch';
import { cacheManager } from '@/lib/utils/cache';
import { LastUpdated } from '@/components/LastUpdated';
import { useKeyboardShortcuts, KeyboardShortcut } from '@/lib/utils/use-keyboard-shortcuts';
import { useShortcuts } from '@/components/ShortcutsContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Loader2,
  RefreshCw,
  FolderPlus,
  Folder,
  Upload,
  Search,
  Filter,
  X,
  Download,
  Package,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

interface StorageObject {
  key: string;
  size: number;
  lastModified: string;
  etag?: string;
  storageClass?: string;
  isFolder?: boolean;
}

interface ObjectsResponse {
  objects: StorageObject[];
  bucket: string;
  prefix: string;
}

function BucketsPageContent() {
  const searchParams = useSearchParams();
  const [selectedCredentialId, setSelectedCredentialId] = useState<string>('');
  const [selectedBucket, setSelectedBucket] = useState<string>('');
  const [currentPrefix, setCurrentPrefix] = useState<string>('');
  const [selectedObject, setSelectedObject] = useState<StorageObject | null>(null);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  // Read connectionId from URL parameters
  useEffect(() => {
    const connectionId = searchParams.get('connectionId');
    if (connectionId && connectionId !== selectedCredentialId) {
      // Reset bucket selection FIRST to prevent race conditions
      setSelectedBucket('');
      setCurrentPrefix('');
      setSelectedObject(null);
      // Then update connection ID
      setSelectedCredentialId(connectionId);
    }
  }, [searchParams, selectedCredentialId]);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [fileTypeFilter, setFileTypeFilter] = useState<string>('all');
  const [sizeFilter, setSizeFilter] = useState<{ min: number; max: number }>({
    min: 0,
    max: Infinity,
  });
  const [dateFilter, setDateFilter] = useState<{ start: string; end: string }>({
    start: '',
    end: '',
  });

  // Progress tracking state
  const [fileProgress, setFileProgress] = useState<FileProgress[]>([]);
  const [abortControllers, setAbortControllers] = useState<Map<string, AbortController>>(new Map());

  // Keyboard shortcuts context
  const { showHelp, hideHelp } = useShortcuts();

  // Keyboard navigation in object list
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [isKeyboardMode, setIsKeyboardMode] = useState<boolean>(false);

  // File preview state
  const [previewFile, setPreviewFile] = useState<StorageObject | null>(null);

  // Read-only mode state
  const [readOnly, setReadOnly] = useState<boolean>(false);

  // Drag and drop state
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Refs for triggering file uploads
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Track previous connection ID to invalidate cache when it changes
  const prevConnectionIdRef = useRef<string>('');

  // Fetch read-only mode setting
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings');
        if (response.ok) {
          const data = await response.json();
          setReadOnly(data.readOnly || false);
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      }
    };
    fetchSettings();
  }, []);

  // Invalidate cache when connection changes
  useEffect(() => {
    if (prevConnectionIdRef.current && prevConnectionIdRef.current !== selectedCredentialId) {
      // Invalidate all cache entries for the previous connection
      const oldConnectionId = prevConnectionIdRef.current;
      const escapedOldConnectionId = oldConnectionId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Invalidate objects, metadata, and analytics cache for the old connection
      cacheManager.invalidatePattern(
        new RegExp(`^(objects|metadata|analytics):.*:${escapedOldConnectionId}(:.*)?$`)
      );
    }
    prevConnectionIdRef.current = selectedCredentialId;
  }, [selectedCredentialId]);

  // Fetch objects with caching
  const objectsCacheKey = createCacheKey(
    'objects',
    selectedBucket,
    selectedCredentialId,
    currentPrefix
  );

  // Use refs to ensure fetcher always uses latest values
  const selectedBucketRef = useRef(selectedBucket);
  const selectedCredentialIdRef = useRef(selectedCredentialId);
  const currentPrefixRef = useRef(currentPrefix);

  useEffect(() => {
    selectedBucketRef.current = selectedBucket;
    selectedCredentialIdRef.current = selectedCredentialId;
    currentPrefixRef.current = currentPrefix;
  }, [selectedBucket, selectedCredentialId, currentPrefix]);

  const {
    data: objectsData,
    loading,
    lastUpdated,
    refetch: refetchObjects,
  } = useCachedFetch<ObjectsResponse>(
    objectsCacheKey,
    async () => {
      // Use refs to get the latest values (avoid stale closure)
      const bucket = selectedBucketRef.current;
      const connectionId = selectedCredentialIdRef.current;
      const prefix = currentPrefixRef.current;

      // Defensive check: don't fetch if bucket or credential is missing
      if (!bucket || !connectionId) {
        throw new Error('Bucket or connection not selected');
      }
      const params = new URLSearchParams({
        connectionId,
        prefix,
        delimiter: '/',
      });
      const response = await fetch(`/api/buckets/${bucket}/objects?${params}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch objects: ${response.statusText}`);
      }
      return response.json();
    },
    {
      ttl: DEFAULT_TTL.OBJECTS,
      enabled: !!selectedBucket && !!selectedCredentialId,
    }
  );

  const objects = objectsData?.objects || [];

  // Prefetch function for folder contents
  const handleFolderHover = (folderKey: string) => {
    if (!selectedBucket || !selectedCredentialId) return;
    const cacheKey = createCacheKey('objects', selectedBucket, selectedCredentialId, folderKey);
    if (!cacheManager.get(cacheKey)) {
      cacheManager.prefetch<ObjectsResponse>(
        cacheKey,
        async () => {
          const params = new URLSearchParams({
            connectionId: selectedCredentialId,
            prefix: folderKey,
            delimiter: '/',
          });
          const response = await fetch(`/api/buckets/${selectedBucket}/objects?${params}`);
          if (!response.ok) throw new Error('Failed to prefetch objects');
          return response.json();
        },
        { ttl: DEFAULT_TTL.OBJECTS }
      );
    }
  };

  // Prefetch function for metadata
  const handleFileHover = (object: StorageObject) => {
    if (!object.isFolder && selectedBucket && selectedCredentialId) {
      const cacheKey = createCacheKey('metadata', selectedBucket, selectedCredentialId, object.key);
      if (!cacheManager.get(cacheKey)) {
        cacheManager.prefetch(
          cacheKey,
          async () => {
            const response = await fetch(
              `/api/buckets/${selectedBucket}/metadata?connectionId=${selectedCredentialId}&key=${encodeURIComponent(object.key)}`
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
  };

  const navigateUp = () => {
    const parts = currentPrefix.split('/').filter(Boolean);
    parts.pop();
    setCurrentPrefix(parts.length > 0 ? parts.join('/') + '/' : '');
    setSelectedObject(null);
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    if (readOnly) {
      alert('Write operations are disabled in read-only mode');
      return;
    }

    try {
      const folderKey = currentPrefix + newFolderName.trim() + '/';
      const formData = new FormData();
      formData.append('file', new Blob([]), folderKey);
      formData.append('key', folderKey);

      const response = await fetch(
        `/api/buckets/${selectedBucket}/objects?connectionId=${selectedCredentialId}`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (response.ok) {
        setShowCreateFolder(false);
        setNewFolderName('');
        const baseKey = createCacheKey('objects', selectedBucket, selectedCredentialId);
        const escapedBaseKey = baseKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

  const uploadFiles = async (files: File[]) => {
    if (!files || files.length === 0) return;
    if (readOnly) {
      alert('Write operations are disabled in read-only mode');
      return;
    }

    setUploadingFile(true);
    const filesToUpload = Array.from(files);

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

    const maxConcurrent = 5;
    const uploadQueue = [...filesToUpload];
    const activeUploads: Promise<void>[] = [];

    const uploadFile = async (file: File, progressItem: FileProgress) => {
      const abortController = new AbortController();
      setAbortControllers((prev) => new Map(prev).set(progressItem.id, abortController));

      try {
        setFileProgress((prev) =>
          prev.map((item) =>
            item.id === progressItem.id ? { ...item, status: 'uploading' as const } : item
          )
        );

        const formData = new FormData();
        formData.append('file', file);
        formData.append('key', currentPrefix + file.name);

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();

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
              } catch {
                // Ignore
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

          xhr.open(
            'POST',
            `/api/buckets/${selectedBucket}/objects?connectionId=${selectedCredentialId}`
          );
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

    while (uploadQueue.length > 0 || activeUploads.length > 0) {
      while (activeUploads.length < maxConcurrent && uploadQueue.length > 0) {
        const file = uploadQueue.shift()!;
        const progressItem = initialProgress[filesToUpload.indexOf(file)];
        const uploadPromise = uploadFile(file, progressItem);
        activeUploads.push(uploadPromise);
      }

      if (activeUploads.length > 0) {
        await Promise.race(activeUploads);
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
    const baseKey = createCacheKey('objects', selectedBucket, selectedCredentialId);
    const escapedBaseKey = baseKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    cacheManager.invalidatePattern(new RegExp(`^${escapedBaseKey}(:.*)?$`));
    await loadObjects();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    await uploadFiles(Array.from(files));
    event.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!readOnly && selectedBucket) {
      setIsDraggingOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only hide overlay if we're leaving the drop zone (not just moving to a child element)
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDraggingOver(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    if (readOnly) {
      alert('Write operations are disabled in read-only mode');
      return;
    }

    if (!selectedBucket) {
      return;
    }

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await uploadFiles(files);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedFiles.size === 0) return;
    if (readOnly) {
      alert('Write operations are disabled in read-only mode');
      return;
    }
    if (!confirm(`Are you sure you want to delete ${selectedFiles.size} item(s)?`)) return;

    try {
      const response = await fetch(`/api/buckets/${selectedBucket}/objects`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionId: selectedCredentialId,
          keys: Array.from(selectedFiles),
        }),
      });

      if (response.ok) {
        setSelectedFiles(new Set());
        const baseKey = createCacheKey('objects', selectedBucket, selectedCredentialId);
        const escapedBaseKey = baseKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

    const maxConcurrent = 3;
    const downloadQueue = [...filesToDownload];
    const activeDownloads: Promise<void>[] = [];

    const downloadFile = async (key: string, progressItem: FileProgress) => {
      const abortController = new AbortController();
      setAbortControllers((prev) => new Map(prev).set(progressItem.id, abortController));

      try {
        setFileProgress((prev) =>
          prev.map((item) =>
            item.id === progressItem.id ? { ...item, status: 'downloading' as const } : item
          )
        );

        const response = await fetch(
          `/api/buckets/${selectedBucket}/download?connectionId=${selectedCredentialId}&key=${encodeURIComponent(key)}`,
          { signal: abortController.signal }
        );

        if (!response.ok) {
          throw new Error(`Download failed: ${response.statusText}`);
        }

        const contentLength = response.headers.get('content-length');
        const total = contentLength ? parseInt(contentLength, 10) : progressItem.size || 0;

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

    while (downloadQueue.length > 0 || activeDownloads.length > 0) {
      while (activeDownloads.length < maxConcurrent && downloadQueue.length > 0) {
        const key = downloadQueue.shift()!;
        const progressItem = initialProgress[filesToDownload.indexOf(key)];
        const downloadPromise = downloadFile(key, progressItem);
        activeDownloads.push(downloadPromise);
      }

      if (activeDownloads.length > 0) {
        await Promise.race(activeDownloads);
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

  const selectAllFiltered = () => {
    // Only select files, not folders
    const filesOnly = filteredObjects.filter((obj) => !obj.isFolder);
    setSelectedFiles(new Set(filesOnly.map((obj) => obj.key)));
  };

  const deselectAll = () => {
    setSelectedFiles(new Set());
  };

  const toggleSelectAll = () => {
    // Only check files, not folders
    const filesOnly = filteredObjects.filter((obj) => !obj.isFolder);
    const allFilesSelected =
      filesOnly.length > 0 && filesOnly.every((obj) => selectedFiles.has(obj.key));
    if (allFilesSelected) {
      deselectAll();
    } else {
      selectAllFiltered();
    }
  };

  const viewObjectMetadata = async (object: StorageObject) => {
    setSelectedObject(object);
  };

  const handleCancelTransfer = (id: string) => {
    const controller = abortControllers.get(id);
    if (controller) {
      controller.abort();
    }
  };

  const handleCloseProgressTracker = () => {
    const hasActiveTransfers = fileProgress.some(
      (item) =>
        item.status === 'uploading' || item.status === 'downloading' || item.status === 'pending'
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
    const codeExts = [
      'js',
      'ts',
      'tsx',
      'jsx',
      'py',
      'java',
      'cpp',
      'c',
      'h',
      'cs',
      'go',
      'rs',
      'rb',
      'php',
    ];
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
    if (object.isFolder && !searchQuery) return true;

    const objectName = object.key.split('/').filter(Boolean).pop()?.toLowerCase() || '';
    if (searchQuery && !objectName.includes(searchQuery.toLowerCase())) {
      return false;
    }

    if (fileTypeFilter !== 'all' && !object.isFolder) {
      const fileType = getFileType(object.key);
      if (fileType !== fileTypeFilter) return false;
    }

    if (!object.isFolder && (object.size < sizeFilter.min || object.size > sizeFilter.max)) {
      return false;
    }

    if (!object.isFolder && dateFilter.start) {
      const objDate = new Date(object.lastModified);
      const startDate = new Date(dateFilter.start);
      if (objDate < startDate) return false;
    }
    if (!object.isFolder && dateFilter.end) {
      const objDate = new Date(object.lastModified);
      const endDate = new Date(dateFilter.end);
      endDate.setHours(23, 59, 59, 999);
      if (objDate > endDate) return false;
    }

    return true;
  });

  const totalItemCount = filteredObjects.length + (currentPrefix ? 1 : 0);

  const getFocusedObject = () => {
    if (focusedIndex < 0) return null;
    if (currentPrefix && focusedIndex === 0) return null;
    const objectIndex = currentPrefix ? focusedIndex - 1 : focusedIndex;
    return filteredObjects[objectIndex] || null;
  };

  const objectBrowserShortcuts: KeyboardShortcut[] = [
    {
      key: 'u',
      description: 'Upload files',
      action: () => {
        if (!uploadingFile && !readOnly) {
          fileInputRef.current?.click();
        }
      },
    },
    {
      key: 'n',
      description: 'Create new folder',
      action: () => {
        if (!showCreateFolder && !readOnly) {
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
        } else if (selectedObject) {
          setSelectedObject(null);
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
          setIsKeyboardMode(true);
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
          setIsKeyboardMode(true);
          setFocusedIndex((prev) => (prev <= 0 ? 0 : prev - 1));
        }
      },
      ignoreInInput: false,
    },
    {
      key: 'Enter',
      description: 'Open focused folder or view file metadata',
      action: () => {
        setIsKeyboardMode(true);
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
        setIsKeyboardMode(true);
        const focusedObject = getFocusedObject();
        if (focusedObject) {
          toggleFileSelection(focusedObject.key);
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
      key: 'a',
      ctrlKey: true,
      description: 'Select all / Deselect all',
      action: () => {
        toggleSelectAll();
      },
      ignoreInInput: true,
    },
    {
      key: 'a',
      metaKey: true,
      description: 'Select all / Deselect all',
      action: () => {
        toggleSelectAll();
      },
      ignoreInInput: true,
    },
  ];

  useKeyboardShortcuts(objectBrowserShortcuts, !!selectedBucket);

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
    <div id="buckets-page" className="flex overflow-hidden" style={{ height: '100vh' }}>
      <ProgressTracker
        items={fileProgress}
        onClose={handleCloseProgressTracker}
        onCancel={handleCancelTransfer}
      />

      {/* Left Sidebar */}
      <AppSidebar
        selectedCredentialId={selectedCredentialId}
        onCredentialChange={(id) => {
          setSelectedCredentialId(id);
          setSelectedBucket('');
          setCurrentPrefix('');
          setSelectedObject(null);
        }}
        selectedBucket={selectedBucket}
        onBucketSelect={(bucket) => {
          setSelectedBucket(bucket);
          setCurrentPrefix('');
          setSelectedObject(null);
        }}
      />

      {/* Main Content */}
      <div id="main-content" className="flex flex-1 flex-col overflow-hidden">
        {!selectedBucket ? (
          <div id="no-bucket-selected" className="flex h-full items-center justify-center">
            <div className="text-center">
              <Package className="mx-auto h-16 w-16 text-muted-foreground" />
              <h2 className="mt-4 text-xl font-semibold">Select a bucket to get started</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Choose a bucket from the sidebar to browse its contents
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Toolbar */}
            <div id="bucket-toolbar" className="bg-background px-4 pt-4">
              {/* Folder creation form */}
              {showCreateFolder && !readOnly && (
                <Card className="mb-4">
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

              {/* Search and filters */}
              <div
                id="bucket-toolbar-search-and-filters"
                className="mb-4 flex items-center space-x-2"
              >
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter by name..."
                    className="pl-9"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-1/2 h-7 w-7 -translate-y-1/2"
                      onClick={() => setSearchQuery('')}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <Button
                  onClick={() => setShowFilters(!showFilters)}
                  variant={showFilters || hasActiveFilters ? 'default' : 'outline'}
                >
                  <Filter className="mr-2 h-4 w-4" />
                  Filters
                </Button>
                {hasActiveFilters && (
                  <Button variant="outline" size="sm" onClick={clearAllFilters}>
                    Clear All
                  </Button>
                )}
              </div>

              {/* Filter panel */}
              {showFilters && (
                <Card className="my-4">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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

                      <div>
                        <Label>Modified Date</Label>
                        <div className="mt-1 flex space-x-2">
                          <Input
                            type="date"
                            value={dateFilter.start}
                            onChange={(e) =>
                              setDateFilter({ ...dateFilter, start: e.target.value })
                            }
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

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Button
                    variant="link"
                    onClick={() => setCurrentPrefix('')}
                    className="h-auto p-0 group hover:no-underline"
                  >
                    <div className="flex items-center space-x-2 border-b border-transparent group-hover:border-muted-foreground">
                      <Folder className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">/</span>
                    </div>
                  </Button>
                  {breadcrumbs.map((crumb, index) => (
                    <Fragment key={crumb.path}>
                      {index > 0 && <span className="text-muted-foreground">/</span>}
                      <Button
                        variant="link"
                        onClick={() => navigateToFolder(crumb.path)}
                        className={`h-auto p-0 text-sm ${index === breadcrumbs.length - 1 ? '' : 'text-muted-foreground'}`}
                      >
                        {crumb.name}
                      </Button>
                    </Fragment>
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
                      {!readOnly && (
                        <Button onClick={handleDeleteSelected} variant="destructive" size="sm">
                          <X className="mr-1.5 h-4 w-4" />
                          Delete ({selectedFiles.size})
                        </Button>
                      )}
                    </>
                  )}
                  <LastUpdated timestamp={lastUpdated} />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => refetchObjects()}
                    disabled={loading}
                    title="Refresh"
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                  {!readOnly && (
                    <Button
                      onClick={() => setShowCreateFolder(true)}
                      variant="outline"
                      size="icon"
                      title="New Folder"
                    >
                      <FolderPlus className="h-4 w-4" />
                    </Button>
                  )}
                  {!readOnly && (
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingFile}
                      variant="outline"
                      size="icon"
                      title={uploadingFile ? 'Uploading...' : 'Upload'}
                    >
                      <Upload className="h-4 w-4" />
                    </Button>
                  )}
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
            </div>

            {/* Object List */}
            <div
              id="object-list-container"
              className="relative flex-1 overflow-hidden p-4"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {isDraggingOver && !readOnly && selectedBucket && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-primary/10 border-2 border-dashed border-primary rounded-lg">
                  <div className="text-center">
                    <Upload className="mx-auto h-12 w-12 text-primary" />
                    <p className="mt-2 text-lg font-semibold text-primary">Drop files to upload</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Files will be uploaded to {currentPrefix || 'root'}
                    </p>
                  </div>
                </div>
              )}
              {loading ? (
                <ObjectListSkeleton showNavigateUp={!!currentPrefix} />
              ) : objects.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center">
                    <p className="text-muted-foreground">
                      {currentPrefix ? 'This folder is empty' : 'This bucket is empty'}
                    </p>
                  </div>
                </div>
              ) : filteredObjects.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center">
                    <Search className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-2 font-semibold">No results found</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Try adjusting your search or filters
                    </p>
                    {hasActiveFilters && (
                      <Button onClick={clearAllFilters} className="mt-4">
                        Clear All Filters
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <Card className="h-full overflow-hidden shadow-none">
                  <VirtualizedObjectList
                    objects={filteredObjects}
                    selectedFiles={selectedFiles}
                    selectedObject={selectedObject}
                    onToggleFileSelection={toggleFileSelection}
                    onSelectAll={selectAllFiltered}
                    onDeselectAll={deselectAll}
                    onToggleSelectAll={toggleSelectAll}
                    onNavigateToFolder={navigateToFolder}
                    onViewObjectMetadata={viewObjectMetadata}
                    formatBytes={formatBytes}
                    showNavigateUp={!!currentPrefix}
                    onNavigateUp={navigateUp}
                    onFolderHover={handleFolderHover}
                    onFileHover={handleFileHover}
                    focusedIndex={focusedIndex}
                    isKeyboardMode={isKeyboardMode}
                    onMouseInteraction={(index) => {
                      setIsKeyboardMode(false);
                      setFocusedIndex(index);
                    }}
                  />
                </Card>
              )}
            </div>
          </>
        )}
      </div>

      {/* Right Details Panel */}
      {selectedObject && selectedBucket && selectedCredentialId && (
        <FileDetailsPanel
          bucketName={selectedBucket}
          connectionId={selectedCredentialId}
          selectedObject={selectedObject}
          onClose={() => setSelectedObject(null)}
          onPreview={(obj) => setPreviewFile(obj)}
          readOnly={readOnly}
        />
      )}

      {/* File Preview Modal */}
      {previewFile && selectedBucket && selectedCredentialId && (
        <FilePreview
          bucketName={selectedBucket}
          objectKey={previewFile.key}
          connectionId={selectedCredentialId}
          fileName={previewFile.key.split('/').filter(Boolean).pop() || 'file'}
          isOpen={!!previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
}

export default function BucketsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <BucketsPageContent />
    </Suspense>
  );
}
