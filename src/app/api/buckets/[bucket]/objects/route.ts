import { NextRequest, NextResponse } from 'next/server';
import { connectionManager } from '@/lib/storage/connection-store';
import { createStorageProvider } from '@/lib/storage/provider-factory';

type RouteContext = {
  params: Promise<{ bucket: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { bucket } = await context.params;
  const searchParams = request.nextUrl.searchParams;
  const prefix = searchParams.get('prefix') || '';
  const connectionId = searchParams.get('connectionId');
  const delimiter = searchParams.get('delimiter') || '/';
  const maxKeys = searchParams.get('maxKeys');
  const continuationToken = searchParams.get('continuationToken') || undefined;

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

    // List objects
    const result = await provider.listObjects({
      bucket,
      prefix,
      delimiter,
      maxKeys: maxKeys ? parseInt(maxKeys) : 1000,
      continuationToken,
    });

    return NextResponse.json({
      bucket,
      prefix,
      ...result,
    });
  } catch (error) {
    console.error('Error listing objects:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to list objects';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { bucket } = await context.params;
  const searchParams = request.nextUrl.searchParams;
  const connectionId = searchParams.get('connectionId');

  if (!connectionId) {
    return NextResponse.json({ error: 'connectionId is required' }, { status: 400 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const key = formData.get('key') as string;

    if (!file || !key) {
      return NextResponse.json({ error: 'file and key are required' }, { status: 400 });
    }

    // Get the connection
    const connection = connectionManager.getConnection(connectionId);

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Create storage provider
    const provider = await createStorageProvider(connection);

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload file
    await provider.putObject(bucket, key, buffer, file.type);

    return NextResponse.json(
      {
        bucket,
        key,
        message: 'File uploaded successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error uploading file:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to upload file';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { bucket } = await context.params;
  const body = await request.json();
  const { keys, connectionId } = body;

  if (!connectionId) {
    return NextResponse.json({ error: 'connectionId is required' }, { status: 400 });
  }

  if (!keys || !Array.isArray(keys) || keys.length === 0) {
    return NextResponse.json({ error: 'keys array is required' }, { status: 400 });
  }

  try {
    // Get the connection
    const connection = connectionManager.getConnection(connectionId);

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Create storage provider
    const provider = await createStorageProvider(connection);

    // Delete objects
    await provider.deleteObjects(bucket, keys);

    return NextResponse.json({
      bucket,
      message: 'Objects deleted successfully',
      deletedKeys: keys,
    });
  } catch (error) {
    console.error('Error deleting objects:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete objects';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
