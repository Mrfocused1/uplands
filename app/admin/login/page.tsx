"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setError(body?.error ?? "Unable to log in.");
        return;
      }
      router.push("/admin/submissions");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-5">
      <form onSubmit={submit} className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-white shadow-2xl">
        <h1 className="text-xl font-bold">Uplands Admin</h1>
        <p className="mt-1 text-sm text-zinc-400">Sign in to review inductions.</p>

        <label className="mt-6 block text-sm font-medium text-zinc-300">
          Username
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-white/60"
          />
        </label>

        <label className="mt-4 block text-sm font-medium text-zinc-300">
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-white/60"
          />
        </label>

        {error && <p className="mt-4 rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="mt-6 w-full rounded-md bg-white px-3 py-2.5 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-200 disabled:opacity-60"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
