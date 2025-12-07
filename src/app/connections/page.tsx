'use client';

import { useState, Fragment } from 'react';
import dynamic from 'next/dynamic';
import { SimpleSidebar } from '@/components/SimpleSidebar';
import { StorageProvider } from '@/lib/types/connections';
import { useCachedFetch } from '@/lib/utils/use-cached-fetch';
import { cacheManager } from '@/lib/utils/cache';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, X, Key } from 'lucide-react';

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
        <SimpleSidebar />
        <div id="main-content" className="flex flex-1 items-center justify-center">
          <p className="text-muted-foreground">Loading connections...</p>
        </div>
      </div>
    );
  }

  return (
    <div id="connections-page" className="flex overflow-hidden" style={{ height: '100vh' }}>
      <SimpleSidebar />
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

      {showAddForm && (
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Add New Connection</CardTitle>
            </CardHeader>
            <CardContent>
              <ConnectionForm
                onSuccess={() => {
                  setShowAddForm(false);
                  // Invalidate connections cache
                  cacheManager.invalidate('connections', { useLocalStorage: true });
                  loadConnections();
                }}
                onCancel={() => setShowAddForm(false)}
              />
            </CardContent>
          </Card>
        </div>
      )}

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
                      <TableCell className="font-medium">{connection.name}</TableCell>
                      <TableCell>{getProviderLabel(connection.provider)}</TableCell>
                      <TableCell>{new Date(connection.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTestConnection(connection.id)}
                          disabled={testingConnectionId === connection.id}
                          className="mr-2"
                        >
                          {testingConnectionId === connection.id ? 'Testing...' : 'Test'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(connection.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          Delete
                        </Button>
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
