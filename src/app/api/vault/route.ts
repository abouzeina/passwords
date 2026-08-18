import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthUserFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [items, workspaces] = await Promise.all([
      prisma.vaultItem.findMany({
        where: { userId: session.userId },
        orderBy: [{ isFavorite: 'desc' }, { createdAt: 'desc' }],
        include: { workspace: true },
      }),
      prisma.workspace.findMany({
        where: { userId: session.userId },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    return NextResponse.json({ items, workspaces });
  } catch (error: any) {
    console.error('Fetch vault error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthUserFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, username, password, urls, category, notes, isFavorite, workspaceId } = await request.json();

    if (!name || !username || !password) {
      return NextResponse.json({ error: 'يرجى ملء جميع الحقول المطلوبة (الاسم، المستخدم، كلمة المرور)' }, { status: 400 });
    }

    const item = await prisma.vaultItem.create({
      data: {
        userId: session.userId,
        workspaceId: workspaceId || null,
        name: name.trim(),
        username: username.trim(),
        password,
        urls: Array.isArray(urls) ? urls.filter((u: string) => u && u.trim()) : [],
        category: category || 'أخرى',
        notes: notes ? notes.trim() : null,
        isFavorite: Boolean(isFavorite),
      },
      include: { workspace: true },
    });

    return NextResponse.json({ success: true, item });
  } catch (error: any) {
    console.error('Create vault item error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
