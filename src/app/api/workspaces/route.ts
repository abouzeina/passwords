import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthUserFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspaces = await prisma.workspace.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: 'asc' },
      include: {
        _count: {
          select: { vaultItems: true },
        },
      },
    });

    return NextResponse.json({ workspaces });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthUserFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, icon, desc } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'يرجى كتابة اسم مساحة العمل' }, { status: 400 });
    }

    const workspace = await prisma.workspace.create({
      data: {
        userId: session.userId,
        name: name.trim(),
        icon: icon || 'Briefcase',
        desc: desc ? desc.trim() : null,
      },
    });

    return NextResponse.json({ success: true, workspace });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
