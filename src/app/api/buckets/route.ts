import { NextRequest, NextResponse } from 'next/server';
import { connectionManager } from '@/lib/storage/connection-store';
import { createStorageProvider } from '@/lib/storage/provider-factory';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const connectionId = searchParams.get('connectionId');

  if (!connectionId) {
    return NextResponse.json({ error: 'connectionId is required' }, { status: 400 });
  }

  try {
    // Get the connection
    const connection = connectionManager.getConnection(connectionId);

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Create storage provider
    const provider = await createStorageProvider(connection);

    // List buckets
    const buckets = await provider.listBuckets();

    return NextResponse.json({
      buckets,
      connectionId,
    });
  } catch (error) {
    console.error('Error listing buckets:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to list buckets';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
