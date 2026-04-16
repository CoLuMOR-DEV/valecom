import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { userId, skinId, level, vpCost } = await request.json();

    if (!userId || !skinId || !level || !vpCost) {
      return NextResponse.json({ error: 'Missing required body fields.' }, { status: 400 });
    }

    const [resultSets] = await pool.query('CALL ProcessUpgradePurchase(?, ?, ?, ?)', [
      Number(userId),
      String(skinId),
      Number(level),
      Number(vpCost)
    ]);

    return NextResponse.json({ ok: true, resultSets });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown purchase error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
