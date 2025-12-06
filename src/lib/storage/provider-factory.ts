import { Credentials } from '../types/credentials';
import { StorageProvider } from './interface';

/**
 * Creates a storage provider instance based on the credential type
 * Uses dynamic imports to load only the required provider SDK
 */
export async function createStorageProvider(credentials: Credentials): Promise<StorageProvider> {
  const provider = credentials.provider;

  if (provider === 'aws-s3') {
    const { AWSS3Provider } = await import('./providers/aws-s3');
    return new AWSS3Provider(credentials);
  }

  if (provider === 'azure-blob') {
    const { AzureBlobProvider } = await import('./providers/azure-blob');
    return new AzureBlobProvider(credentials);
  }

  if (provider === 'gcp-storage') {
    const { GCPStorageProvider } = await import('./providers/gcp-storage');
    return new GCPStorageProvider(credentials);
  }

  throw new Error(`${provider} provider not yet implemented`);
}
