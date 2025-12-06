import { NextRequest, NextResponse } from 'next/server';
import { credentialManager } from '@/lib/storage/credential-store';
import { Credentials } from '@/lib/types/credentials';

export async function GET() {
  try {
    const credentials = credentialManager.listCredentials();

    // Remove sensitive config data from response
    const sanitized = credentials.map((cred) => ({
      id: cred.id,
      name: cred.name,
      provider: cred.provider,
      createdAt: cred.createdAt,
      updatedAt: cred.updatedAt,
    }));

    return NextResponse.json({
      credentials: sanitized,
    });
  } catch (error) {
    console.error('Error listing credentials:', error);
    return NextResponse.json({ error: 'Failed to list credentials' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.id || !body.name || !body.provider || !body.config) {
      return NextResponse.json(
        { error: 'Missing required fields: id, name, provider, config' },
        { status: 400 }
      );
    }

    const credential: Credentials = {
      id: body.id,
      name: body.name,
      provider: body.provider,
      config: body.config,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const created = credentialManager.createCredential(credential);

    // Remove sensitive config from response
    const sanitized = {
      id: created.id,
      name: created.name,
      provider: created.provider,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    };

    return NextResponse.json(
      {
        message: 'Credential created successfully',
        credential: sanitized,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating credential:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create credential';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
