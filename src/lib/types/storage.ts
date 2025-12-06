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
