import { NextRequest, NextResponse } from 'next/server';
import { credentialManager } from '@/lib/storage/credential-store';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const credential = credentialManager.getCredential(id);

    if (!credential) {
      return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
    }

    // Return full credential including config (for authenticated use)
    return NextResponse.json({ credential });
  } catch (error) {
    console.error('Error retrieving credential:', error);
    return NextResponse.json({ error: 'Failed to retrieve credential' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const body = await request.json();

    const updated = credentialManager.updateCredential(id, body);

    // Remove sensitive config from response
    const sanitized = {
      id: updated.id,
      name: updated.name,
      provider: updated.provider,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };

    return NextResponse.json({
      message: 'Credential updated successfully',
      credential: sanitized,
    });
  } catch (error) {
    console.error('Error updating credential:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update credential';

    if (errorMessage.includes('not found')) {
      return NextResponse.json({ error: errorMessage }, { status: 404 });
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    credentialManager.deleteCredential(id);

    return NextResponse.json({
      message: 'Credential deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting credential:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete credential';

    if (errorMessage.includes('not found')) {
      return NextResponse.json({ error: errorMessage }, { status: 404 });
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
