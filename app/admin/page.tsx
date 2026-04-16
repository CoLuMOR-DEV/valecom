'use client';

import { useEffect, useState } from 'react';

type Tx = {
  TransactionID: number;
  UserID: number;
  SkinID: string;
  PurchasedLevel: number;
  VP_Cost: number;
  TransactionType: string;
  CreatedAt: string;
};

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [transactions, setTransactions] = useState<Tx[]>([]);

  useEffect(() => {
    if (!authed) return;
    fetch('/api/admin/transactions')
      .then((res) => res.json())
      .then((json) => setTransactions(json.transactions ?? []));
  }, [authed]);

  if (!authed) {
    return (
      <main className="mx-auto max-w-md p-8">
        <h1 className="mb-4 text-3xl uppercase">Admin Login</h1>
        <input
          className="mb-3 w-full rounded border border-slate-600 bg-slate-900 p-3"
          placeholder="Enter password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          onClick={() => setAuthed(password === 'VALO_ADMIN_2026')}
          className="w-full rounded bg-valorant-accent py-3"
        >
          Login
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl p-8">
      <h1 className="mb-6 text-3xl uppercase">Transactions</h1>
      <div className="overflow-hidden rounded border border-slate-600">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900">
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
      </div>
    </main>
  );
}
