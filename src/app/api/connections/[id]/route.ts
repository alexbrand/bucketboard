import { NextRequest, NextResponse } from 'next/server';
import { connectionManager } from '@/lib/storage/connection-store';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const connection = connectionManager.getConnection(id);

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Return full connection including config (for authenticated use)
    return NextResponse.json({ connection });
  } catch (error) {
    console.error('Error retrieving connection:', error);
    return NextResponse.json({ error: 'Failed to retrieve connection' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const body = await request.json();

    const updated = connectionManager.updateConnection(id, body);

    // Remove sensitive config from response
    const sanitized = {
      id: updated.id,
      name: updated.name,
      provider: updated.provider,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };

    return NextResponse.json({
      message: 'Connection updated successfully',
      connection: sanitized,
    });
  } catch (error) {
    console.error('Error updating connection:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update connection';

    if (errorMessage.includes('not found')) {
      return NextResponse.json({ error: errorMessage }, { status: 404 });
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    connectionManager.deleteConnection(id);

    return NextResponse.json({
      message: 'Connection deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting connection:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete connection';

    if (errorMessage.includes('not found')) {
      return NextResponse.json({ error: errorMessage }, { status: 404 });
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
