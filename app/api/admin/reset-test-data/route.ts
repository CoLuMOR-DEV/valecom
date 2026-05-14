import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAdminPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const admin = await requireAdminPassword(request.headers.get('x-admin-password') ?? '');
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized admin request' }, { status: 401 });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    await connection.query('DELETE FROM Transactions');
    await connection.query('DELETE FROM OwnedSkins');
    await connection.query('UPDATE Users SET VP_Balance = CASE WHEN ID = 1 THEN 350 WHEN ID = 2 THEN 5000 ELSE VP_Balance END');

    await connection.commit();

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (connection) await connection.rollback();
    const message = error instanceof Error ? error.message : 'Reset failed';
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    connection?.release();
  }
}
