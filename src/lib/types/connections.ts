export type StorageProvider = 'aws-s3' | 'azure-blob' | 'gcp-storage';

export interface ConnectionBase {
  id: string;
  name: string;
  provider: StorageProvider;
  createdAt: string;
  updatedAt: string;
}

export interface AWSS3Connection extends ConnectionBase {
  provider: 'aws-s3';
  config: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    endpoint?: string; // Optional - for S3-compatible services (MinIO, Backblaze B2, etc.)
  };
}

export interface AzureBlobConnection extends ConnectionBase {
  provider: 'azure-blob';
  config: {
    accountName: string;
    accountKey: string;
    endpoint?: string; // Optional - for Azurite or custom endpoints
  };
}

export interface GCPStorageConnection extends ConnectionBase {
  provider: 'gcp-storage';
  config: {
    projectId: string;
    clientEmail: string;
    privateKey: string;
    apiEndpoint?: string; // Optional - for fake-gcs-server or custom endpoints
  };
}

export type Connection = AWSS3Connection | AzureBlobConnection | GCPStorageConnection;
