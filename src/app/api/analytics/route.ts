import { NextRequest, NextResponse } from 'next/server';
import { createStorageProvider } from '@/lib/storage/provider-factory';
import { credentialManager } from '@/lib/storage/credential-store';

interface BucketAnalytics {
  name: string;
  totalSize: number;
  objectCount: number;
  fileTypes: Record<string, number>;
  storageClasses: Record<string, number>;
  largestFiles: Array<{ key: string; size: number }>;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const credentialId = searchParams.get('credentialId');

    if (!credentialId) {
      return NextResponse.json({ error: 'Credential ID is required' }, { status: 400 });
    }

    // Get the credential
    const credential = credentialManager.getCredential(credentialId);
    if (!credential) {
      return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
    }

    // Get the storage provider
    const provider = createStorageProvider(credential);

    // Get all buckets
    const buckets = await provider.listBuckets();

    // Collect analytics for each bucket
    const bucketAnalytics: BucketAnalytics[] = [];
    let totalStorageSize = 0;
    let totalObjectCount = 0;
    const globalFileTypes: Record<string, number> = {};
    const globalStorageClasses: Record<string, number> = {};

    for (const bucket of buckets) {
      try {
        // List all objects in the bucket (without delimiter for full scan)
        const result = await provider.listObjects({
          bucket: bucket.name,
          maxKeys: 1000, // Limit for performance
        });

        let bucketSize = 0;
        let objectCount = 0;
        const fileTypes: Record<string, number> = {};
        const storageClasses: Record<string, number> = {};
        const allFiles: Array<{ key: string; size: number }> = [];

        for (const obj of result.objects) {
          if (obj.isFolder) continue;

          objectCount++;
          bucketSize += obj.size;

          // Track file types
          const ext = obj.key.split('.').pop()?.toLowerCase() || 'no-extension';
          fileTypes[ext] = (fileTypes[ext] || 0) + 1;
          globalFileTypes[ext] = (globalFileTypes[ext] || 0) + 1;

          // Track storage classes
          if (obj.storageClass) {
            storageClasses[obj.storageClass] = (storageClasses[obj.storageClass] || 0) + 1;
            globalStorageClasses[obj.storageClass] = (globalStorageClasses[obj.storageClass] || 0) + 1;
          }

          // Track for largest files
          allFiles.push({ key: obj.key, size: obj.size });
        }

        // Get top 5 largest files
        const largestFiles = allFiles.sort((a, b) => b.size - a.size).slice(0, 5);

        bucketAnalytics.push({
          name: bucket.name,
          totalSize: bucketSize,
          objectCount,
          fileTypes,
          storageClasses,
          largestFiles,
        });

        totalStorageSize += bucketSize;
        totalObjectCount += objectCount;
      } catch (error) {
        console.error(`Error analyzing bucket ${bucket.name}:`, error);
        // Continue with other buckets
      }
    }

    // Sort buckets by size
    bucketAnalytics.sort((a, b) => b.totalSize - a.totalSize);

    return NextResponse.json({
      summary: {
        totalBuckets: buckets.length,
        totalStorageSize,
        totalObjectCount,
        fileTypes: globalFileTypes,
        storageClasses: globalStorageClasses,
      },
      buckets: bucketAnalytics,
    });
  } catch (error) {
    console.error('Error generating analytics:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate analytics' },
      { status: 500 }
    );
  }
}
