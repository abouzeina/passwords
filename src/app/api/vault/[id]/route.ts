import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthUserFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();

    // Verify ownership
    const existing = await prisma.vaultItem.findFirst({
      where: { id, userId: session.userId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.username !== undefined) updateData.username = body.username.trim();
    if (body.password !== undefined) updateData.password = body.password;
    if (body.urls !== undefined) updateData.urls = Array.isArray(body.urls) ? body.urls.filter((u: string) => u && u.trim()) : [];
    if (body.category !== undefined) updateData.category = body.category;
    if (body.notes !== undefined) updateData.notes = body.notes ? body.notes.trim() : null;
    if (body.isFavorite !== undefined) updateData.isFavorite = Boolean(body.isFavorite);
    if (body.workspaceId !== undefined) updateData.workspaceId = body.workspaceId || null;

    const item = await prisma.vaultItem.update({
      where: { id },
      data: updateData,
      include: { workspace: true },
    });

    return NextResponse.json({ success: true, item });
  } catch (error: any) {
    console.error('Update vault item error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthUserFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Verify ownership and delete atomically
    const deleteResult = await prisma.vaultItem.deleteMany({
      where: { id, userId: session.userId },
    });

    if (deleteResult.count === 0) {
      return NextResponse.json({ error: 'Item not found or already deleted' }, { status: 404 });
    }

    return NextResponse.json({ success: true, deletedId: id, message: 'Item deleted permanently from database' });
  } catch (error: any) {
    console.error('Delete vault item error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
