import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { hashPassword, requireAdminPassword } from "@/lib/auth";

async function authorizeAdmin(request: NextRequest) {
  return requireAdminPassword(request.headers.get("x-admin-password") ?? "");
}

export async function POST(request: NextRequest) {
  try {
    const admin = await authorizeAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized admin request" },
        { status: 401 },
      );
    }

    const { username, email, password, initialVp, isAdmin } =
      await request.json();
    const cleanUsername = String(username ?? "").trim();
    const cleanEmail = email ? String(email).trim() : null;
    const cleanPassword = String(password ?? "");
    const startingVp = Math.max(Number(initialVp ?? 500), 0);

    if (cleanUsername.length < 3) {
      return NextResponse.json(
        { error: "Username must be at least 3 characters" },
        { status: 400 },
      );
    }

    if (cleanPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    const passwordHash = await hashPassword(cleanPassword);
    const [insert] = await pool.query(
      `INSERT INTO Users (Username, Email, PasswordHash, VP_Balance, IsAdmin)
       VALUES (?, ?, ?, ?, ?)`,
      [
        cleanUsername,
        cleanEmail,
        passwordHash,
        startingVp,
        Boolean(isAdmin) ? 1 : 0,
      ],
    );

    const userId = Number((insert as { insertId: number }).insertId);

    return NextResponse.json({
      ok: true,
      user: {
        ID: userId,
        Username: cleanUsername,
        Email: cleanEmail,
        VP_Balance: startingVp,
        IsAdmin: Boolean(isAdmin),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Account creation failed";
    const status = message.includes("Duplicate") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await authorizeAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized admin request" },
        { status: 401 },
      );
    }

    const { userId, password } = await request.json();
    const targetUserId = Number(userId);
    const cleanPassword = String(password ?? "");

    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      return NextResponse.json(
        { error: "Valid userId is required" },
        { status: 400 },
      );
    }

    if (cleanPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    const passwordHash = await hashPassword(cleanPassword);
    const [result] = await pool.query(
      "UPDATE Users SET PasswordHash = ? WHERE ID = ?",
      [passwordHash, targetUserId],
    );

    if ((result as { affectedRows: number }).affectedRows === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Password update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  let connection;

  try {
    const admin = await authorizeAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized admin request" },
        { status: 401 },
      );
    }

    const { userId } = await request.json();
    const targetUserId = Number(userId);

    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      return NextResponse.json(
        { error: "Valid userId is required" },
        { status: 400 },
      );
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [userRows] = await connection.query(
      "SELECT ID, Username, IsAdmin FROM Users WHERE ID = ? FOR UPDATE",
      [targetUserId],
    );
    const targetUser = (
      userRows as Array<{
        ID: number;
        Username: string;
        IsAdmin: number | boolean;
      }>
    )[0];

    if (!targetUser) {
      await connection.rollback();
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (Boolean(targetUser.IsAdmin)) {
      const [adminRows] = await connection.query(
        "SELECT COUNT(*) AS adminCount FROM Users WHERE IsAdmin = TRUE",
      );
      const adminCount = Number(
        (adminRows as Array<{ adminCount: number }>)[0]?.adminCount ?? 0,
      );

      if (adminCount <= 1) {
        await connection.rollback();
        return NextResponse.json(
          { error: "Cannot delete the last admin account" },
          { status: 400 },
        );
      }
    }

    await connection.query("DELETE FROM LoadoutSelections WHERE UserID = ?", [
      targetUserId,
    ]);
    await connection.query("DELETE FROM OwnedSkins WHERE UserID = ?", [
      targetUserId,
    ]);
    await connection.query("DELETE FROM Transactions WHERE UserID = ?", [
      targetUserId,
    ]);
    await connection.query(
      "UPDATE AuditLogs SET UserID = NULL WHERE UserID = ?",
      [targetUserId],
    );
    await connection.query("DELETE FROM Users WHERE ID = ?", [targetUserId]);

    await connection.commit();
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (connection) await connection.rollback();
    const message =
      error instanceof Error ? error.message : "Account deletion failed";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    connection?.release();
  }
}
