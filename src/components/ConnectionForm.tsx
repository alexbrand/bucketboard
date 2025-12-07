'use client';

import { useState } from 'react';
import { StorageProvider } from '@/lib/types/connections';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle } from 'lucide-react';

interface ConnectionFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function ConnectionForm({ onSuccess, onCancel }: ConnectionFormProps) {
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

      const response = await fetch('/api/connections/test', {
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
        message: 'Failed to test connection. Please check your connection details and try again.',
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

      const response = await fetch('/api/connections', {
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
      console.error('Error creating connection:', error);
      alert('Failed to create connection');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Connection Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="My AWS Connection"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="provider">Provider</Label>
        <Select value={provider} onValueChange={(value) => setProvider(value as StorageProvider)}>
          <SelectTrigger id="provider">
            <SelectValue placeholder="Select a provider" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="aws-s3">AWS S3 / S3-Compatible</SelectItem>
            <SelectItem value="azure-blob">Azure Blob Storage</SelectItem>
            <SelectItem value="gcp-storage">Google Cloud Storage</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isS3Provider && (
        <>
          <div className="space-y-2">
            <Label htmlFor="awsAccessKeyId">Access Key ID</Label>
            <Input
              id="awsAccessKeyId"
              value={awsAccessKeyId}
              onChange={(e) => setAwsAccessKeyId(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="awsSecretAccessKey">Secret Access Key</Label>
            <Input
              id="awsSecretAccessKey"
              type="password"
              value={awsSecretAccessKey}
              onChange={(e) => setAwsSecretAccessKey(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="awsRegion">Region</Label>
            <Input
              id="awsRegion"
              value={awsRegion}
              onChange={(e) => setAwsRegion(e.target.value)}
              required
              placeholder="us-east-1"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="s3Endpoint">Endpoint URL (optional)</Label>
            <Input
              id="s3Endpoint"
              type="url"
              value={s3Endpoint}
              onChange={(e) => setS3Endpoint(e.target.value)}
              placeholder="https://s3.example.com"
            />
            <p className="text-xs text-muted-foreground">
              Leave empty for AWS S3. For S3-compatible services (MinIO, Backblaze B2, DigitalOcean
              Spaces, Wasabi), provide the endpoint URL.
            </p>
          </div>
        </>
      )}

      {provider === 'azure-blob' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="azureAccountName">Account Name</Label>
            <Input
              id="azureAccountName"
              value={azureAccountName}
              onChange={(e) => setAzureAccountName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="azureAccountKey">Account Key</Label>
            <Input
              id="azureAccountKey"
              type="password"
              value={azureAccountKey}
              onChange={(e) => setAzureAccountKey(e.target.value)}
              required
            />
          </div>
        </>
      )}

      {provider === 'gcp-storage' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="gcpProjectId">Project ID</Label>
            <Input
              id="gcpProjectId"
              value={gcpProjectId}
              onChange={(e) => setGcpProjectId(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gcpClientEmail">Client Email</Label>
            <Input
              id="gcpClientEmail"
              type="email"
              value={gcpClientEmail}
              onChange={(e) => setGcpClientEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gcpPrivateKey">Private Key</Label>
            <Textarea
              id="gcpPrivateKey"
              value={gcpPrivateKey}
              onChange={(e) => setGcpPrivateKey(e.target.value)}
              required
              rows={4}
              placeholder="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
            />
          </div>
        </>
      )}

      {testResult && (
        <Alert variant={testResult.success ? 'default' : 'destructive'}>
          {testResult.success ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          <div>
            <AlertDescription>{testResult.message}</AlertDescription>
          </div>
        </Alert>
      )}

      <div className="flex justify-between items-center">
        <Button
          type="button"
          variant="outline"
          onClick={handleTestConnection}
          disabled={testLoading}
        >
          {testLoading ? 'Testing...' : 'Test Connection'}
        </Button>
        <div className="flex space-x-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Connection'}
          </Button>
        </div>
      </div>
    </form>
  );
}
