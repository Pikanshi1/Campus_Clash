"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const token = new URLSearchParams(window.location.search).get("token") || "";

    if (!token) {
      setError("This reset link is missing its token. Request a new link to continue.");
      return;
    }

    if (password !== confirmation) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await apiRequest("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      router.replace("/login?passwordReset=1");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to reset password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#07070d] px-5 text-white">
      <div className="w-full max-w-md">
        <Link href="/login" className="inline-flex items-center gap-2 text-sm text-white/50 transition hover:text-white">
          <ArrowLeft size={16} />
          Back to login
        </Link>
        <h1 className="mt-10 text-3xl font-bold">Choose a new password</h1>
        <p className="mt-2 text-sm leading-6 text-white/50">
          Use at least 12 characters with uppercase and lowercase letters, a number, and a symbol.
        </p>

        <form onSubmit={submit} className="mt-7 space-y-4">
            <label htmlFor="password" className="block text-sm text-white/70">New password</label>
            <div className="relative">
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                minLength={12}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-12 w-full rounded-xl border border-white/10 bg-white/4 pl-11 pr-4 text-sm outline-none focus:border-violet-400/50"
              />
            </div>
            <label htmlFor="confirmation" className="block text-sm text-white/70">Confirm new password</label>
            <input
              id="confirmation"
              type="password"
              autoComplete="new-password"
              required
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              className="h-12 w-full rounded-xl border border-white/10 bg-white/4 px-4 text-sm outline-none focus:border-violet-400/50"
            />
            {error && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
            <button disabled={loading} className="h-12 w-full rounded-xl bg-violet-500 font-semibold transition hover:bg-violet-400 disabled:opacity-50">
              {loading ? "Updating..." : "Update password"}
            </button>
        </form>
      </div>
    </main>
  );
}