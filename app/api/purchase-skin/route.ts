import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: NextRequest) {
  let connection;
  try {
    const { userId, skinId, vpCost } = await request.json();
    if (!userId || !skinId || !vpCost) {
      return NextResponse.json({ error: 'userId, skinId, vpCost required' }, { status: 400 });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [vpRows] = await connection.query('SELECT VP_Balance FROM Users WHERE ID = ? FOR UPDATE', [Number(userId)]);
    const currentVP = Number((vpRows as Array<{ VP_Balance: number }>)[0]?.VP_Balance ?? -1);

    if (currentVP < Number(vpCost)) {
      await connection.rollback();
      return NextResponse.json({ error: 'Insufficient VP balance' }, { status: 400 });
    }

    await connection.query('UPDATE Users SET VP_Balance = VP_Balance - ? WHERE ID = ?', [Number(vpCost), Number(userId)]);
    await connection.query(
      `INSERT INTO OwnedSkins (UserID, SkinID, LevelUnlocked)
       VALUES (?, ?, 1)
       ON DUPLICATE KEY UPDATE LevelUnlocked = GREATEST(LevelUnlocked, 1)`,
      [Number(userId), String(skinId)]
    );
    await connection.query(
      `INSERT INTO Transactions (UserID, SkinID, PurchasedLevel, VP_Cost, TransactionType)
       VALUES (?, ?, 1, ?, 'PURCHASE')`,
      [Number(userId), String(skinId), Number(vpCost)]
    );

    const [newVpRows] = await connection.query('SELECT VP_Balance FROM Users WHERE ID = ?', [Number(userId)]);
    const vpBalance = Number((newVpRows as Array<{ VP_Balance: number }>)[0]?.VP_Balance ?? 0);

    await connection.commit();

    return NextResponse.json({ ok: true, vpBalance });
  } catch (error) {
    if (connection) await connection.rollback();
    const message = error instanceof Error ? error.message : 'Skin purchase failed';
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    connection?.release();
  }
}
