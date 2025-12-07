import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  ContainerItem,
  BlobItem,
} from '@azure/storage-blob';
import { StorageProvider } from '../interface';
import { Bucket, ListObjectsParams, ListObjectsResponse, StorageObject, UpdateMetadataParams } from '../../types/storage';
import { AzureBlobConnection } from '../../types/connections';

export class AzureBlobProvider implements StorageProvider {
  private client: BlobServiceClient;
  private accountName: string;

  constructor(connection: AzureBlobConnection) {
    this.accountName = connection.config.accountName;

    const sharedKeyCredential = new StorageSharedKeyCredential(
      connection.config.accountName,
      connection.config.accountKey
    );

    // Use custom endpoint if provided (for Azurite), otherwise use default Azure endpoint
    const endpoint = connection.config.endpoint 
      ? connection.config.endpoint
      : `https://${connection.config.accountName}.blob.core.windows.net`;

    this.client = new BlobServiceClient(
      endpoint,
      sharedKeyCredential
    );
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      // Test connection by listing containers
      const iterator = this.client.listContainers();
      await iterator.next();
      return {
        success: true,
        message: `Successfully connected to Azure Blob Storage (${this.accountName})`,
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
      // Note: Azure Blob Storage location is at the storage account level, not container level.
      // To get the location, we would need to use the Azure Resource Manager API, which requires
      // additional connection details (subscription ID, resource group) that are not in the current
      // connection structure. For now, region will be undefined for Azure containers.
      const buckets: Bucket[] = [];

      for await (const container of this.client.listContainers()) {
        buckets.push({
          name: container.name,
          creationDate: container.properties.lastModified,
          // region is undefined - would require Azure Resource Manager API access
        });
      }

      return buckets;
    } catch (error) {
      console.error('Error listing containers:', error);
      throw new Error(
        `Failed to list containers: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async listObjects(params: ListObjectsParams): Promise<ListObjectsResponse> {
    try {
      const containerClient = this.client.getContainerClient(params.bucket);
      const objects: StorageObject[] = [];
      const prefix = params.prefix || '';
      const delimiter = params.delimiter || '';

      if (delimiter) {
        // Hierarchical listing with delimiter
        const prefixes = new Set<string>();

        for await (const item of containerClient.listBlobsByHierarchy(delimiter, { prefix })) {
          if (item.kind === 'prefix') {
            // This is a folder
            objects.push({
              key: item.name,
              size: 0,
              lastModified: new Date(),
              isFolder: true,
            });
          } else {
            // This is a blob
            objects.push({
              key: item.name,
              size: item.properties.contentLength || 0,
              lastModified: item.properties.lastModified || new Date(),
              etag: item.properties.etag,
              isFolder: false,
            });
          }
        }
      } else {
        // Flat listing
        for await (const blob of containerClient.listBlobsFlat({ prefix })) {
          objects.push({
            key: blob.name,
            size: blob.properties.contentLength || 0,
            lastModified: blob.properties.lastModified || new Date(),
            etag: blob.properties.etag,
            isFolder: false,
          });
        }
      }

      return {
        objects,
        hasMore: false, // Azure SDK handles pagination internally
      };
    } catch (error) {
      console.error('Error listing blobs:', error);
      throw new Error(
        `Failed to list blobs: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async getObject(bucket: string, key: string): Promise<Buffer> {
    try {
      const containerClient = this.client.getContainerClient(bucket);
      const blobClient = containerClient.getBlobClient(key);
      const downloadResponse = await blobClient.download();

      if (!downloadResponse.readableStreamBody) {
        throw new Error('No data received from Azure Blob Storage');
      }

      const chunks: Buffer[] = [];
      for await (const chunk of downloadResponse.readableStreamBody) {
        chunks.push(Buffer.from(chunk));
      }

      return Buffer.concat(chunks);
    } catch (error) {
      console.error('Error getting blob:', error);
      throw new Error(
        `Failed to get blob: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async putObject(bucket: string, key: string, data: Buffer, contentType?: string): Promise<void> {
    try {
      const containerClient = this.client.getContainerClient(bucket);
      const blockBlobClient = containerClient.getBlockBlobClient(key);

      await blockBlobClient.upload(data, data.length, {
        blobHTTPHeaders: {
          blobContentType: contentType,
        },
      });
    } catch (error) {
      console.error('Error putting blob:', error);
      throw new Error(
        `Failed to put blob: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async deleteObject(bucket: string, key: string): Promise<void> {
    try {
      const containerClient = this.client.getContainerClient(bucket);
      const blobClient = containerClient.getBlobClient(key);

      await blobClient.delete();
    } catch (error) {
      console.error('Error deleting blob:', error);
      throw new Error(
        `Failed to delete blob: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async deleteObjects(bucket: string, keys: string[]): Promise<void> {
    try {
      const containerClient = this.client.getContainerClient(bucket);

      // Azure doesn't have a batch delete API, so delete one by one
      const deletePromises = keys.map((key) => {
        const blobClient = containerClient.getBlobClient(key);
        return blobClient.delete();
      });

      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Error deleting blobs:', error);
      throw new Error(
        `Failed to delete blobs: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async getObjectMetadata(bucket: string, key: string): Promise<StorageObject> {
    try {
      const containerClient = this.client.getContainerClient(bucket);
      const blobClient = containerClient.getBlobClient(key);
      const properties = await blobClient.getProperties();

      return {
        key,
        size: properties.contentLength || 0,
        lastModified: properties.lastModified || new Date(),
        etag: properties.etag,
        contentType: properties.contentType,
        metadata: properties.metadata || {},
        isFolder: false,
      };
    } catch (error) {
      console.error('Error getting blob metadata:', error);
      throw new Error(
        `Failed to get blob metadata: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async updateObjectMetadata(bucket: string, key: string, updates: UpdateMetadataParams): Promise<void> {
    try {
      const containerClient = this.client.getContainerClient(bucket);
      const blobClient = containerClient.getBlockBlobClient(key);

      // Update custom metadata if provided
      if (updates.metadata) {
        await blobClient.setMetadata(updates.metadata);
      }

      // Update tags if provided
      if (updates.tags) {
        await blobClient.setTags(updates.tags);
      }

      // Update HTTP headers (content type, storage tier) if provided
      if (updates.contentType) {
        await blobClient.setHTTPHeaders({
          blobContentType: updates.contentType,
        });
      }

      // Note: Azure Blob Storage uses "access tiers" instead of storage classes
      // Common tiers: Hot, Cool, Archive
      if (updates.storageClass) {
        // Map S3 storage classes to Azure access tiers
        const tierMap: Record<string, any> = {
          STANDARD: 'Hot',
          STANDARD_IA: 'Cool',
          GLACIER: 'Archive',
          Hot: 'Hot',
          Cool: 'Cool',
          Archive: 'Archive',
        };
        const tier = tierMap[updates.storageClass] || 'Hot';
        await blobClient.setAccessTier(tier);
      }
    } catch (error) {
      console.error('Error updating blob metadata:', error);
      throw new Error(
        `Failed to update blob metadata: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
