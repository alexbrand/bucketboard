import { NextRequest, NextResponse } from 'next/server';
import { credentialManager } from '@/lib/storage/credential-store';
import { createStorageProvider } from '@/lib/storage/provider-factory';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const credentialId = searchParams.get('credentialId');

  if (!credentialId) {
    return NextResponse.json({ error: 'credentialId is required' }, { status: 400 });
  }

  try {
    // Get the credential
    const credential = credentialManager.getCredential(credentialId);

    if (!credential) {
      return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
    }

    // Create storage provider
    const provider = createStorageProvider(credential);

    // List buckets
    const buckets = await provider.listBuckets();

    return NextResponse.json({
      buckets,
      credentialId,
    });
  } catch (error) {
    console.error('Error listing buckets:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to list buckets';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
