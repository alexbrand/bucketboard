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
    const provider = createStorageProvider(credential);

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
