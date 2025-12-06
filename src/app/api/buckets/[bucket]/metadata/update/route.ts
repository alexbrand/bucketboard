import { NextRequest, NextResponse } from 'next/server';
import { createStorageProvider } from '@/lib/storage/provider-factory';
import { credentialManager } from '@/lib/storage/credential-store';

export async function PUT(
  request: NextRequest,
  { params }: { params: { bucket: string } }
) {
  try {
    const { bucket } = params;
    const body = await request.json();
    const { credentialId, key, metadata, tags, storageClass, contentType } = body;

    if (!credentialId) {
      return NextResponse.json({ error: 'Credential ID is required' }, { status: 400 });
    }

    if (!key) {
      return NextResponse.json({ error: 'Object key is required' }, { status: 400 });
    }

    // Get the credential
    const credential = credentialManager.getCredential(credentialId);
    if (!credential) {
      return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
    }

    // Get the storage provider
    const provider = createStorageProvider(credential);

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
