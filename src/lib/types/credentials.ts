export type StorageProvider =
  | 'aws-s3'
  | 'azure-blob'
  | 'gcp-storage';

export interface CredentialBase {
  id: string;
  name: string;
  provider: StorageProvider;
  createdAt: string;
  updatedAt: string;
}

export interface AWSS3Credentials extends CredentialBase {
  provider: 'aws-s3';
  config: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    endpoint?: string; // Optional - for S3-compatible services (MinIO, Backblaze B2, etc.)
  };
}

export interface AzureBlobCredentials extends CredentialBase {
  provider: 'azure-blob';
  config: {
    accountName: string;
    accountKey: string;
  };
}

export interface GCPStorageCredentials extends CredentialBase {
  provider: 'gcp-storage';
  config: {
    projectId: string;
    clientEmail: string;
    privateKey: string;
  };
}

export type Credentials =
  | AWSS3Credentials
  | AzureBlobCredentials
  | GCPStorageCredentials;
