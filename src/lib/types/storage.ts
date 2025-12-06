export interface Bucket {
  name: string;
  creationDate?: Date;
  region?: string;
}

export interface StorageObject {
  key: string;
  size: number;
  lastModified: Date;
  etag?: string;
  storageClass?: string;
  isFolder?: boolean;
  contentType?: string;
  metadata?: Record<string, string>;
  tags?: Record<string, string>;
}

export interface UpdateMetadataParams {
  metadata?: Record<string, string>;
  tags?: Record<string, string>;
  storageClass?: string;
  contentType?: string;
}

export interface ListObjectsParams {
  bucket: string;
  prefix?: string;
  delimiter?: string;
  maxKeys?: number;
  continuationToken?: string;
}

export interface ListObjectsResponse {
  objects: StorageObject[];
  continuationToken?: string;
  hasMore: boolean;
}
