import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

type SaveEntry = { weaponSlot: string; skinId: string };

export async function GET(request: NextRequest) {
  try {
    const userId = Number(request.nextUrl.searchParams.get('userId'));
    if (!userId) {
      return NextResponse.json({ error: 'Valid userId is required' }, { status: 400 });
    }

    const [rows] = await pool.query(
      'SELECT WeaponSlot, SkinID, UpdatedAt FROM LoadoutSelections WHERE UserID = ? ORDER BY WeaponSlot ASC',
      [userId]
    );

    return NextResponse.json({ selections: rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch loadout';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, selections } = (await request.json()) as { userId?: number; selections?: SaveEntry[] };
    if (!userId || !Array.isArray(selections)) {
      return NextResponse.json({ error: 'userId and selections[] are required' }, { status: 400 });
    }

    let savedCount = 0;
    for (const entry of selections) {
      const weaponSlot = String(entry.weaponSlot ?? '').trim();
      const skinId = String(entry.skinId ?? '').trim();
      if (!weaponSlot || !skinId) continue;
      await pool.query('CALL SaveLoadoutSelection(?, ?, ?)', [Number(userId), weaponSlot, skinId]);
      savedCount += 1;
    }

    return NextResponse.json({ ok: true, savedCount });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save loadout';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
