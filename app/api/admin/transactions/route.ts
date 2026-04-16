import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const [rows] = await pool.query(
      `SELECT TransactionID, UserID, SkinID, PurchasedLevel, VP_Cost, TransactionType, CreatedAt
       FROM Transactions
       ORDER BY CreatedAt DESC
       LIMIT 300`
    );

    const [summaryRows] = await pool.query(
      `SELECT
          COUNT(*) AS transactionCount,
          COALESCE(SUM(VP_Cost), 0) AS totalVPSpent,
          COUNT(DISTINCT UserID) AS activeUsers,
          MAX(CreatedAt) AS lastPurchaseAt
       FROM Transactions`
    );

    const [userRows] = await pool.query('SELECT ID, Username, VP_Balance FROM Users ORDER BY ID ASC');

    return NextResponse.json({
      transactions: rows,
      summary: (summaryRows as Array<Record<string, unknown>>)[0] ?? {},
      users: userRows
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown admin query error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
