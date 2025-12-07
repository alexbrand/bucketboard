import { Connection } from '../types/connections';
import { StorageProvider } from './interface';

/**
 * Creates a storage provider instance based on the connection type
 * Uses dynamic imports to load only the required provider SDK
 */
export async function createStorageProvider(connection: Connection): Promise<StorageProvider> {
  const provider = connection.provider;

  if (provider === 'aws-s3') {
    const { AWSS3Provider } = await import('./providers/aws-s3');
    return new AWSS3Provider(connection);
  }

  if (provider === 'azure-blob') {
    const { AzureBlobProvider } = await import('./providers/azure-blob');
    return new AzureBlobProvider(connection);
  }

  if (provider === 'gcp-storage') {
    const { GCPStorageProvider } = await import('./providers/gcp-storage');
    return new GCPStorageProvider(connection);
  }

  throw new Error(`${provider} provider not yet implemented`);
}
