import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();
    if (!username || !password) {
      return NextResponse.json({ error: 'username and password are required' }, { status: 400 });
    }

    const [rows] = await pool.query(
      'SELECT ID, Username, VP_Balance, PasswordHash FROM Users WHERE Username = ? LIMIT 1',
      [String(username).trim()]
    );

    const user = (rows as Array<{ ID: number; Username: string; VP_Balance: number; PasswordHash: string }>)[0];
    if (!user || user.PasswordHash !== String(password)) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    return NextResponse.json({ ok: true, user: { ID: user.ID, Username: user.Username, VP_Balance: user.VP_Balance } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Login failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
