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
  VP_Balance: number;
};

type Summary = {
  transactionCount: number;
  totalVPSpent: number;
  activeUsers: number;
  lastPurchaseAt: string | null;
};

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [summary, setSummary] = useState<Summary>({ transactionCount: 0, totalVPSpent: 0, activeUsers: 0, lastPurchaseAt: null });
  const [error, setError] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const fetchData = useCallback(() => {
    fetch('/api/admin/transactions')
      .then((res) => res.json())
      .then((json) => {
        setTransactions(json.transactions ?? []);
        setUsers(json.users ?? []);
        setSummary(json.summary ?? { transactionCount: 0, totalVPSpent: 0, activeUsers: 0, lastPurchaseAt: null });
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

  if (!authed) {
    return (
      <main className="mx-auto mt-20 max-w-md rounded-xl border border-slate-700 bg-[#0d1829] p-8 shadow-2xl">
        <h1 className="mb-2 text-3xl uppercase">Admin Login</h1>
        <p className="mb-6 text-sm text-slate-300">Enter your panel password to access transactions, player balances, and test reset tools.</p>
        <input
          className="mb-3 w-full rounded border border-slate-600 bg-slate-900 p-3"
          placeholder="Enter password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button onClick={() => setAuthed(password === 'VALO_ADMIN_2026')} className="w-full rounded bg-valorant-accent py-3">
          Login
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl uppercase">Admin Control Center</h1>
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

      <section className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-4">
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
              <th className="p-3">Current VP</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.ID} className="border-t border-slate-700">
                <td className="p-3">{user.ID}</td>
                <td className="p-3">{user.Username}</td>
                <td className="p-3">{user.VP_Balance}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="overflow-hidden rounded border border-slate-600">
        <h2 className="border-b border-slate-700 bg-slate-900 px-4 py-3 text-lg uppercase">Transaction Log</h2>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900/50 text-slate-300">
            <tr>
              <th className="p-3">User ID</th>
              <th className="p-3">Skin/Upgrade</th>
              <th className="p-3">VP Cost</th>
              <th className="p-3">Type</th>
              <th className="p-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.TransactionID} className="border-t border-slate-700">
                <td className="p-3">{tx.UserID}</td>
                <td className="p-3">{tx.SkinID} · L{tx.PurchasedLevel}</td>
                <td className="p-3">{tx.VP_Cost}</td>
                <td className="p-3">{tx.TransactionType}</td>
                <td className="p-3">{new Date(tx.CreatedAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
