import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { userId, bundleId, priceVP, skinIds } = await request.json();

    if (!userId || !bundleId || !priceVP || !Array.isArray(skinIds) || skinIds.length === 0) {
      return NextResponse.json({ error: 'userId, bundleId, priceVP, skinIds[] required' }, { status: 400 });
    }

    await pool.query('CALL ProcessBundlePurchase(?, ?, ?, ?)', [
      Number(userId),
      String(bundleId),
      Number(priceVP),
      JSON.stringify(skinIds.map((skinId) => String(skinId)))
    ]);

    const [newVpRows] = await pool.query('SELECT VP_Balance FROM Users WHERE ID = ?', [Number(userId)]);
    const vpBalance = Number((newVpRows as Array<{ VP_Balance: number }>)[0]?.VP_Balance ?? 0);

    return NextResponse.json({ ok: true, vpBalance });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Bundle purchase failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
