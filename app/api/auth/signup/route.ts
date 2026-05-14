import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { username, email, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'username and password are required' }, { status: 400 });
    }

    const cleanUsername = String(username).trim();
    const cleanEmail = email ? String(email).trim() : null;
    const cleanPassword = String(password);

    if (cleanUsername.length < 3 || cleanPassword.length < 8) {
      return NextResponse.json({ error: 'username/password too short' }, { status: 400 });
    }

    const [exists] = await pool.query('SELECT ID FROM Users WHERE Username = ? LIMIT 1', [cleanUsername]);
    if ((exists as Array<{ ID: number }>).length > 0) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
    }

    const passwordHash = await hashPassword(cleanPassword);
    const [insert] = await pool.query(
      'INSERT INTO Users (Username, Email, PasswordHash, VP_Balance, IsAdmin) VALUES (?, ?, ?, 500, 0)',
      [cleanUsername, cleanEmail, passwordHash],
    );

    const userId = Number((insert as { insertId: number }).insertId);

    return NextResponse.json({ ok: true, user: { ID: userId, Username: cleanUsername, VP_Balance: 500, IsAdmin: false } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Signup failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
