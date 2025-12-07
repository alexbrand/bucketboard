'use client';

import { useState, Fragment } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { StorageProvider } from '@/lib/types/connections';
import { useCachedFetch } from '@/lib/utils/use-cached-fetch';
import { cacheManager } from '@/lib/utils/cache';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, X, Key, Zap, Trash2, Package, Loader2 } from 'lucide-react';

// Lazy load ConnectionForm component
const ConnectionForm = dynamic(
  () => import('@/components/ConnectionForm').then((mod) => mod.ConnectionForm),
  { ssr: false }
);

interface ConnectionSummary {
  id: string;
  name: string;
  provider: StorageProvider;
  createdAt: string;
  updatedAt: string;
}

interface ConnectionsResponse {
  connections: ConnectionSummary[];
}

export default function ConnectionsPage() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [testingConnectionId, setTestingConnectionId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});

  // Fetch connections with caching
  const {
    data: connectionsData,
    loading,
    refetch: refetchConnections,
  } = useCachedFetch<ConnectionsResponse>(
    'connections',
    async () => {
      const response = await fetch('/api/connections');
      if (!response.ok) throw new Error('Failed to fetch connections');
      return response.json();
    },
    {
      ttl: 0,
      useLocalStorage: false,
    }
  );

  const connections = connectionsData?.connections || [];

  const loadConnections = async () => {
    await refetchConnections();
  };

  const handleTestConnection = async (id: string) => {
    setTestingConnectionId(id);
    setTestResults((prev) => {
      const newResults = { ...prev };
      delete newResults[id];
      return newResults;
    });

    try {
      const response = await fetch('/api/connections/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ connectionId: id }),
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
      setTestingConnectionId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this connection?')) {
      return;
    }

    try {
      const response = await fetch(`/api/connections/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Invalidate connections cache
        cacheManager.invalidate('connections', { useLocalStorage: true });
        await loadConnections();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting connection:', error);
      alert('Failed to delete connection');
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
      <div id="connections-page" className="flex overflow-hidden" style={{ height: '100vh' }}>
        <div id="main-content" className="flex flex-1 items-center justify-center">
          <p className="text-muted-foreground">Loading connections...</p>
        </div>
      </div>
    );
  }

  return (
    <div id="connections-page" className="flex overflow-hidden" style={{ height: '100vh' }}>
      <div id="main-content" className="flex-1 overflow-y-auto p-8">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Connections</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Manage your cloud storage provider connections
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0">
          <Button onClick={() => setShowAddForm(true)}>
            Add Connection
          </Button>
        </div>
      </div>

      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Connection</DialogTitle>
            <DialogDescription>
              Configure a new cloud storage provider connection
            </DialogDescription>
          </DialogHeader>
          <ConnectionForm
            onSuccess={() => {
              setShowAddForm(false);
              // Invalidate connections cache
              cacheManager.invalidate('connections', { useLocalStorage: true });
              loadConnections();
            }}
            onCancel={() => setShowAddForm(false)}
          />
        </DialogContent>
      </Dialog>

      <div className="mt-8">
        {connections.length === 0 ? (
          <Card className="p-12 text-center">
            <Key className="mx-auto h-12 w-12 text-muted-foreground" />
            <CardHeader>
              <CardTitle>No connections</CardTitle>
              <CardDescription>
                Get started by adding a connection for your cloud storage provider.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setShowAddForm(true)}>
                Add Connection
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {connections.map((connection) => (
                  <Fragment key={connection.id}>
                    <TableRow>
                      <TableCell className="font-medium">
                        <Link 
                          href={`/buckets?connectionId=${connection.id}`}
                          className="text-primary hover:underline cursor-pointer"
                        >
                          {connection.name}
                        </Link>
                      </TableCell>
                      <TableCell>{getProviderLabel(connection.provider)}</TableCell>
                      <TableCell>{new Date(connection.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleTestConnection(connection.id)}
                            disabled={testingConnectionId === connection.id}
                            aria-label="Test connection"
                            title="Test connection"
                          >
                            {testingConnectionId === connection.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Zap className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            aria-label="View buckets"
                            title="View buckets"
                          >
                            <Link href={`/buckets?connectionId=${connection.id}`}>
                              <Package className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(connection.id)}
                            className="text-destructive hover:text-destructive"
                            aria-label="Delete connection"
                            title="Delete connection"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {testResults[connection.id] && (
                      <TableRow key={`${connection.id}-test-result`}>
                        <TableCell colSpan={4} className="p-0">
                          <Alert
                            variant={testResults[connection.id].success ? 'default' : 'destructive'}
                            className="m-2"
                          >
                            {testResults[connection.id].success ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : (
                              <XCircle className="h-4 w-4" />
                            )}
                            <div className="flex-1">
                              <AlertDescription>
                                {testResults[connection.id].message}
                              </AlertDescription>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-4 w-4"
                              onClick={() => {
                                setTestResults((prev) => {
                                  const newResults = { ...prev };
                                  delete newResults[connection.id];
                                  return newResults;
                                });
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Alert>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
      </div>
    </div>
  );
}
