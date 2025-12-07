import { NextRequest, NextResponse } from 'next/server';
import { connectionManager } from '@/lib/storage/connection-store';
import { createStorageProvider } from '@/lib/storage/provider-factory';

type RouteContext = {
  params: Promise<{ bucket: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { bucket } = await context.params;
  const searchParams = request.nextUrl.searchParams;
  const key = searchParams.get('key');
  const connectionId = searchParams.get('connectionId');

  if (!connectionId) {
    return NextResponse.json({ error: 'connectionId is required' }, { status: 400 });
  }

  if (!key) {
    return NextResponse.json({ error: 'key is required' }, { status: 400 });
  }

  try {
    // Get the connection
    const connection = connectionManager.getConnection(connectionId);

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Create storage provider
    const provider = await createStorageProvider(connection);

    // Get object metadata
    const metadata = await provider.getObjectMetadata(bucket, key);

    return NextResponse.json({
      bucket,
      ...metadata,
      key, // Override if metadata contains key
    });
  } catch (error) {
    console.error('Error getting object metadata:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to get object metadata';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
