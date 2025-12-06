import { NextRequest, NextResponse } from 'next/server';
import { credentialManager } from '@/lib/storage/credential-store';
import { createStorageProvider } from '@/lib/storage/provider-factory';

type RouteContext = {
  params: Promise<{ bucket: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { bucket } = await context.params;
  const searchParams = request.nextUrl.searchParams;
  const key = searchParams.get('key');
  const credentialId = searchParams.get('credentialId');

  if (!credentialId) {
    return NextResponse.json({ error: 'credentialId is required' }, { status: 400 });
  }

  if (!key) {
    return NextResponse.json({ error: 'key is required' }, { status: 400 });
  }

  try {
    // Get the credential
    const credential = credentialManager.getCredential(credentialId);

    if (!credential) {
      return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
    }

    // Create storage provider
    const provider = await createStorageProvider(credential);

    // Get object
    const data = await provider.getObject(bucket, key);

    // Get metadata to determine content type
    const metadata = await provider.getObjectMetadata(bucket, key);

    // Extract filename from key
    const filename = key.split('/').pop() || 'download';

    // Return the file with appropriate headers
    // Convert Buffer to Uint8Array for NextResponse
    const uint8Array = new Uint8Array(data);

    return new NextResponse(uint8Array, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': data.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error downloading object:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to download object';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
