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
    const { name, icon, desc } = await request.json();

    const workspace = await prisma.workspace.update({
      where: { id, userId: session.userId },
      data: {
        name: name ? name.trim() : undefined,
        icon: icon || undefined,
        desc: desc !== undefined ? desc.trim() : undefined,
      },
    });

    return NextResponse.json({ success: true, workspace });
  } catch (error: any) {
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

    // Reset workspaceId on affected vault items
    await prisma.vaultItem.updateMany({
      where: { workspaceId: id, userId: session.userId },
      data: { workspaceId: null },
    });

    await prisma.workspace.deleteMany({
      where: { id, userId: session.userId },
    });

    return NextResponse.json({ success: true, message: 'Workspace deleted' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
