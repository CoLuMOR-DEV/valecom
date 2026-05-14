import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAdminPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdminPassword(request.headers.get('x-admin-password') ?? '');
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized admin request' }, { status: 401 });
    }

    const { userId, vpAmount } = await request.json();
    if (!userId || !vpAmount || Number(vpAmount) <= 0) {
      return NextResponse.json({ error: 'userId and positive vpAmount required' }, { status: 400 });
    }

    await pool.query('UPDATE Users SET VP_Balance = VP_Balance + ? WHERE ID = ?', [Number(vpAmount), Number(userId)]);
    await pool.query(
      `INSERT INTO Transactions (UserID, SkinID, PurchasedLevel, VP_Cost, TransactionType)
       VALUES (?, 'ADMIN_GRANT_VP', 0, ?, 'TOPUP')`,
      [Number(userId), Number(vpAmount)]
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Grant VP failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
