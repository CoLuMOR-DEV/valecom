import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { userId, skinId, targetLevel } = await request.json();
    if (!userId || !skinId || !targetLevel) {
      return NextResponse.json({ error: 'userId, skinId, targetLevel required' }, { status: 400 });
    }

    const [costRows] = await pool.query('SELECT CalculateUpgradeCost(?, ?, ?) AS cost', [
      Number(userId),
      String(skinId),
      Number(targetLevel)
    ]);

    const [vpRows] = await pool.query('SELECT CheckTotalVP(?) AS vp', [Number(userId)]);

    const cost = Number((costRows as Array<{ cost: number }>)[0]?.cost ?? 0);
    const vp = Number((vpRows as Array<{ vp: number }>)[0]?.vp ?? 0);

    return NextResponse.json({ cost, vp, deficit: Math.max(0, cost - vp) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Cost calculation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
