import { NextRequest, NextResponse } from 'next/server';
import { createStorageProvider } from '@/lib/storage/provider-factory';
import { connectionManager } from '@/lib/storage/connection-store';

type RouteContext = {
  params: Promise<{ bucket: string }>;
};

export async function PUT(request: NextRequest, context: RouteContext) {
  // Check if read-only mode is enabled
  if (process.env.READ_ONLY === 'true') {
    return NextResponse.json(
      { error: 'Write operations are disabled in read-only mode' },
      { status: 403 }
    );
  }

  try {
    const { bucket } = await context.params;
    const body = await request.json();
    const { connectionId, key, metadata, tags, storageClass, contentType } = body;

    if (!connectionId) {
      return NextResponse.json({ error: 'Connection ID is required' }, { status: 400 });
    }

    if (!key) {
      return NextResponse.json({ error: 'Object key is required' }, { status: 400 });
    }

    // Get the connection
    const connection = connectionManager.getConnection(connectionId);
    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Get the storage provider
    const provider = await createStorageProvider(connection);

    // Update metadata
    await provider.updateObjectMetadata(bucket, key, {
      metadata,
      tags,
      storageClass,
      contentType,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating object metadata:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update metadata' },
      { status: 500 }
    );
  }
}
