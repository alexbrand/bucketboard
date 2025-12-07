#!/usr/bin/env node
/**
 * Bucket Seeding Script
 * 
 * Seeds a bucket/container with N test files for local testing.
 * 
 * Usage:
 *   pnpm seed <connectionId> <bucketName> [options]
 * 
 * Options:
 *   --count, -c    Number of files to create (default: 100)
 *   --prefix, -p   Prefix for file keys (default: '')
 *   --size, -s     File size in bytes (default: random 1KB-1MB)
 *   --folders, -f  Include folder objects (default: true)
 */

import { connectionManager } from '../src/lib/storage/connection-store';
import { createStorageProvider } from '../src/lib/storage/provider-factory';
import { S3Client, CreateBucketCommand } from '@aws-sdk/client-s3';
import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';
import { Storage } from '@google-cloud/storage';
import { Connection, AWSS3Connection, AzureBlobConnection, GCPStorageConnection } from '../src/lib/types/connections';

interface SeedOptions {
  count: number;
  prefix: string;
  size?: number;
  includeFolders: boolean;
}

// File extensions and content types
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
 * Creates a bucket/container if it doesn't exist
 */
async function ensureBucketExists(
  provider: any,
  connection: Connection,
  bucketName: string
): Promise<void> {
  try {
    const buckets = await provider.listBuckets();
    const exists = buckets.some((b: any) => b.name === bucketName);

    if (exists) {
      console.log(`✓ Bucket "${bucketName}" already exists`);
      return;
    }

    console.log(`Creating bucket "${bucketName}"...`);

    if (connection.provider === 'aws-s3') {
      const conn = connection as AWSS3Connection;
      const config: any = {
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
      console.log(`✓ Created S3 bucket "${bucketName}"`);
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
      console.log(`✓ Created Azure container "${bucketName}"`);
    } else if (connection.provider === 'gcp-storage') {
      const conn = connection as GCPStorageConnection;
      const storageConfig: any = {
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
      console.log(`✓ Created GCP bucket "${bucketName}"`);
    }
  } catch (error) {
    if (error instanceof Error && (error.message.includes('already exists') || error.message.includes('BucketAlreadyOwnedByYou'))) {
      console.log(`✓ Bucket "${bucketName}" already exists`);
    } else {
      throw error;
    }
  }
}

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
function generateFileKey(index: number, prefix: string, includeFolders: boolean): string {
  const ext = FILE_EXTENSIONS[Math.floor(Math.random() * FILE_EXTENSIONS.length)];
  
  // 10% chance of being in a folder if folders are enabled
  if (includeFolders && Math.random() < 0.1) {
    const folderIndex = Math.floor(Math.random() * 10);
    return `${prefix}folder-${folderIndex.toString().padStart(2, '0')}/file-${index.toString().padStart(6, '0')}.${ext}`;
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
 * Seeds a bucket with test files
 */
async function seedBucket(
  connectionId: string,
  bucketName: string,
  options: SeedOptions
): Promise<void> {
  console.log('\n🌱 Bucket Seeding Script');
  console.log('========================\n');

  // Get connection
  const connection = connectionManager.getConnection(connectionId);
  if (!connection) {
    throw new Error(`Connection "${connectionId}" not found`);
  }

  console.log(`Provider: ${connection.provider}`);
  console.log(`Bucket: ${bucketName}`);
  console.log(`Files to create: ${options.count}`);
  console.log(`Prefix: ${options.prefix || '(none)'}`);
  console.log(`Include folders: ${options.includeFolders}\n`);

  // Create provider
  const provider = await createStorageProvider(connection);

  // Test connection
  console.log('Testing connection...');
  const connectionTest = await provider.testConnection();
  if (!connectionTest.success) {
    throw new Error(`Connection failed: ${connectionTest.message}`);
  }
  console.log(`✓ ${connectionTest.message}\n`);

  // Ensure bucket exists
  await ensureBucketExists(provider, connection, bucketName);

  // Generate and upload files
  console.log(`\nUploading ${options.count} files...`);
  const startTime = Date.now();
  let uploaded = 0;
  let errors = 0;

  // Upload files in batches for better performance
  const batchSize = 10;
  const batches: Promise<void>[] = [];

  for (let i = 0; i < options.count; i++) {
    const fileKey = generateFileKey(i, options.prefix, options.includeFolders);
    const fileSize = options.size || Math.floor(Math.random() * (1024 * 1024 - 1024) + 1024); // 1KB to 1MB
    const content = generateFileContent(fileSize);
    const contentType = getContentType(fileKey);

    const uploadPromise = provider
      .putObject(bucketName, fileKey, content, contentType)
      .then(() => {
        uploaded++;
        if (uploaded % 10 === 0) {
          process.stdout.write(`\r  Progress: ${uploaded}/${options.count} files uploaded...`);
        }
      })
      .catch((error) => {
        errors++;
        console.error(`\n  ✗ Error uploading ${fileKey}: ${error.message}`);
      });

    batches.push(uploadPromise);

    // Process in batches
    if (batches.length >= batchSize) {
      await Promise.all(batches);
      batches.length = 0;
    }
  }

  // Wait for remaining uploads
  if (batches.length > 0) {
    await Promise.all(batches);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log(`\n\n✅ Seeding complete!`);
  console.log(`   Uploaded: ${uploaded} files`);
  if (errors > 0) {
    console.log(`   Errors: ${errors} files`);
  }
  console.log(`   Duration: ${duration}s`);
  console.log(`   Average: ${(uploaded / parseFloat(duration)).toFixed(2)} files/sec\n`);
}

// CLI parsing
function parseArgs(): { connectionId: string; bucketName: string; options: SeedOptions } {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: pnpm seed <connectionId> <bucketName> [options]');
    console.error('\nOptions:');
    console.error('  --count, -c <number>    Number of files to create (default: 100)');
    console.error('  --prefix, -p <string>   Prefix for file keys (default: "")');
    console.error('  --size, -s <number>     File size in bytes (default: random 1KB-1MB)');
    console.error('  --no-folders            Disable folder objects');
    process.exit(1);
  }

  const connectionId = args[0];
  const bucketName = args[1];

  const options: SeedOptions = {
    count: 100,
    prefix: '',
    includeFolders: true,
  };

  for (let i = 2; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    if (arg === '--count' || arg === '-c') {
      options.count = parseInt(nextArg, 10);
      if (isNaN(options.count) || options.count < 1) {
        throw new Error('Count must be a positive number');
      }
      i++;
    } else if (arg === '--prefix' || arg === '-p') {
      options.prefix = nextArg || '';
      if (!options.prefix.endsWith('/') && options.prefix) {
        options.prefix += '/';
      }
      i++;
    } else if (arg === '--size' || arg === '-s') {
      options.size = parseInt(nextArg, 10);
      if (isNaN(options.size!) || options.size! < 1) {
        throw new Error('Size must be a positive number');
      }
      i++;
    } else if (arg === '--no-folders') {
      options.includeFolders = false;
    } else {
      console.warn(`Unknown option: ${arg}`);
    }
  }

  return { connectionId, bucketName, options };
}

// Main execution
async function main() {
  try {
    const { connectionId, bucketName, options } = parseArgs();
    await seedBucket(connectionId, bucketName, options);
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
