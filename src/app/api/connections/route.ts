import { NextRequest, NextResponse } from 'next/server';
import { connectionManager } from '@/lib/storage/connection-store';
import { Connection } from '@/lib/types/connections';

export async function GET() {
  try {
    const connections = connectionManager.listConnections();

    // Remove sensitive config data from response
    const sanitized = connections.map((conn) => ({
      id: conn.id,
      name: conn.name,
      provider: conn.provider,
      createdAt: conn.createdAt,
      updatedAt: conn.updatedAt,
    }));

    return NextResponse.json({
      connections: sanitized,
    });
  } catch (error) {
    console.error('Error listing connections:', error);
    return NextResponse.json({ error: 'Failed to list connections' }, { status: 500 });
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

    const connection: Connection = {
      id: body.id,
      name: body.name,
      provider: body.provider,
      config: body.config,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const created = connectionManager.createConnection(connection);

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
        message: 'Connection created successfully',
        connection: sanitized,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating connection:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create connection';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
