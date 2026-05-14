"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";

const ADMIN_PASSWORD = "VALO_ADMIN_2026";

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

type DclPresetKey = "readonly" | "app_runtime" | "admin_ops";

type DclInfo = {
  currentUser: string | null;
  databaseName: string | null;
  grants: string[];
  presets: Record<DclPresetKey, { label: string; privileges: string[]; scope: string }>;
};

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [summary, setSummary] = useState<Summary>({
    transactionCount: 0,
    totalVPSpent: 0,
    totalVPTopup: 0,
    totalVPPurchases: 0,
    activeUsers: 0,
    lastPurchaseAt: null,
  });
  const [error, setError] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [query, setQuery] = useState("");
  const [txType, setTxType] = useState<"ALL" | "TOPUP" | "PURCHASE" | "BUNDLE">(
    "ALL",
  );
  const [grantUserId, setGrantUserId] = useState(1);
  const [grantAmount, setGrantAmount] = useState(1000);
  const [isGranting, setIsGranting] = useState(false);
  const [dclInfo, setDclInfo] = useState<DclInfo | null>(null);
  const [dclUser, setDclUser] = useState("valora_runtime");
  const [dclHost, setDclHost] = useState("%");
  const [dclPassword, setDclPassword] = useState("");
  const [dclPreset, setDclPreset] = useState<DclPresetKey>("app_runtime");
  const [dclCreateUser, setDclCreateUser] = useState(true);
  const [isDclApplying, setIsDclApplying] = useState(false);
  const [dclResult, setDclResult] = useState<string[]>([]);

  const fetchDclInfo = useCallback(() => {
    fetch("/api/admin/dcl", { headers: { "x-admin-password": password } })
      .then((res) => res.json())
      .then((json) => {
        if (json.presets) setDclInfo(json);
        if (!json.presets && json.error) setError(json.error);
      })
      .catch(() => setError("Failed to load DCL data"));
  }, [password]);

  const fetchData = useCallback(() => {
    fetch("/api/admin/transactions")
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
            lastPurchaseAt: null,
          },
        );
      })
      .catch(() => setError("Failed to load admin data"));
    fetchDclInfo();
  }, [fetchDclInfo]);

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
    setError("");
    try {
      const res = await fetch("/api/admin/reset-test-data", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Reset failed");
      fetchData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setIsResetting(false);
    }
  };

  const handleApplyDcl = async (action: "grant" | "revoke") => {
    setIsDclApplying(true);
    setError("");
    setDclResult([]);
    try {
      const res = await fetch("/api/admin/dcl", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": password },
        body: JSON.stringify({
          action,
          preset: dclPreset,
          user: dclUser,
          host: dclHost,
          createUser: action === "grant" && dclCreateUser,
          password: dclPassword,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "DCL operation failed");
      setDclResult(json.executed ?? []);
      fetchDclInfo();
    } catch (e) {
      setError(e instanceof Error ? e.message : "DCL operation failed");
    } finally {
      setIsDclApplying(false);
    }
  };

  const handleGrant = async () => {
    setIsGranting(true);
    setError("");
    try {
      const res = await fetch("/api/admin/grant-vp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: grantUserId, vpAmount: grantAmount }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Grant VP failed");
      fetchData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Grant VP failed");
    } finally {
      setIsGranting(false);
    }
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const passType = txType === "ALL" ? true : tx.TransactionType === txType;
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
      <main className="mx-auto flex min-h-screen max-w-md items-center px-4 py-10">
        <section className="glass-panel w-full rounded-[2rem] p-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-200">
                Valora
              </p>
              <h1 className="mt-1 text-3xl font-black uppercase leading-none">
                Admin Panel
              </h1>
              <p className="mt-3 text-sm muted-text">
                Enter your panel password to access transactions, player
                balances, and test reset tools.
              </p>
            </div>
            <ThemeToggle />
          </div>
          <input
            className="glass-field mb-3 w-full rounded-2xl p-3"
            placeholder="Enter password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            onClick={() => setAuthed(password === ADMIN_PASSWORD)}
            className="valorant-primary w-full rounded-2xl py-3 font-bold uppercase tracking-[0.18em]"
          >
            Login
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl p-4 md:p-8">
      <header className="glass-panel mb-6 rounded-[2rem] p-4 md:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-valorant-accent via-rose-500 to-cyan-300 text-2xl font-black text-white shadow-[0_14px_35px_rgba(255,70,85,0.35)]">
              A
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-200">
                Valora Control
              </p>
              <h1 className="text-3xl font-black uppercase leading-none">
                Admin Panel
              </h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ThemeToggle />
            <button
              onClick={fetchData}
              className="nav-action rounded-2xl px-4 py-2 text-sm font-bold uppercase tracking-wider"
            >
              Refresh
            </button>
            <button
              onClick={handleReset}
              disabled={isResetting}
              className="rounded-2xl bg-amber-400 px-4 py-2 text-sm font-bold uppercase text-black disabled:opacity-60"
            >
              {isResetting ? "Resetting..." : "Reset Test History"}
            </button>
          </div>
        </div>
      </header>

      {error ? (
        <p className="mb-4 rounded-2xl border border-rose-400/40 bg-rose-500/10 p-3 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <div className="glass-card rounded-[1.5rem] p-4">
          <p className="text-xs uppercase muted-text">Transactions</p>
          <p className="text-3xl font-black">{summary.transactionCount ?? 0}</p>
        </div>
        <div className="glass-card rounded-[1.5rem] p-4">
          <p className="text-xs uppercase muted-text">Total VP Volume</p>
          <p className="text-3xl font-black">{summary.totalVPSpent ?? 0}</p>
        </div>
        <div className="glass-card rounded-[1.5rem] p-4">
          <p className="text-xs uppercase muted-text">Active Buyers</p>
          <p className="text-3xl font-black">{summary.activeUsers ?? 0}</p>
        </div>
        <div className="glass-card rounded-[1.5rem] p-4">
          <p className="text-xs uppercase muted-text">VP Topups</p>
          <p className="text-3xl font-black">{summary.totalVPTopup ?? 0}</p>
        </div>
        <div className="glass-card rounded-[1.5rem] p-4">
          <p className="text-xs uppercase muted-text">VP Purchases</p>
          <p className="text-3xl font-black">{summary.totalVPPurchases ?? 0}</p>
        </div>
        <div className="glass-card rounded-[1.5rem] p-4">
          <p className="text-xs uppercase muted-text">Top Spender</p>
          <p className="truncate text-xl font-black">
            {topSpendUser
              ? `${topSpendUser.username} (${topSpendUser.spend})`
              : "N/A"}
          </p>
        </div>
      </section>

      <section className="glass-panel mb-6 overflow-hidden rounded-[2rem]">
        <h2 className="border-b border-white/10 px-4 py-3 text-lg font-black uppercase">
          Users
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-white/5 muted-text">
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
                <tr key={user.ID} className="border-t border-white/10">
                  <td className="p-3">{user.ID}</td>
                  <td className="p-3 font-bold">{user.Username}</td>
                  <td className="p-3 muted-text">{user.Email || "-"}</td>
                  <td className="p-3">{user.VP_Balance}</td>
                  <td className="p-3 muted-text">
                    {user.CreatedAt
                      ? new Date(user.CreatedAt).toLocaleDateString()
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="glass-panel mb-6 rounded-[2rem] p-4">
        <h2 className="mb-3 text-lg font-black uppercase">Admin Tools</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_160px_160px_1fr]">
          <select
            value={grantUserId}
            onChange={(e) => setGrantUserId(Number(e.target.value))}
            className="glass-field rounded-2xl p-2"
          >
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
            className="glass-field rounded-2xl p-2"
          />
          <button
            onClick={handleGrant}
            disabled={isGranting}
            className="rounded-2xl bg-emerald-400 px-4 py-2 font-bold uppercase text-black disabled:opacity-60"
          >
            {isGranting ? "Granting..." : "Grant VP"}
          </button>
          <p className="text-xs muted-text">
            Adds VP to user balance and records a TOPUP transaction.
          </p>
        </div>
      </section>


      <section className="glass-panel mb-6 rounded-[2rem] p-4">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-cyan-200">
              Data Control Language
            </p>
            <h2 className="text-lg font-black uppercase">Database Access Control</h2>
            <p className="mt-1 max-w-3xl text-xs muted-text">
              Safely apply preset MySQL GRANT/REVOKE permissions from the Admin Panel.
              Avoids free-form SQL while still supporting DCL for app runtime,
              reporting, and admin operation accounts.
            </p>
          </div>
          <button
            onClick={fetchDclInfo}
            className="nav-action rounded-2xl px-4 py-2 text-xs font-bold uppercase tracking-wider"
          >
            Refresh DCL
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="glass-card rounded-[1.5rem] p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="text-xs font-bold uppercase muted-text">
                DB User
                <input
                  value={dclUser}
                  onChange={(e) => setDclUser(e.target.value)}
                  className="glass-field mt-1 w-full rounded-2xl p-2 text-sm normal-case"
                  placeholder="valora_runtime"
                />
              </label>
              <label className="text-xs font-bold uppercase muted-text">
                Host
                <input
                  value={dclHost}
                  onChange={(e) => setDclHost(e.target.value)}
                  className="glass-field mt-1 w-full rounded-2xl p-2 text-sm normal-case"
                  placeholder="%"
                />
              </label>
              <label className="text-xs font-bold uppercase muted-text">
                Permission preset
                <select
                  value={dclPreset}
                  onChange={(e) => setDclPreset(e.target.value as DclPresetKey)}
                  className="glass-field mt-1 w-full rounded-2xl p-2 text-sm normal-case"
                >
                  {dclInfo
                    ? (Object.entries(dclInfo.presets) as Array<[
                        DclPresetKey,
                        DclInfo["presets"][DclPresetKey],
                      ]>).map(([key, preset]) => (
                        <option key={key} value={key}>
                          {preset.label} ({preset.privileges.join(", ")})
                        </option>
                      ))
                    : null}
                </select>
              </label>
              <label className="text-xs font-bold uppercase muted-text">
                New user password
                <input
                  value={dclPassword}
                  onChange={(e) => setDclPassword(e.target.value)}
                  className="glass-field mt-1 w-full rounded-2xl p-2 text-sm normal-case"
                  placeholder="Required only when creating user"
                  type="password"
                />
              </label>
            </div>

            <label className="mt-3 flex items-center gap-2 text-xs muted-text">
              <input
                checked={dclCreateUser}
                onChange={(e) => setDclCreateUser(e.target.checked)}
                type="checkbox"
              />
              Create the database account if it does not already exist before granting.
            </label>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => handleApplyDcl("grant")}
                disabled={isDclApplying}
                className="rounded-2xl bg-cyan-300 px-4 py-2 text-sm font-bold uppercase text-black disabled:opacity-60"
              >
                {isDclApplying ? "Applying..." : "Grant Preset"}
              </button>
              <button
                onClick={() => handleApplyDcl("revoke")}
                disabled={isDclApplying}
                className="rounded-2xl bg-rose-400 px-4 py-2 text-sm font-bold uppercase text-black disabled:opacity-60"
              >
                Revoke Preset
              </button>
            </div>

            {dclResult.length ? (
              <div className="mt-4 rounded-2xl border border-emerald-300/30 bg-emerald-400/10 p-3 text-xs text-emerald-100">
                <p className="mb-2 font-bold uppercase">Executed DCL</p>
                <ul className="list-disc space-y-1 pl-4">
                  {dclResult.map((statement) => (
                    <li key={statement}>{statement}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="glass-card rounded-[1.5rem] p-4">
            <p className="text-xs uppercase muted-text">Connected as</p>
            <p className="break-all font-bold">{dclInfo?.currentUser ?? "Unknown"}</p>
            <p className="mt-3 text-xs uppercase muted-text">Database</p>
            <p className="font-bold">{dclInfo?.databaseName ?? "Unknown"}</p>
            <p className="mt-3 text-xs uppercase muted-text">Current grants</p>
            <div className="mt-2 max-h-44 space-y-2 overflow-auto rounded-2xl bg-black/20 p-3 text-xs muted-text">
              {dclInfo?.grants?.length ? (
                dclInfo.grants.map((grant) => <p key={grant}>{grant}</p>)
              ) : (
                <p>No grants available or current DB user cannot inspect grants.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="glass-panel overflow-hidden rounded-[2rem]">
        <h2 className="border-b border-white/10 px-4 py-3 text-lg font-black uppercase">
          Transaction Log
        </h2>
        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-white/5 px-4 py-3">
          <input
            placeholder="Search user, skin, type..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="glass-field w-full rounded-2xl p-2 text-xs sm:w-64"
          />
          <select
            value={txType}
            onChange={(e) =>
              setTxType(
                e.target.value as "ALL" | "TOPUP" | "PURCHASE" | "BUNDLE",
              )
            }
            className="glass-field rounded-2xl p-2 text-xs"
          >
            <option value="ALL">All Types</option>
            <option value="PURCHASE">Skin Purchase</option>
            <option value="BUNDLE">Bundle Purchase</option>
            <option value="TOPUP">Top Up</option>
          </select>
          <p className="text-xs muted-text">
            {filteredTransactions.length} records shown
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-white/5 muted-text">
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
                <tr key={tx.TransactionID} className="border-t border-white/10">
                  <td className="p-3">{tx.UserID}</td>
                  <td className="p-3">{tx.SkinID}</td>
                  <td className="p-3">{tx.VP_Cost}</td>
                  <td className="p-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${tx.TransactionType === "TOPUP" ? "bg-emerald-500/15 text-emerald-200" : tx.TransactionType === "BUNDLE" ? "bg-fuchsia-500/15 text-fuchsia-200" : "bg-cyan-500/15 text-cyan-200"}`}
                    >
                      {tx.TransactionType}
                    </span>
                  </td>
                  <td className="p-3 muted-text">
                    {new Date(tx.CreatedAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
