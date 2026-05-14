"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";

type Mode = "login" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setBusy(true);
    setError("");
    try {
      const endpoint =
        mode === "login" ? "/api/auth/login" : "/api/auth/signup";
      const payload =
        mode === "login"
          ? { username, password }
          : { username, email, password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Auth failed");

      window.localStorage.setItem("valora-user", JSON.stringify(json.user));
      router.push("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Auth failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto mt-12 max-w-md px-4">
      <section className="glass-panel rounded-[2rem] p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] muted-text">
              Valora
            </p>
            <h1 className="mb-1 text-3xl font-black uppercase">Account</h1>
            <p className="text-sm muted-text">
              Sign in or create an account to continue shopping. New passwords need at least 8 characters.
            </p>
          </div>
          <ThemeToggle />
        </div>

        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setMode("login")}
            className={`flex-1 rounded-2xl border px-3 py-2 text-sm uppercase ${mode === "login" ? "border-cyan-300 bg-cyan-500/20" : "border-slate-600"}`}
          >
            Login
          </button>
          <button
            onClick={() => setMode("signup")}
            className={`flex-1 rounded-2xl border px-3 py-2 text-sm uppercase ${mode === "signup" ? "border-fuchsia-300 bg-fuchsia-500/20" : "border-slate-600"}`}
          >
            Sign Up
          </button>
        </div>

        <input
          className="glass-field mb-3 w-full rounded-2xl p-3"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        {mode === "signup" ? (
          <input
            className="glass-field mb-3 w-full rounded-2xl p-3"
            placeholder="Email (optional)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        ) : null}
        <input
          className="glass-field mb-3 w-full rounded-2xl p-3"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error ? <p className="mb-3 text-sm text-red-400">{error}</p> : null}

        <button
          onClick={handleSubmit}
          disabled={busy}
          className="valorant-primary w-full rounded-2xl py-3 font-semibold uppercase disabled:opacity-60"
        >
          {busy
            ? "Please wait..."
            : mode === "login"
              ? "Log In"
              : "Create Account"}
        </button>
      </section>
    </main>
  );
}
