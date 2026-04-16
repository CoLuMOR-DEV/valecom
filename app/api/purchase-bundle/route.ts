import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: NextRequest) {
  let connection;
  try {
    const { userId, bundleId, priceVP, skinIds } = await request.json();

    if (!userId || !bundleId || !priceVP || !Array.isArray(skinIds) || skinIds.length === 0) {
      return NextResponse.json({ error: 'userId, bundleId, priceVP, skinIds[] required' }, { status: 400 });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [vpRows] = await connection.query('SELECT VP_Balance FROM Users WHERE ID = ? FOR UPDATE', [Number(userId)]);
    const currentVP = Number((vpRows as Array<{ VP_Balance: number }>)[0]?.VP_Balance ?? -1);

    if (currentVP < Number(priceVP)) {
      await connection.rollback();
      return NextResponse.json({ error: 'Insufficient VP balance for bundle' }, { status: 400 });
    }

    await connection.query('UPDATE Users SET VP_Balance = VP_Balance - ? WHERE ID = ?', [Number(priceVP), Number(userId)]);

    for (const skinId of skinIds) {
      await connection.query(
        `INSERT INTO OwnedSkins (UserID, SkinID, LevelUnlocked)
         VALUES (?, ?, 1)
         ON DUPLICATE KEY UPDATE LevelUnlocked = GREATEST(LevelUnlocked, 1)`,
        [Number(userId), String(skinId)]
      );
    }

    await connection.query(
      `INSERT INTO Transactions (UserID, SkinID, PurchasedLevel, VP_Cost, TransactionType)
       VALUES (?, ?, 1, ?, 'UPGRADE')`,
      [Number(userId), `BUNDLE:${String(bundleId)}`, Number(priceVP)]
    );

    const [newVpRows] = await connection.query('SELECT VP_Balance FROM Users WHERE ID = ?', [Number(userId)]);
    const vpBalance = Number((newVpRows as Array<{ VP_Balance: number }>)[0]?.VP_Balance ?? 0);

    await connection.commit();

    return NextResponse.json({ ok: true, vpBalance });
  } catch (error) {
    if (connection) await connection.rollback();
    const message = error instanceof Error ? error.message : 'Bundle purchase failed';
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    connection?.release();
  }
}
