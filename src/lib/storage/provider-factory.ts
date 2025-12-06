import { Credentials } from '../types/credentials';
import { StorageProvider } from './interface';
import { AWSS3Provider } from './providers/aws-s3';
import { AzureBlobProvider } from './providers/azure-blob';
import { GCPStorageProvider } from './providers/gcp-storage';

/**
 * Creates a storage provider instance based on the credential type
 */
export function createStorageProvider(credentials: Credentials): StorageProvider {
  const provider = credentials.provider;

  if (provider === 'aws-s3') {
    return new AWSS3Provider(credentials);
  }

  if (provider === 'azure-blob') {
    return new AzureBlobProvider(credentials);
  }

  if (provider === 'gcp-storage') {
    return new GCPStorageProvider(credentials);
  }

  throw new Error(`${provider} provider not yet implemented`);
}
