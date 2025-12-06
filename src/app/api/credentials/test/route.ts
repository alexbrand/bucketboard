import { NextRequest, NextResponse } from 'next/server';
import { createStorageProvider } from '@/lib/storage/provider-factory';
import { Credentials } from '@/lib/types/credentials';
import { substituteEnvVarsInObject } from '@/lib/utils/env-substitution';
import { credentialManager } from '@/lib/storage/credential-store';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let credentials: Credentials;

    // Check if testing by credential ID or by raw credentials
    if (body.credentialId) {
      // Fetch the credential from storage
      const storedCredential = credentialManager.getCredential(body.credentialId);
      if (!storedCredential) {
        return NextResponse.json(
          {
            success: false,
            message: 'Credential not found',
          },
          { status: 404 }
        );
      }
      credentials = storedCredential;
    } else {
      // Use the provided credentials
      credentials = body as Credentials;
    }

    // Substitute environment variables in the credentials
    const processedCredentials = substituteEnvVarsInObject(credentials);

    // Create a provider instance
    const provider = createStorageProvider(processedCredentials);

    // Test the connection
    const result = await provider.testConnection();

    return NextResponse.json(result, {
      status: result.success ? 200 : 400,
    });
  } catch (error) {
    console.error('Error testing connection:', error);
    return NextResponse.json(
      {
        success: false,
        message: `Error testing connection: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      { status: 500 }
    );
  }
}

