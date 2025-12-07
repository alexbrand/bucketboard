import { Storage, Bucket as GCPBucket } from '@google-cloud/storage';
import { StorageProvider } from '../interface';
import { Bucket, ListObjectsParams, ListObjectsResponse, StorageObject, UpdateMetadataParams } from '../../types/storage';
import { GCPStorageConnection } from '../../types/connections';

export class GCPStorageProvider implements StorageProvider {
  private client: Storage;
  private projectId: string;

  constructor(connection: GCPStorageConnection) {
    this.projectId = connection.config.projectId;

    const storageConfig: any = {
      projectId: connection.config.projectId,
      credentials: {
        client_email: connection.config.clientEmail,
        private_key: connection.config.privateKey,
      },
    };

    // Use custom endpoint if provided (for fake-gcs-server)
    if (connection.config.apiEndpoint) {
      storageConfig.apiEndpoint = connection.config.apiEndpoint;
    }

    this.client = new Storage(storageConfig);
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      // Test connection by listing buckets
      await this.client.getBuckets();
      return {
        success: true,
        message: `Successfully connected to Google Cloud Storage (${this.projectId})`,
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
      const [buckets] = await this.client.getBuckets();

      return buckets.map((bucket) => {
        // GCP bucket metadata includes location and locationType
        // location can be a single region (e.g., "us-central1") or multi-region (e.g., "US", "EU", "ASIA")
        // locationType indicates if it's "region" or "multi-region"
        const location = bucket.metadata.location as string | undefined;
        const locationType = bucket.metadata.locationType as string | undefined;
        
        // Format region string: if it's a region, use it directly; if multi-region, prefix with "multi-"
        let region: string | undefined;
        if (location) {
          if (locationType === 'multi-region') {
            region = `multi-${location}`;
          } else {
            region = location;
          }
        }

        return {
          name: bucket.name,
          creationDate: bucket.metadata.timeCreated
            ? new Date(bucket.metadata.timeCreated)
            : undefined,
          region,
        };
      });
    } catch (error) {
      console.error('Error listing buckets:', error);
      throw new Error(
        `Failed to list buckets: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async listObjects(params: ListObjectsParams): Promise<ListObjectsResponse> {
    try {
      const bucket = this.client.bucket(params.bucket);
      const objects: StorageObject[] = [];
      const prefix = params.prefix || '';
      const delimiter = params.delimiter || '';

      const [files, , apiResponse] = await bucket.getFiles({
        prefix,
        delimiter,
        maxResults: params.maxKeys || 1000,
        pageToken: params.continuationToken,
      });

      // If using delimiter, add prefixes (folders)
      if (delimiter && apiResponse) {
        const prefixes = (apiResponse as any).prefixes as string[] | undefined;
        if (prefixes) {
          for (const prefixPath of prefixes) {
            objects.push({
              key: prefixPath,
              size: 0,
              lastModified: new Date(),
              isFolder: true,
            });
          }
        }
      }

      // Add files
      for (const file of files) {
        // Skip if it's just the prefix itself
        if (file.name === prefix) continue;

        objects.push({
          key: file.name,
          size: Number(file.metadata.size) || 0,
          lastModified: file.metadata.updated ? new Date(file.metadata.updated) : new Date(),
          etag: file.metadata.etag,
          storageClass: file.metadata.storageClass,
          isFolder: false,
        });
      }

      return {
        objects,
        hasMore: false, // GCP SDK handles pagination internally
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
      const file = this.client.bucket(bucket).file(key);
      const [contents] = await file.download();

      return contents;
    } catch (error) {
      console.error('Error getting object:', error);
      throw new Error(
        `Failed to get object: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async putObject(bucket: string, key: string, data: Buffer, contentType?: string): Promise<void> {
    try {
      const file = this.client.bucket(bucket).file(key);

      await file.save(data, {
        contentType,
      });
    } catch (error) {
      console.error('Error putting object:', error);
      throw new Error(
        `Failed to put object: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async deleteObject(bucket: string, key: string): Promise<void> {
    try {
      const file = this.client.bucket(bucket).file(key);

      await file.delete();
    } catch (error) {
      console.error('Error deleting object:', error);
      throw new Error(
        `Failed to delete object: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async deleteObjects(bucket: string, keys: string[]): Promise<void> {
    try {
      const bucketRef = this.client.bucket(bucket);

      // GCP doesn't have a batch delete API, so delete in parallel
      const deletePromises = keys.map((key) => {
        const file = bucketRef.file(key);
        return file.delete();
      });

      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Error deleting objects:', error);
      throw new Error(
        `Failed to delete objects: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async getObjectMetadata(bucket: string, key: string): Promise<StorageObject> {
    try {
      const file = this.client.bucket(bucket).file(key);
      const [metadata] = await file.getMetadata();

      // Convert metadata values to strings
      const metadataRecord: Record<string, string> = {};
      if (metadata.metadata) {
        for (const [key, value] of Object.entries(metadata.metadata)) {
          if (value !== null && value !== undefined) {
            metadataRecord[key] = String(value);
          }
        }
      }

      return {
        key,
        size: Number(metadata.size) || 0,
        lastModified: metadata.updated ? new Date(metadata.updated) : new Date(),
        etag: metadata.etag,
        storageClass: metadata.storageClass,
        contentType: metadata.contentType,
        metadata: metadataRecord,
        // GCP doesn't have tags like S3/Azure, but uses labels on the bucket level
        tags: {},
        isFolder: false,
      };
    } catch (error) {
      console.error('Error getting object metadata:', error);
      throw new Error(
        `Failed to get object metadata: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async updateObjectMetadata(bucket: string, key: string, updates: UpdateMetadataParams): Promise<void> {
    try {
      const file = this.client.bucket(bucket).file(key);
      const updateData: any = {};

      // Update custom metadata
      if (updates.metadata) {
        updateData.metadata = updates.metadata;
      }

      // Update content type
      if (updates.contentType) {
        updateData.contentType = updates.contentType;
      }

      // Update storage class
      if (updates.storageClass) {
        updateData.storageClass = updates.storageClass;
      }

      // Apply metadata updates
      if (Object.keys(updateData).length > 0) {
        await file.setMetadata(updateData);
      }

      // Note: GCP doesn't support object-level tags like S3/Azure
      // Tags in GCP are bucket-level labels, not object-level
      if (updates.tags && Object.keys(updates.tags).length > 0) {
        console.warn('GCP Storage does not support object-level tags. Use metadata instead.');
      }
    } catch (error) {
      console.error('Error updating object metadata:', error);
      throw new Error(
        `Failed to update object metadata: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
