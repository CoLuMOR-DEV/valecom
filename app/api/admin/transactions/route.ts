import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const [rows] = await pool.query(
      `SELECT TransactionID, UserID, SkinID, PurchasedLevel, VP_Cost, TransactionType, CreatedAt
       FROM Transactions
       ORDER BY CreatedAt DESC
       LIMIT 200`
    );

    return NextResponse.json({ transactions: rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown admin query error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
