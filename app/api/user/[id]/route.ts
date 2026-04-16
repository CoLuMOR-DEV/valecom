import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

type Params = { params: { id: string } };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const userId = Number(params.id);
    if (!userId) {
      return NextResponse.json({ error: 'Invalid user id' }, { status: 400 });
    }

    const [users] = await pool.query('SELECT ID, Username, VP_Balance FROM Users WHERE ID = ?', [userId]);
    const user = (users as Array<{ ID: number; Username: string; VP_Balance: number }>)[0];

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const [owned] = await pool.query('SELECT SkinID, LevelUnlocked FROM OwnedSkins WHERE UserID = ?', [userId]);

    return NextResponse.json({ user, ownedSkins: owned });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'User fetch failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
