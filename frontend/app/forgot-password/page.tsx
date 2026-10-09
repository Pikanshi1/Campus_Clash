"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import { apiRequest } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    try {
      const result = await apiRequest<{ message: string }>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setMessage(result.message);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to request a reset link");
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
        <h1 className="mt-10 text-3xl font-bold">Reset your password</h1>
        <p className="mt-2 text-sm leading-6 text-white/50">
          Enter the email address on your account. If it matches, we’ll send a secure reset link.
        </p>

        <form onSubmit={submit} className="mt-7 space-y-4">
          <label htmlFor="email" className="block text-sm text-white/70">Email</label>
          <div className="relative">
            <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="h-12 w-full rounded-xl border border-white/10 bg-white/4 pl-11 pr-4 text-sm outline-none focus:border-violet-400/50"
            />
          </div>
          {message && <p role="status" className="rounded-xl border border-green-400/20 bg-green-400/10 p-3 text-sm text-green-200">{message}</p>}
          {error && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
          <button disabled={loading} className="h-12 w-full rounded-xl bg-violet-500 font-semibold transition hover:bg-violet-400 disabled:opacity-50">
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </form>
      </div>
    </main>
  );
}