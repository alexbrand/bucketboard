import { connectionManager } from '../../src/lib/storage/connection-store';
import { createStorageProvider } from '../../src/lib/storage/provider-factory';
import { StorageProvider } from '../../src/lib/storage/interface';
import { Connection } from '../../src/lib/types/connections';
import { S3Client, CreateBucketCommand, DeleteBucketCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';
import { Storage } from '@google-cloud/storage';
import {
  AWSS3Connection,
  AzureBlobConnection,
  GCPStorageConnection,
} from '../../src/lib/types/connections';

export interface SeedOptions {
  count?: number;
  includeFolders?: boolean;
  includeNested?: boolean;
  fileTypes?: string[];
  prefix?: string;
}

export interface TestObject {
  key: string;
  size: number;
  contentType: string;
}

const FILE_EXTENSIONS = ['jpg', 'png', 'pdf', 'txt', 'csv', 'json', 'xml', 'mp4', 'zip', 'docx'];
const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  pdf: 'application/pdf',
  txt: 'text/plain',
  csv: 'text/csv',
  json: 'application/json',
  xml: 'application/xml',
  mp4: 'video/mp4',
  zip: 'application/zip',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

/**
 * Generates random file content
 */
function generateFileContent(size: number): Buffer {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const buffer = Buffer.alloc(size);
  for (let i = 0; i < size; i++) {
    buffer[i] = chars.charCodeAt(Math.floor(Math.random() * chars.length));
  }
  return buffer;
}

/**
 * Generates a file key
 */
function generateFileKey(
  index: number,
  prefix: string,
  includeFolders: boolean,
  includeNested: boolean
): string {
  const ext = FILE_EXTENSIONS[Math.floor(Math.random() * FILE_EXTENSIONS.length)];

  if (includeFolders && Math.random() < 0.1) {
    const folderIndex = Math.floor(Math.random() * 10);
    let folderPath = `${prefix}folder-${folderIndex.toString().padStart(2, '0')}/`;
    
    if (includeNested && Math.random() < 0.3) {
      const nestedFolderIndex = Math.floor(Math.random() * 5);
      folderPath += `nested-${nestedFolderIndex.toString().padStart(2, '0')}/`;
    }
    
    return `${folderPath}file-${index.toString().padStart(6, '0')}.${ext}`;
  }

  return `${prefix}file-${index.toString().padStart(6, '0')}.${ext}`;
}

/**
 * Gets content type for a file extension
 */
function getContentType(key: string): string {
  const ext = key.split('.').pop()?.toLowerCase() || 'txt';
  return CONTENT_TYPES[ext] || 'application/octet-stream';
}

/**
 * Creates a bucket/container using the provider SDK directly
 */
export async function createTestBucket(providerId: string, bucketName: string): Promise<void> {
  const connection = connectionManager.getConnection(providerId);
  if (!connection) {
    throw new Error(`Connection "${providerId}" not found`);
  }

  try {
    if (connection.provider === 'aws-s3') {
      const conn = connection as AWSS3Connection;
      const config: {
        region: string;
        credentials: { accessKeyId: string; secretAccessKey: string };
        endpoint?: string;
        forcePathStyle?: boolean;
      } = {
        region: conn.config.region,
        credentials: {
          accessKeyId: conn.config.accessKeyId,
          secretAccessKey: conn.config.secretAccessKey,
        },
      };
      if (conn.config.endpoint) {
        config.endpoint = conn.config.endpoint;
        config.forcePathStyle = true;
      }
      const client = new S3Client(config);
      const command = new CreateBucketCommand({ Bucket: bucketName });
      await client.send(command);
    } else if (connection.provider === 'azure-blob') {
      const conn = connection as AzureBlobConnection;
      const sharedKeyCredential = new StorageSharedKeyCredential(
        conn.config.accountName,
        conn.config.accountKey
      );
      const endpoint = conn.config.endpoint
        ? conn.config.endpoint
        : `https://${conn.config.accountName}.blob.core.windows.net`;
      const client = new BlobServiceClient(endpoint, sharedKeyCredential);
      const containerClient = client.getContainerClient(bucketName);
      await containerClient.create();
    } else if (connection.provider === 'gcp-storage') {
      const conn = connection as GCPStorageConnection;
      const storageConfig: {
        projectId: string;
        credentials: { client_email: string; private_key: string };
        apiEndpoint?: string;
      } = {
        projectId: conn.config.projectId,
        credentials: {
          client_email: conn.config.clientEmail,
          private_key: conn.config.privateKey,
        },
      };
      if (conn.config.apiEndpoint) {
        storageConfig.apiEndpoint = conn.config.apiEndpoint;
      }
      const client = new Storage(storageConfig);
      await client.createBucket(bucketName);
    } else {
      throw new Error(`Unsupported provider: ${connection.provider}`);
    }
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('already exists') ||
        error.message.includes('BucketAlreadyOwnedByYou') ||
        error.message.includes('ContainerAlreadyExists'))
    ) {
      // Bucket already exists, that's fine
      return;
    }
    throw error;
  }
}

/**
 * Seeds test data into a bucket
 */
export async function seedTestData(
  providerId: string,
  bucketName: string,
  options: SeedOptions = {}
): Promise<TestObject[]> {
  const {
    count = 10,
    includeFolders = true,
    includeNested = false,
    prefix = '',
  } = options;

  const connection = connectionManager.getConnection(providerId);
  if (!connection) {
    throw new Error(`Connection "${providerId}" not found`);
  }

  const provider = await createStorageProvider(connection);
  const testObjects: TestObject[] = [];

  // Upload files in batches
  const batchSize = 10;
  const batches: Promise<void>[] = [];

  for (let i = 0; i < count; i++) {
    const fileKey = generateFileKey(i, prefix, includeFolders, includeNested);
    const fileSize = Math.floor(Math.random() * (1024 * 1024 - 1024) + 1024); // 1KB to 1MB
    const content = generateFileContent(fileSize);
    const contentType = getContentType(fileKey);

    const uploadPromise = provider
      .putObject(bucketName, fileKey, content, contentType)
      .then(() => {
        testObjects.push({
          key: fileKey,
          size: fileSize,
          contentType,
        });
      })
      .catch((error) => {
        throw new Error(`Failed to upload ${fileKey}: ${error.message}`);
      });

    batches.push(uploadPromise);

    if (batches.length >= batchSize) {
      await Promise.all(batches);
      batches.length = 0;
    }
  }

  if (batches.length > 0) {
    await Promise.all(batches);
  }

  return testObjects;
}

/**
 * Deletes all objects in a bucket and then deletes the bucket
 */
export async function cleanupBucket(providerId: string, bucketName: string): Promise<void> {
  const connection = connectionManager.getConnection(providerId);
  if (!connection) {
    throw new Error(`Connection "${providerId}" not found`);
  }

  try {
    if (connection.provider === 'aws-s3') {
      const conn = connection as AWSS3Connection;
      const config: {
        region: string;
        credentials: { accessKeyId: string; secretAccessKey: string };
        endpoint?: string;
        forcePathStyle?: boolean;
      } = {
        region: conn.config.region,
        credentials: {
          accessKeyId: conn.config.accessKeyId,
          secretAccessKey: conn.config.secretAccessKey,
        },
      };
      if (conn.config.endpoint) {
        config.endpoint = conn.config.endpoint;
        config.forcePathStyle = true;
      }
      const client = new S3Client(config);

      // List and delete all objects
      let continuationToken: string | undefined;
      do {
        const listCommand = new ListObjectsV2Command({
          Bucket: bucketName,
          ContinuationToken: continuationToken,
        });
        const listResponse = await client.send(listCommand);

        if (listResponse.Contents && listResponse.Contents.length > 0) {
          for (const object of listResponse.Contents) {
            if (object.Key) {
              const deleteCommand = new DeleteObjectCommand({
                Bucket: bucketName,
                Key: object.Key,
              });
              await client.send(deleteCommand);
            }
          }
        }

        continuationToken = listResponse.NextContinuationToken;
      } while (continuationToken);

      // Delete bucket
      const deleteBucketCommand = new DeleteBucketCommand({ Bucket: bucketName });
      await client.send(deleteBucketCommand);
    } else if (connection.provider === 'azure-blob') {
      const conn = connection as AzureBlobConnection;
      const sharedKeyCredential = new StorageSharedKeyCredential(
        conn.config.accountName,
        conn.config.accountKey
      );
      const endpoint = conn.config.endpoint
        ? conn.config.endpoint
        : `https://${conn.config.accountName}.blob.core.windows.net`;
      const client = new BlobServiceClient(endpoint, sharedKeyCredential);
      const containerClient = client.getContainerClient(bucketName);

      // List and delete all blobs
      for await (const blob of containerClient.listBlobsFlat()) {
        await containerClient.deleteBlob(blob.name);
      }

      // Delete container
      await containerClient.delete();
    } else if (connection.provider === 'gcp-storage') {
      const conn = connection as GCPStorageConnection;
      const storageConfig: {
        projectId: string;
        credentials: { client_email: string; private_key: string };
        apiEndpoint?: string;
      } = {
        projectId: conn.config.projectId,
        credentials: {
          client_email: conn.config.clientEmail,
          private_key: conn.config.privateKey,
        },
      };
      if (conn.config.apiEndpoint) {
        storageConfig.apiEndpoint = conn.config.apiEndpoint;
      }
      const client = new Storage(storageConfig);
      const bucket = client.bucket(bucketName);

      // Delete all objects
      const [files] = await bucket.getFiles();
      await Promise.all(files.map((file) => file.delete()));

      // Delete bucket
      await bucket.delete();
    }
  } catch (error) {
    // Ignore errors if bucket doesn't exist
    if (
      error instanceof Error &&
      (error.message.includes('NoSuchBucket') ||
        error.message.includes('ContainerNotFound') ||
        error.message.includes('not found'))
    ) {
      return;
    }
    throw error;
  }
}
