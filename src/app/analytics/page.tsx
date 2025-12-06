'use client';

import { useState, useEffect } from 'react';
import { StorageProvider } from '@/lib/types/credentials';
import { useCachedFetch, createCacheKey, DEFAULT_TTL } from '@/lib/utils/use-cached-fetch';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Package, Database, FileText, Image, Box } from 'lucide-react';

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
      'bg-primary',
      'bg-green-500',
      'bg-yellow-500',
      'bg-destructive',
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
            Please add a credential first to view analytics.
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
          <h1 className="text-3xl font-bold">Storage Analytics</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            View insights and statistics about your cloud storage
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

      {loading ? (
        <div className="mt-8 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-muted-foreground">Loading analytics...</p>
        </div>
      ) : analytics ? (
        <div className="mt-8 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Package className="h-8 w-8 text-primary" />
                  <div className="ml-5">
                    <p className="text-sm font-medium text-muted-foreground">
                      Total Buckets
                    </p>
                    <p className="text-2xl font-semibold">
                      {analytics.summary.totalBuckets}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Database className="h-8 w-8 text-green-600" />
                  <div className="ml-5">
                    <p className="text-sm font-medium text-muted-foreground">
                      Total Storage
                    </p>
                    <p className="text-2xl font-semibold">
                      {formatBytes(analytics.summary.totalStorageSize)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <FileText className="h-8 w-8 text-yellow-600" />
                  <div className="ml-5">
                    <p className="text-sm font-medium text-muted-foreground">
                      Total Objects
                    </p>
                    <p className="text-2xl font-semibold">
                      {analytics.summary.totalObjectCount.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Image className="h-8 w-8 text-purple-600" />
                  <div className="ml-5">
                    <p className="text-sm font-medium text-muted-foreground">
                      File Types
                    </p>
                    <p className="text-2xl font-semibold">
                      {Object.keys(analytics.summary.fileTypes).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* File Types Distribution */}
          {Object.keys(analytics.summary.fileTypes).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>File Types Distribution</CardTitle>
              </CardHeader>
              <CardContent>
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
                            <span className="font-medium">
                              .{type}
                            </span>
                            <span className="text-muted-foreground">
                              {count} files ({percentage.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className={`h-full ${getFileTypeColor(index)}`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Bucket Details */}
          <Card>
            <CardHeader>
              <CardTitle>Bucket Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.buckets.map((bucket) => (
                  <Card key={bucket.name} className="border">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-base font-semibold">
                          {bucket.name}
                        </h4>
                        <span className="text-sm text-muted-foreground">
                          {formatBytes(bucket.totalSize)}
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Objects</p>
                          <p className="font-medium">
                            {bucket.objectCount.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">File Types</p>
                          <p className="font-medium">
                            {Object.keys(bucket.fileTypes).length}
                          </p>
                        </div>
                      </div>

                      {/* Largest Files */}
                      {bucket.largestFiles.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-medium uppercase text-muted-foreground">
                            Largest Files
                          </p>
                          <div className="mt-2 space-y-1">
                            {bucket.largestFiles.map((file) => (
                              <div
                                key={file.key}
                                className="flex items-center justify-between text-xs"
                              >
                                <span className="truncate">
                                  {file.key.split('/').pop()}
                                </span>
                                <span className="ml-2 text-muted-foreground">
                                  {formatBytes(file.size)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Storage Classes */}
          {Object.keys(analytics.summary.storageClasses).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Storage Classes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {Object.entries(analytics.summary.storageClasses).map(([className, count]) => (
                    <Card key={className} className="border">
                      <CardContent className="p-4">
                        <p className="text-sm font-medium text-muted-foreground">
                          {className}
                        </p>
                        <p className="mt-1 text-2xl font-semibold">
                          {count}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : null}
    </div>
  );
}
