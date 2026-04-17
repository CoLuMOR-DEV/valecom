import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { username, email, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'username and password are required' }, { status: 400 });
    }

    const cleanUsername = String(username).trim();
    const cleanEmail = email ? String(email).trim() : null;

    if (cleanUsername.length < 3 || String(password).length < 4) {
      return NextResponse.json({ error: 'username/password too short' }, { status: 400 });
    }

    const [exists] = await pool.query('SELECT ID FROM Users WHERE Username = ? LIMIT 1', [cleanUsername]);
    if ((exists as Array<{ ID: number }>).length > 0) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
    }

    const [insert] = await pool.query(
      'INSERT INTO Users (Username, Email, PasswordHash, VP_Balance) VALUES (?, ?, ?, 500)',
      [cleanUsername, cleanEmail, String(password)]
    );

    const userId = Number((insert as { insertId: number }).insertId);

    return NextResponse.json({ ok: true, user: { ID: userId, Username: cleanUsername, VP_Balance: 500 } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Signup failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
