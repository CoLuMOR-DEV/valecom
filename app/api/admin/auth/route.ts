import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    if (!password) {
      return NextResponse.json({ error: 'Admin password is required' }, { status: 400 });
    }

    const admin = await requireAdminPassword(String(password));
    if (!admin) {
      return NextResponse.json({ error: 'Invalid admin credentials' }, { status: 401 });
    }

    return NextResponse.json({ ok: true, admin: { ID: admin.ID, Username: admin.Username } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Admin login failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
