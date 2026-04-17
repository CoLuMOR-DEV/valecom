import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { userId, skinId, level, vpCost } = await request.json();

    if (!userId || !skinId || !level || vpCost === undefined || vpCost === null) {
      return NextResponse.json({ error: 'Missing required body fields.' }, { status: 400 });
    }

    await pool.query('CALL ProcessSkinPurchase(?, ?, ?, ?)', [
      Number(userId),
      String(skinId),
      Number(level),
      Number(vpCost)
    ]);

    const [vpRows] = await pool.query('SELECT CheckTotalVP(?) AS vp', [Number(userId)]);
    const vpBalance = Number((vpRows as Array<{ vp: number }>)[0]?.vp ?? 0);

    return NextResponse.json({ ok: true, vpBalance });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown purchase error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
