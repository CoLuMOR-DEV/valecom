import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { hashPassword, requireAdminPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const adminPassword = request.headers.get('x-admin-password') ?? '';
    const admin = await requireAdminPassword(adminPassword);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized admin request' }, { status: 401 });
    }

    const { username, email, password, initialVp, isAdmin } = await request.json();
    const cleanUsername = String(username ?? '').trim();
    const cleanEmail = email ? String(email).trim() : null;
    const cleanPassword = String(password ?? '');
    const startingVp = Math.max(Number(initialVp ?? 500), 0);

    if (cleanUsername.length < 3) {
      return NextResponse.json({ error: 'Username must be at least 3 characters' }, { status: 400 });
    }

    if (cleanPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const passwordHash = await hashPassword(cleanPassword);
    const [insert] = await pool.query(
      `INSERT INTO Users (Username, Email, PasswordHash, VP_Balance, IsAdmin)
       VALUES (?, ?, ?, ?, ?)`,
      [cleanUsername, cleanEmail, passwordHash, startingVp, Boolean(isAdmin) ? 1 : 0],
    );

    const userId = Number((insert as { insertId: number }).insertId);

    return NextResponse.json({
      ok: true,
      user: {
        ID: userId,
        Username: cleanUsername,
        Email: cleanEmail,
        VP_Balance: startingVp,
        IsAdmin: Boolean(isAdmin),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Account creation failed';
    const status = message.includes('Duplicate') ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
