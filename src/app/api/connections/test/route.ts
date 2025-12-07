import { NextRequest, NextResponse } from 'next/server';
import { createStorageProvider } from '@/lib/storage/provider-factory';
import { Connection } from '@/lib/types/connections';
import { substituteEnvVarsInObject } from '@/lib/utils/env-substitution';
import { connectionManager } from '@/lib/storage/connection-store';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let connection: Connection;

    // Check if testing by connection ID or by raw connection
    if (body.connectionId) {
      // Fetch the connection from storage
      const storedConnection = connectionManager.getConnection(body.connectionId);
      if (!storedConnection) {
        return NextResponse.json(
          {
            success: false,
            message: 'Connection not found',
          },
          { status: 404 }
        );
      }
      connection = storedConnection;
    } else {
      // Use the provided connection
      connection = body as Connection;
    }

    // Substitute environment variables in the connection
    const processedConnection = substituteEnvVarsInObject(connection);

    // Create a provider instance
    const provider = await createStorageProvider(processedConnection);

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
