import { NextRequest, NextResponse } from 'next/server';
import { findUserByUsername, verifyPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();
    if (!username || !password) {
      return NextResponse.json({ error: 'username and password are required' }, { status: 400 });
    }

    const user = await findUserByUsername(String(username).trim());
    if (!user || !(await verifyPassword(String(password), user.PasswordHash))) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    return NextResponse.json({
      ok: true,
      user: { ID: user.ID, Username: user.Username, VP_Balance: user.VP_Balance, IsAdmin: Boolean(user.IsAdmin) },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Login failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
