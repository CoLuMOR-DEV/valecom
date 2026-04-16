import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { userId, vpAmount } = await request.json();

    if (!userId || !vpAmount) {
      return NextResponse.json({ error: 'userId and vpAmount required' }, { status: 400 });
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

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Top-up error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
