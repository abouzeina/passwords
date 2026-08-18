import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { signToken, COOKIE_NAME } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName } = await request.json();

    if (!email || !password || password.length < 6) {
      return NextResponse.json(
        { error: 'يرجى إدخال بريد إلكتروني صحيح وكلمة مرور لا تقل عن 6 أحرف.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'هذا البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول.' },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Create user and default workspaces
    const user = await prisma.user.create({
      data: {
        email: cleanEmail,
        passwordHash,
        fullName: fullName || cleanEmail.split('@')[0],
        workspaces: {
          create: [
            { name: 'الخزنة الشخصية', icon: 'Home', desc: 'حساباتك الشخصية والخاصة' },
            { name: 'مساحة العمل', icon: 'Briefcase', desc: 'حسابات وإيميلات العمل والمشاريع' },
          ],
        },
      },
    });

    const token = await signToken({ userId: user.id, email: user.email });

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, fullName: user.fullName },
    });

    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء إنشاء الحساب: ' + (error.message || 'يرجى المحاولة لاحقاً') },
      { status: 500 }
    );
  }
}
