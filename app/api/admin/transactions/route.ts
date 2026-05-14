import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAdminPassword } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const admin = await requireAdminPassword(request.headers.get('x-admin-password') ?? '');
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized admin request' }, { status: 401 });
    }

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
          COALESCE(SUM(CASE WHEN TransactionType = 'TOPUP' THEN VP_Cost ELSE 0 END), 0) AS totalVPTopup,
          COALESCE(SUM(CASE WHEN TransactionType IN ('PURCHASE','BUNDLE') THEN VP_Cost ELSE 0 END), 0) AS totalVPPurchases,
          COUNT(DISTINCT UserID) AS activeUsers,
          MAX(CreatedAt) AS lastPurchaseAt
       FROM Transactions`
    );

    const [userRows] = await pool.query('SELECT ID, Username, Email, VP_Balance, IsAdmin, CreatedAt FROM Users ORDER BY ID ASC');

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
