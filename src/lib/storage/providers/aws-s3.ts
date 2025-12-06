import {
  S3Client,
  ListBucketsCommand,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { StorageProvider } from '../interface';
import { Bucket, ListObjectsParams, ListObjectsResponse, StorageObject } from '../../types/storage';
import { AWSS3Credentials } from '../../types/credentials';

export class AWSS3Provider implements StorageProvider {
  private client: S3Client;
  private endpoint?: string;
  private region: string;

  constructor(credentials: AWSS3Credentials) {
    this.region = credentials.config.region;
    this.endpoint = credentials.config.endpoint;

    const config: any = {
      region: credentials.config.region,
      credentials: {
        accessKeyId: credentials.config.accessKeyId,
        secretAccessKey: credentials.config.secretAccessKey,
      },
    };

    // Add custom endpoint for S3-compatible services
    if (credentials.config.endpoint) {
      config.endpoint = credentials.config.endpoint;
      // Force path-style URLs for S3-compatible services (required for MinIO, etc.)
      config.forcePathStyle = true;
    }

    this.client = new S3Client(config);
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      // Test connection by listing buckets
      const command = new ListBucketsCommand({});
      await this.client.send(command);
      
      const target = this.endpoint 
        ? `S3-compatible storage at ${this.endpoint}`
        : `AWS S3 (${this.region})`;
      
      return {
        success: true,
        message: `Successfully connected to ${target}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async listBuckets(): Promise<Bucket[]> {
    try {
      const command = new ListBucketsCommand({});
      const response = await this.client.send(command);

      return (response.Buckets || []).map((bucket) => ({
        name: bucket.Name || '',
        creationDate: bucket.CreationDate,
      }));
    } catch (error) {
      console.error('Error listing buckets:', error);
      throw new Error(
        `Failed to list buckets: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async listObjects(params: ListObjectsParams): Promise<ListObjectsResponse> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: params.bucket,
        Prefix: params.prefix || '',
        Delimiter: params.delimiter,
        MaxKeys: params.maxKeys || 1000,
        ContinuationToken: params.continuationToken,
      });

      const response = await this.client.send(command);

      const objects: StorageObject[] = [
        // Add common prefixes (folders)
        ...(response.CommonPrefixes || []).map((prefix) => ({
          key: prefix.Prefix || '',
          size: 0,
          lastModified: new Date(),
          isFolder: true,
        })),
        // Add objects (files)
        ...(response.Contents || []).map((obj) => ({
          key: obj.Key || '',
          size: obj.Size || 0,
          lastModified: obj.LastModified || new Date(),
          etag: obj.ETag,
          storageClass: obj.StorageClass,
          isFolder: false,
        })),
      ];

      return {
        objects,
        continuationToken: response.NextContinuationToken,
        hasMore: response.IsTruncated || false,
      };
    } catch (error) {
      console.error('Error listing objects:', error);
      throw new Error(
        `Failed to list objects: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async getObject(bucket: string, key: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      const response = await this.client.send(command);

      if (!response.Body) {
        throw new Error('No data received from S3');
      }

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body as any) {
        chunks.push(chunk);
      }

      return Buffer.concat(chunks);
    } catch (error) {
      console.error('Error getting object:', error);
      throw new Error(
        `Failed to get object: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async putObject(bucket: string, key: string, data: Buffer, contentType?: string): Promise<void> {
    try {
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: data,
        ContentType: contentType,
      });

      await this.client.send(command);
    } catch (error) {
      console.error('Error putting object:', error);
      throw new Error(
        `Failed to put object: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async deleteObject(bucket: string, key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      await this.client.send(command);
    } catch (error) {
      console.error('Error deleting object:', error);
      throw new Error(
        `Failed to delete object: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async deleteObjects(bucket: string, keys: string[]): Promise<void> {
    try {
      const command = new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
          Objects: keys.map((key) => ({ Key: key })),
        },
      });

      const response = await this.client.send(command);

      // Check for errors in the response
      if (response.Errors && response.Errors.length > 0) {
        const errorKeys = response.Errors.map((e) => e.Key).join(', ');
        throw new Error(`Failed to delete some objects: ${errorKeys}`);
      }
    } catch (error) {
      console.error('Error deleting objects:', error);
      throw new Error(
        `Failed to delete objects: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async getObjectMetadata(bucket: string, key: string): Promise<StorageObject> {
    try {
      const command = new HeadObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      const response = await this.client.send(command);

      return {
        key,
        size: response.ContentLength || 0,
        lastModified: response.LastModified || new Date(),
        etag: response.ETag,
        storageClass: response.StorageClass,
        isFolder: false,
      };
    } catch (error) {
      console.error('Error getting object metadata:', error);
      throw new Error(
        `Failed to get object metadata: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
