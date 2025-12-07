import { NextRequest, NextResponse } from 'next/server';
import { connectionManager } from '@/lib/storage/connection-store';
import { createStorageProvider } from '@/lib/storage/provider-factory';

type RouteContext = {
  params: Promise<{ bucket: string }>;
};

// Map of file extensions to content types for preview
const CONTENT_TYPE_MAP: Record<string, string> = {
  // Images
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
  ico: 'image/x-icon',

  // Text files
  txt: 'text/plain',
  json: 'application/json',
  xml: 'application/xml',
  html: 'text/html',
  htm: 'text/html',
  css: 'text/css',
  js: 'text/javascript',
  ts: 'text/plain',
  tsx: 'text/plain',
  jsx: 'text/plain',
  md: 'text/markdown',
  yaml: 'text/yaml',
  yml: 'text/yaml',
  csv: 'text/csv',
  log: 'text/plain',

  // Code files
  py: 'text/plain',
  java: 'text/plain',
  cpp: 'text/plain',
  c: 'text/plain',
  h: 'text/plain',
  cs: 'text/plain',
  go: 'text/plain',
  rs: 'text/plain',
  rb: 'text/plain',
  php: 'text/plain',
  sh: 'text/plain',
  bash: 'text/plain',
};

// File extensions that are previewable
const PREVIEWABLE_EXTENSIONS = new Set(Object.keys(CONTENT_TYPE_MAP));

function getContentTypeFromKey(key: string, metadataContentType?: string): string | null {
  // If we have metadata content type and it's previewable, use it
  if (metadataContentType) {
    const type = metadataContentType.toLowerCase();
    if (
      type.startsWith('image/') ||
      type.startsWith('text/') ||
      type === 'application/json' ||
      type === 'application/xml'
    ) {
      return metadataContentType;
    }
  }

  // Otherwise, determine from file extension
  const ext = key.split('.').pop()?.toLowerCase();
  if (ext && CONTENT_TYPE_MAP[ext]) {
    return CONTENT_TYPE_MAP[ext];
  }

  return null;
}

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

    // Get metadata first to check content type
    const metadata = await provider.getObjectMetadata(bucket, key);

    // Determine if the file is previewable
    const contentType = getContentTypeFromKey(key, metadata.contentType);

    if (!contentType) {
      return NextResponse.json(
        {
          error: 'File type not supported for preview',
          supportedTypes: Array.from(PREVIEWABLE_EXTENSIONS),
        },
        { status: 400 }
      );
    }

    // Get object data
    const data = await provider.getObject(bucket, key);

    // Convert Buffer to Uint8Array for NextResponse
    const uint8Array = new Uint8Array(data);

    // Return the file with inline disposition for preview
    return new NextResponse(uint8Array, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': 'inline',
        'Content-Length': data.length.toString(),
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('Error previewing object:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to preview object';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
