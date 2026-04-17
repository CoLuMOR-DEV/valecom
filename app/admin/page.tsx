'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type Tx = {
  TransactionID: number;
  UserID: number;
  SkinID: string;
  PurchasedLevel: number;
  VP_Cost: number;
  TransactionType: string;
  CreatedAt: string;
};

type User = {
  ID: number;
  Username: string;
  Email?: string;
  VP_Balance: number;
  CreatedAt?: string;
};

type Summary = {
  transactionCount: number;
  totalVPSpent: number;
  totalVPTopup: number;
  totalVPPurchases: number;
  activeUsers: number;
  lastPurchaseAt: string | null;
};

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [summary, setSummary] = useState<Summary>({
    transactionCount: 0,
    totalVPSpent: 0,
    totalVPTopup: 0,
    totalVPPurchases: 0,
    activeUsers: 0,
    lastPurchaseAt: null
  });
  const [error, setError] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [query, setQuery] = useState('');
  const [txType, setTxType] = useState<'ALL' | 'TOPUP' | 'PURCHASE' | 'BUNDLE'>('ALL');
  const [grantUserId, setGrantUserId] = useState(1);
  const [grantAmount, setGrantAmount] = useState(1000);
  const [isGranting, setIsGranting] = useState(false);

  const fetchData = useCallback(() => {
    fetch('/api/admin/transactions')
      .then((res) => res.json())
      .then((json) => {
        setTransactions(json.transactions ?? []);
        setUsers(json.users ?? []);
        setSummary(
          json.summary ?? {
            transactionCount: 0,
            totalVPSpent: 0,
            totalVPTopup: 0,
            totalVPPurchases: 0,
            activeUsers: 0,
            lastPurchaseAt: null
          }
        );
      })
      .catch(() => setError('Failed to load admin data'));
  }, []);

  useEffect(() => {
    if (!authed) return;
    fetchData();
  }, [authed, fetchData]);

  const topSpendUser = useMemo(() => {
    const userSpend = new Map<number, number>();
    for (const tx of transactions) {
      userSpend.set(tx.UserID, (userSpend.get(tx.UserID) ?? 0) + tx.VP_Cost);
    }
    const top = [...userSpend.entries()].sort((a, b) => b[1] - a[1])[0];
    if (!top) return null;
    const user = users.find((u) => u.ID === top[0]);
    return { username: user?.Username ?? `User ${top[0]}`, spend: top[1] };
  }, [transactions, users]);

  const handleReset = async () => {
    setIsResetting(true);
    setError('');
    try {
      const res = await fetch('/api/admin/reset-test-data', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Reset failed');
      fetchData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reset failed');
    } finally {
      setIsResetting(false);
    }
  };

  const handleGrant = async () => {
    setIsGranting(true);
    setError('');
    try {
      const res = await fetch('/api/admin/grant-vp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: grantUserId, vpAmount: grantAmount })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Grant VP failed');
      fetchData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Grant VP failed');
    } finally {
      setIsGranting(false);
    }
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const passType = txType === 'ALL' ? true : tx.TransactionType === txType;
      const q = query.trim().toLowerCase();
      const passQuery =
        !q ||
        String(tx.UserID).includes(q) ||
        tx.SkinID.toLowerCase().includes(q) ||
        tx.TransactionType.toLowerCase().includes(q);
      return passType && passQuery;
    });
  }, [transactions, txType, query]);

  if (!authed) {
    return (
      <main className="mx-auto mt-20 max-w-md rounded-xl border border-slate-700 bg-[#0d1829] p-8 shadow-2xl">
        <h1 className="mb-2 text-3xl uppercase">Valora Admin Login</h1>
        <p className="mb-6 text-sm text-slate-300">Enter your panel password to access transactions, player balances, and test reset tools.</p>
        <input
          className="mb-3 w-full rounded border border-slate-600 bg-slate-900 p-3"
          placeholder="Enter password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button onClick={() => setAuthed(password === 'admin123')} className="w-full rounded bg-valorant-accent py-3">
          Login
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl uppercase">Valora Admin Panel</h1>
        <div className="flex gap-2">
          <button onClick={fetchData} className="rounded border border-slate-500 px-4 py-2 text-sm uppercase tracking-wider">
            Refresh
          </button>
          <button onClick={handleReset} disabled={isResetting} className="rounded bg-amber-500 px-4 py-2 text-sm font-semibold uppercase text-black disabled:opacity-60">
            {isResetting ? 'Resetting...' : 'Reset Test History'}
          </button>
        </div>
      </div>

      {error ? <p className="mb-4 text-sm text-red-400">{error}</p> : null}

      <section className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-6">
        <div className="rounded border border-slate-600 bg-slate-900/50 p-4">
          <p className="text-xs uppercase text-slate-400">Transactions</p>
          <p className="text-3xl font-bold">{summary.transactionCount ?? 0}</p>
        </div>
        <div className="rounded border border-slate-600 bg-slate-900/50 p-4">
          <p className="text-xs uppercase text-slate-400">Total VP Volume</p>
          <p className="text-3xl font-bold">{summary.totalVPSpent ?? 0}</p>
        </div>
        <div className="rounded border border-slate-600 bg-slate-900/50 p-4">
          <p className="text-xs uppercase text-slate-400">Active Buyers</p>
          <p className="text-3xl font-bold">{summary.activeUsers ?? 0}</p>
        </div>
        <div className="rounded border border-slate-600 bg-slate-900/50 p-4">
          <p className="text-xs uppercase text-slate-400">VP Topups</p>
          <p className="text-3xl font-bold">{summary.totalVPTopup ?? 0}</p>
        </div>
        <div className="rounded border border-slate-600 bg-slate-900/50 p-4">
          <p className="text-xs uppercase text-slate-400">VP Purchases</p>
          <p className="text-3xl font-bold">{summary.totalVPPurchases ?? 0}</p>
        </div>
        <div className="rounded border border-slate-600 bg-slate-900/50 p-4">
          <p className="text-xs uppercase text-slate-400">Top Spender</p>
          <p className="text-xl font-bold">{topSpendUser ? `${topSpendUser.username} (${topSpendUser.spend})` : 'N/A'}</p>
        </div>
      </section>

      <section className="mb-6 overflow-hidden rounded border border-slate-600">
        <h2 className="border-b border-slate-700 bg-slate-900 px-4 py-3 text-lg uppercase">Users</h2>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900/50 text-slate-300">
            <tr>
              <th className="p-3">ID</th>
              <th className="p-3">Username</th>
              <th className="p-3">Email</th>
              <th className="p-3">Current VP</th>
              <th className="p-3">Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.ID} className="border-t border-slate-700">
                <td className="p-3">{user.ID}</td>
                <td className="p-3">{user.Username}</td>
                <td className="p-3">{user.Email || '-'}</td>
                <td className="p-3">{user.VP_Balance}</td>
                <td className="p-3">{user.CreatedAt ? new Date(user.CreatedAt).toLocaleDateString() : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mb-6 rounded border border-slate-600 bg-slate-900/40 p-4">
        <h2 className="mb-3 text-lg uppercase">Admin Tools</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <select value={grantUserId} onChange={(e) => setGrantUserId(Number(e.target.value))} className="rounded border border-slate-600 bg-slate-900 p-2">
            {users.map((u) => (
              <option key={u.ID} value={u.ID}>
                {u.Username} (ID {u.ID})
              </option>
            ))}
          </select>
          <input
            type="number"
            min={100}
            step={100}
            value={grantAmount}
            onChange={(e) => setGrantAmount(Number(e.target.value))}
            className="rounded border border-slate-600 bg-slate-900 p-2"
          />
          <button onClick={handleGrant} disabled={isGranting} className="rounded bg-emerald-500 px-4 py-2 font-semibold uppercase text-black disabled:opacity-60">
            {isGranting ? 'Granting...' : 'Grant VP'}
          </button>
          <p className="text-xs text-slate-300">Adds VP to user balance and records a TOPUP transaction.</p>
        </div>
      </section>

      <section className="overflow-hidden rounded border border-slate-600">
        <h2 className="border-b border-slate-700 bg-slate-900 px-4 py-3 text-lg uppercase">Transaction Log</h2>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-700 bg-slate-900/40 px-4 py-3">
          <input
            placeholder="Search user, skin, type..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-64 rounded border border-slate-600 bg-slate-900 p-2 text-xs"
          />
          <select value={txType} onChange={(e) => setTxType(e.target.value as 'ALL' | 'TOPUP' | 'PURCHASE' | 'BUNDLE')} className="rounded border border-slate-600 bg-slate-900 p-2 text-xs">
            <option value="ALL">All Types</option>
            <option value="PURCHASE">Skin Purchase</option>
            <option value="BUNDLE">Bundle Purchase</option>
            <option value="TOPUP">Top Up</option>
          </select>
          <p className="text-xs text-slate-400">{filteredTransactions.length} records shown</p>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900/50 text-slate-300">
            <tr>
              <th className="p-3">User ID</th>
              <th className="p-3">Item</th>
              <th className="p-3">VP Cost</th>
              <th className="p-3">Type</th>
              <th className="p-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.map((tx) => (
              <tr key={tx.TransactionID} className="border-t border-slate-700">
                <td className="p-3">{tx.UserID}</td>
                <td className="p-3">{tx.SkinID}</td>
                <td className="p-3">{tx.VP_Cost}</td>
                <td className="p-3">
                  <span className={`rounded px-2 py-1 text-xs ${tx.TransactionType === 'TOPUP' ? 'bg-emerald-900/60 text-emerald-200' : tx.TransactionType === 'BUNDLE' ? 'bg-fuchsia-900/60 text-fuchsia-200' : 'bg-cyan-900/60 text-cyan-200'}`}>
                    {tx.TransactionType}
                  </span>
                </td>
                <td className="p-3">{new Date(tx.CreatedAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
