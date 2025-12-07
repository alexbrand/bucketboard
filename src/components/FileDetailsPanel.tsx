'use client';

import { useState, useEffect } from 'react';
import { X, Download, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCachedFetch, createCacheKey, DEFAULT_TTL } from '@/lib/utils/use-cached-fetch';
import { cacheManager } from '@/lib/utils/cache';
import { getFileIcon } from '@/lib/utils/file-icons';
import { cn } from '@/lib/utils';

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

interface FileDetailsPanelProps {
  bucketName: string;
  connectionId: string;
  selectedObject: StorageObject | null;
  onClose: () => void;
  onPreview?: (object: StorageObject) => void;
}

export function FileDetailsPanel({
  bucketName,
  connectionId,
  selectedObject,
  onClose,
  onPreview,
}: FileDetailsPanelProps) {
  const [objectMetadata, setObjectMetadata] = useState<ObjectMetadata | null>(null);
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);
  const [editedMetadata, setEditedMetadata] = useState<Record<string, string>>({});
  const [editedTags, setEditedTags] = useState<Record<string, string>>({});
  const [editedStorageClass, setEditedStorageClass] = useState<string>('');
  const [editedContentType, setEditedContentType] = useState<string>('');
  const [savingMetadata, setSavingMetadata] = useState(false);

  useEffect(() => {
    if (selectedObject && !selectedObject.isFolder) {
      loadMetadata();
    } else {
      setObjectMetadata(null);
    }
  }, [selectedObject?.key]);

  const loadMetadata = async () => {
    if (!selectedObject || selectedObject.isFolder) return;

    const metadataCacheKey = createCacheKey('metadata', bucketName, connectionId, selectedObject.key);
    const cached = cacheManager.get<ObjectMetadata>(metadataCacheKey, {
      ttl: DEFAULT_TTL.METADATA,
    });

    if (cached) {
      setObjectMetadata(cached);
      return;
    }

    try {
      const response = await fetch(
        `/api/buckets/${bucketName}/metadata?connectionId=${connectionId}&key=${encodeURIComponent(selectedObject.key)}`
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
          connectionId: connectionId,
          key: selectedObject.key,
          metadata: editedMetadata,
          tags: editedTags,
          storageClass: editedStorageClass || undefined,
          contentType: editedContentType || undefined,
        }),
      });

      if (response.ok) {
        setIsEditingMetadata(false);
        const metadataCacheKey = createCacheKey('metadata', bucketName, connectionId, selectedObject.key);
        cacheManager.invalidate(metadataCacheKey, { ttl: DEFAULT_TTL.METADATA });
        cacheManager.invalidatePattern(/^analytics:.*/);
        await loadMetadata();
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

  const isFilePreviewable = (key: string): boolean => {
    const ext = getFileExtension(key);
    const previewableExts = [
      'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico',
      'txt', 'json', 'xml', 'html', 'htm', 'css', 'js', 'ts', 'tsx', 'jsx',
      'md', 'yaml', 'yml', 'csv', 'log', 'py', 'java', 'cpp', 'c', 'h',
      'cs', 'go', 'rs', 'rb', 'php', 'sh', 'bash',
    ];
    return previewableExts.includes(ext);
  };

  if (!selectedObject) return null;

  return (
    <div id="file-details-panel" className="flex h-full w-96 flex-col border-l bg-background shadow-lg">
      {/* Header */}
      <div id="details-panel-header" className="flex items-center justify-between px-6 pt-4">
        <h2 className="text-lg font-semibold">Details</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div id="details-panel-content" className="flex-1 overflow-y-auto px-6 py-4">
        <div className="space-y-6">
          {/* File Name */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Name
            </p>
            <div className="mt-2 flex items-center gap-3">
              <p className="break-all text-sm font-medium">
                {selectedObject.key.split('/').filter(Boolean).pop()}
              </p>
            </div>
          </div>

          {!selectedObject.isFolder && (
            <>
              {/* Size */}
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Size
                </p>
                <p className="mt-2 text-sm">{formatBytes(selectedObject.size)}</p>
              </div>

              {/* Last Modified */}
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Last Modified
                </p>
                <p className="mt-2 text-sm">
                  {new Date(selectedObject.lastModified).toLocaleString()}
                </p>
              </div>

              {/* ETag */}
              {selectedObject.etag && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    ETag
                  </p>
                  <p className="mt-2 break-all font-mono text-xs">{selectedObject.etag}</p>
                </div>
              )}

              {/* Editable Metadata Section */}
              {isEditingMetadata ? (
                <>
                  {/* Storage Class Editor */}
                  <div>
                    <Label className="text-xs font-medium uppercase tracking-wider">
                      Storage Class
                    </Label>
                    <Select value={editedStorageClass || 'DEFAULT'} onValueChange={(value) => setEditedStorageClass(value === 'DEFAULT' ? '' : value)}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Default" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DEFAULT">Default</SelectItem>
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
                    <Label className="text-xs font-medium uppercase tracking-wider">
                      Content Type
                    </Label>
                    <Input
                      type="text"
                      value={editedContentType}
                      onChange={(e) => setEditedContentType(e.target.value)}
                      placeholder="e.g., text/plain"
                      className="mt-2"
                    />
                  </div>

                  {/* Custom Metadata Editor */}
                  <div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium uppercase tracking-wider">
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
                          <Input type="text" value={key} disabled className="w-1/3 text-xs" />
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
                      <Label className="text-xs font-medium uppercase tracking-wider">Tags</Label>
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
                          <Input type="text" value={key} disabled className="w-1/3 text-xs" />
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
                </>
              ) : (
                <>
                  {/* Read-only Metadata View */}
                  {selectedObject.storageClass && (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Storage Class
                      </p>
                      <p className="mt-2 text-sm">{selectedObject.storageClass}</p>
                    </div>
                  )}

                  {objectMetadata?.contentType && (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Content Type
                      </p>
                      <p className="mt-2 text-sm">{objectMetadata.contentType}</p>
                    </div>
                  )}

                  {objectMetadata?.metadata && Object.keys(objectMetadata.metadata).length > 0 && (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Custom Metadata
                      </p>
                      <div className="mt-2 space-y-2">
                        {Object.entries(objectMetadata.metadata).map(([key, value]) => (
                          <Card key={key} className="p-3">
                            <p className="text-xs font-medium">{key}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{value}</p>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {objectMetadata?.tags && Object.keys(objectMetadata.tags).length > 0 && (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
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
            </>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      {!selectedObject.isFolder && (
        <div id="details-panel-actions" className="px-6 py-4">
          {isEditingMetadata ? (
            <div className="flex gap-2">
              <Button onClick={saveMetadata} disabled={savingMetadata} className="flex-1">
                {savingMetadata ? 'Saving...' : 'Save'}
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
          ) : (
            <div className="space-y-2">
              <Button variant="outline" onClick={startEditingMetadata} className="w-full">
                Edit Metadata
              </Button>
              {isFilePreviewable(selectedObject.key) && onPreview && (
                <Button
                  onClick={() => onPreview(selectedObject)}
                  variant="outline"
                  className="w-full"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Preview
                </Button>
              )}
              <Button asChild className="w-full">
                <a
                  href={`/api/buckets/${bucketName}/download?connectionId=${connectionId}&key=${encodeURIComponent(selectedObject.key)}`}
                  download
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </a>
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
