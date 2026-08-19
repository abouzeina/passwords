import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthUserFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { items, workspaces } = await request.json();

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'لا توجد بيانات للاستيراد' }, { status: 400 });
    }

    // First ensure default or custom workspaces exist
    let userWorkspaces = await prisma.workspace.findMany({
      where: { userId: session.userId },
    });

    if (userWorkspaces.length === 0) {
      await prisma.workspace.createMany({
        data: [
          { userId: session.userId, name: 'الخزنة الشخصية', icon: 'Home', desc: 'حساباتك الشخصية والخاصة' },
          { userId: session.userId, name: 'مساحة العمل', icon: 'Briefcase', desc: 'حسابات وإيميلات العمل والمشاريع' },
        ],
      });
      userWorkspaces = await prisma.workspace.findMany({
        where: { userId: session.userId },
      });
    }

    const defaultWorkspaceId = userWorkspaces[0]?.id || null;

    let importedCount = 0;

    for (const item of items) {
      if (!item || !item.name || !item.password) continue;

      // Check if duplicate item exists
      const existing = await prisma.vaultItem.findFirst({
        where: {
          userId: session.userId,
          name: item.name,
          username: item.username || '',
        },
      });

      if (!existing) {
        let urlsArr: string[] = [];
        if (Array.isArray(item.urls)) {
          urlsArr = item.urls;
        } else if (typeof item.url === 'string' && item.url) {
          urlsArr = [item.url];
        }

        await prisma.vaultItem.create({
          data: {
            userId: session.userId,
            workspaceId: item.workspaceId || defaultWorkspaceId,
            name: item.name,
            username: item.username || '',
            password: item.password,
            urls: urlsArr.filter((u) => u && typeof u === 'string'),
            category: item.category || 'أخرى',
            notes: item.notes || null,
            isFavorite: Boolean(item.isFavorite),
          },
        });
        importedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      importedCount,
      message: `تم استيراد ${importedCount} حساب بنجاح!`,
    });
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
