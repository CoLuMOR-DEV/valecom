import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

const ACCOUNT_PATTERN = /^[A-Za-z0-9_.$%-]{1,80}$/;

const DCL_PRESETS = {
  readonly: {
    label: 'Read-only reporting',
    privileges: ['SELECT'],
    scope: '*',
  },
  app_runtime: {
    label: 'Application runtime',
    privileges: ['SELECT', 'INSERT', 'UPDATE', 'EXECUTE'],
    scope: '*',
  },
  admin_ops: {
    label: 'Admin operations',
    privileges: ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'EXECUTE', 'SHOW VIEW'],
    scope: '*',
  },
} as const;

type DclPreset = keyof typeof DCL_PRESETS;

type DclAction = 'grant' | 'revoke';

function isAuthorized(request: NextRequest) {
  const expectedPassword = process.env.ADMIN_PASSWORD ?? 'VALO_ADMIN_2026';
  return request.headers.get('x-admin-password') === expectedPassword;
}

function quoteAccountPart(value: string) {
  if (!ACCOUNT_PATTERN.test(value)) {
    throw new Error('Account user and host may only include letters, numbers, _, ., $, %, or -');
  }

  return `'${value.replaceAll("'", "''")}'`;
}

function accountSql(user: string, host: string) {
  return `${quoteAccountPart(user)}@${quoteAccountPart(host)}`;
}

function databaseNameSql() {
  const database = process.env.MYSQL_DATABASE ?? 'valorant_shop';
  if (!ACCOUNT_PATTERN.test(database)) {
    throw new Error('MYSQL_DATABASE contains unsupported characters for DCL statements');
  }

  return `\`${database.replaceAll('`', '``')}\``;
}

export async function GET(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized DCL access', presets: DCL_PRESETS }, { status: 401 });
    }

    const [currentUserRows] = await pool.query('SELECT CURRENT_USER() AS currentUser, DATABASE() AS databaseName');
    const [grantRows] = await pool.query('SHOW GRANTS FOR CURRENT_USER()');

    return NextResponse.json({
      currentUser: (currentUserRows as Array<{ currentUser: string }>)[0]?.currentUser ?? null,
      databaseName: (currentUserRows as Array<{ databaseName: string }>)[0]?.databaseName ?? null,
      grants: (grantRows as Array<Record<string, string>>).map((row) => Object.values(row)[0]),
      presets: DCL_PRESETS,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to inspect DCL grants';
    return NextResponse.json({ error: message, presets: DCL_PRESETS }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized DCL access' }, { status: 401 });
    }

    const body = await request.json();
    const action = body.action as DclAction;
    const preset = body.preset as DclPreset;
    const user = String(body.user ?? '').trim();
    const host = String(body.host ?? '%').trim() || '%';
    const createUser = Boolean(body.createUser);
    const password = String(body.password ?? '');

    if (action !== 'grant' && action !== 'revoke') {
      return NextResponse.json({ error: 'action must be grant or revoke' }, { status: 400 });
    }

    if (!DCL_PRESETS[preset]) {
      return NextResponse.json({ error: 'Unknown DCL preset' }, { status: 400 });
    }

    if (!user) {
      return NextResponse.json({ error: 'Database user is required' }, { status: 400 });
    }

    if (createUser && !password) {
      return NextResponse.json({ error: 'Password is required when creating a database user' }, { status: 400 });
    }

    const account = accountSql(user, host);
    const database = databaseNameSql();
    const selectedPreset = DCL_PRESETS[preset];
    const privilegeSql = selectedPreset.privileges.join(', ');
    const scopeSql = `${database}.${selectedPreset.scope}`;
    const executed: string[] = [];

    if (createUser) {
      await pool.query(`CREATE USER IF NOT EXISTS ${account} IDENTIFIED BY ?`, [password]);
      executed.push(`CREATE USER IF NOT EXISTS ${user}@${host}`);
    }

    if (action === 'grant') {
      await pool.query(`GRANT ${privilegeSql} ON ${scopeSql} TO ${account}`);
      executed.push(`GRANT ${privilegeSql} ON ${database}.${selectedPreset.scope} TO ${user}@${host}`);
    } else {
      await pool.query(`REVOKE ${privilegeSql} ON ${scopeSql} FROM ${account}`);
      executed.push(`REVOKE ${privilegeSql} ON ${database}.${selectedPreset.scope} FROM ${user}@${host}`);
    }

    await pool.query('FLUSH PRIVILEGES');
    executed.push('FLUSH PRIVILEGES');

    return NextResponse.json({ ok: true, executed });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'DCL operation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
