'use client';

import { useState, Fragment } from 'react';
import dynamic from 'next/dynamic';
import { StorageProvider } from '@/lib/types/credentials';
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

// Lazy load CredentialForm component
const CredentialForm = dynamic(
  () => import('@/components/CredentialForm').then((mod) => mod.CredentialForm),
  { ssr: false }
);

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
      ttl: 0,
      useLocalStorage: false,
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
          <p className="text-muted-foreground">Loading credentials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Credentials</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Manage your cloud storage provider credentials
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0">
          <Button onClick={() => setShowAddForm(true)}>
            Add Credential
          </Button>
        </div>
      </div>

      {showAddForm && (
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Add New Credential</CardTitle>
            </CardHeader>
            <CardContent>
              <CredentialForm
                onSuccess={() => {
                  setShowAddForm(false);
                  // Invalidate credentials cache
                  cacheManager.invalidate('credentials', { useLocalStorage: true });
                  loadCredentials();
                }}
                onCancel={() => setShowAddForm(false)}
              />
            </CardContent>
          </Card>
        </div>
      )}

      <div className="mt-8">
        {credentials.length === 0 ? (
          <Card className="p-12 text-center">
            <Key className="mx-auto h-12 w-12 text-muted-foreground" />
            <CardHeader>
              <CardTitle>No credentials</CardTitle>
              <CardDescription>
                Get started by adding a credential for your cloud storage provider.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setShowAddForm(true)}>
                Add Credential
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
                {credentials.map((credential) => (
                  <Fragment key={credential.id}>
                    <TableRow>
                      <TableCell className="font-medium">{credential.name}</TableCell>
                      <TableCell>{getProviderLabel(credential.provider)}</TableCell>
                      <TableCell>{new Date(credential.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTestConnection(credential.id)}
                          disabled={testingCredentialId === credential.id}
                          className="mr-2"
                        >
                          {testingCredentialId === credential.id ? 'Testing...' : 'Test'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(credential.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                    {testResults[credential.id] && (
                      <TableRow key={`${credential.id}-test-result`}>
                        <TableCell colSpan={4} className="p-0">
                          <Alert
                            variant={testResults[credential.id].success ? 'default' : 'destructive'}
                            className="m-2"
                          >
                            {testResults[credential.id].success ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : (
                              <XCircle className="h-4 w-4" />
                            )}
                            <div className="flex-1">
                              <AlertDescription>
                                {testResults[credential.id].message}
                              </AlertDescription>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-4 w-4"
                              onClick={() => {
                                setTestResults((prev) => {
                                  const newResults = { ...prev };
                                  delete newResults[credential.id];
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
  );
}
