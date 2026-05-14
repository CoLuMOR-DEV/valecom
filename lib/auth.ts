import bcrypt from 'bcryptjs';
import pool from '@/lib/db';

export type AuthUser = {
  ID: number;
  Username: string;
  Email: string | null;
  VP_Balance: number;
  IsAdmin: boolean;
};

type UserRow = AuthUser & { PasswordHash: string };

const SALT_ROUNDS = 10;

export function hashPassword(password: string) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, passwordHash: string) {
  if (!passwordHash.startsWith('$2a$') && !passwordHash.startsWith('$2b$') && !passwordHash.startsWith('$2y$')) {
    return false;
  }

  return bcrypt.compare(password, passwordHash);
}

export async function findUserByUsername(username: string) {
  const [rows] = await pool.query(
    `SELECT ID, Username, Email, VP_Balance, PasswordHash, IsAdmin
     FROM Users
     WHERE Username = ?
     LIMIT 1`,
    [username],
  );

  return (rows as UserRow[])[0] ?? null;
}

export async function requireAdminPassword(password: string) {
  const admin = await findUserByUsername('admin_user');
  if (!admin || !admin.IsAdmin) return null;

  const ok = await verifyPassword(password, admin.PasswordHash);
  if (!ok) return null;

  return {
    ID: admin.ID,
    Username: admin.Username,
    Email: admin.Email,
    VP_Balance: admin.VP_Balance,
    IsAdmin: Boolean(admin.IsAdmin),
  };
}
