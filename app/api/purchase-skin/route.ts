import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { userId, skinId, vpCost } = await request.json();
    if (!userId || !skinId || vpCost === undefined || vpCost === null) {
      return NextResponse.json({ error: 'userId, skinId, vpCost required' }, { status: 400 });
    }

    await pool.query('CALL ProcessSkinPurchase(?, ?, ?, ?)', [Number(userId), String(skinId), 1, Number(vpCost)]);

    const [newVpRows] = await pool.query('SELECT VP_Balance FROM Users WHERE ID = ?', [Number(userId)]);
    const vpBalance = Number((newVpRows as Array<{ VP_Balance: number }>)[0]?.VP_Balance ?? 0);

    return NextResponse.json({ ok: true, vpBalance });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Skin purchase failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
