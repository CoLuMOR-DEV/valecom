import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { userId, vpAmount } = await request.json();

    if (!userId || !vpAmount || Number(vpAmount) <= 0) {
      return NextResponse.json({ error: 'userId and positive vpAmount required' }, { status: 400 });
    }

    await pool.query('UPDATE Users SET VP_Balance = VP_Balance + ? WHERE ID = ?', [
      Number(vpAmount),
      Number(userId)
    ]);

    await pool.query(
      `INSERT INTO Transactions (UserID, SkinID, PurchasedLevel, VP_Cost, TransactionType)
       VALUES (?, 'VP_TOPUP', 0, ?, 'TOPUP')`,
      [Number(userId), Number(vpAmount)]
    );

    const [vpRows] = await pool.query('SELECT CheckTotalVP(?) AS vp', [Number(userId)]);
    const vpBalance = Number((vpRows as Array<{ vp: number }>)[0]?.vp ?? 0);

    return NextResponse.json({ ok: true, vpBalance });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Top-up error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
