import { Bucket, ListObjectsParams, ListObjectsResponse, StorageObject, UpdateMetadataParams } from '../types/storage';

export interface StorageProvider {
  testConnection(): Promise<{ success: boolean; message: string }>;
  listBuckets(): Promise<Bucket[]>;
  listObjects(params: ListObjectsParams): Promise<ListObjectsResponse>;
  getObject(bucket: string, key: string): Promise<Buffer>;
  putObject(bucket: string, key: string, data: Buffer, contentType?: string): Promise<void>;
  deleteObject(bucket: string, key: string): Promise<void>;
  deleteObjects(bucket: string, keys: string[]): Promise<void>;
  getObjectMetadata(bucket: string, key: string): Promise<StorageObject>;
  updateObjectMetadata(bucket: string, key: string, updates: UpdateMetadataParams): Promise<void>;
}
