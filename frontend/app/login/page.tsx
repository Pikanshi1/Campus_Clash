"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Gamepad2, Lock, Mail } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";

export default function LoginPage() {
    const router = useRouter();

const [email, setEmail] = useState("");
const [password, setPassword] = useState("");

const [error, setError] = useState("");
const [loading, setLoading] = useState(false);
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#07070d] px-5 text-white">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/10 blur-[140px]" />

      <Link
        href="/"
        className="absolute left-5 top-6 flex items-center gap-2 text-sm text-white/50 transition hover:text-white sm:left-8"
      >
        <ArrowLeft size={16} />
        Back to home
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500 shadow-lg shadow-violet-500/20">
            <Gamepad2 size={26} />
          </div>

          <h1 className="mt-6 text-3xl font-bold">Welcome back</h1>

          <p className="mt-2 text-sm text-white/45">
            Enter the arena and continue your climb.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          <form
  onSubmit={async (e: FormEvent) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const data = await apiRequest<{
        success: boolean;
        message: string;
        token: string;
        user: {
          id: string;
          username: string;
          email: string;
          role: string;
          level: number;
          xp: number;
          score: number;
          wins: number;
          matches: number;
        };
      }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
        }),
      });

      localStorage.setItem("campus_clash_token", data.token);

      router.push("/dashboard");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Login failed"
      );
    } finally {
      setLoading(false);
    }
  }}
  className="space-y-5"
>
            <div>
              <label className="mb-2 block text-sm text-white/70">
                Email
              </label>

              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
                />

                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 w-full rounded-xl border border-white/10 bg-black/20 pl-11 pr-4 text-sm outline-none transition placeholder:text-white/20 focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/10"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm text-white/70">
                Password
              </label>

              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
                />

                <input
                  type="password"
                  placeholder="••••••••"
                   value={password}
  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 w-full rounded-xl border border-white/10 bg-black/20 pl-11 pr-4 text-sm outline-none transition placeholder:text-white/20 focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/10"
                />
              </div>
            </div>
              {error && (
  <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">
    {error}
  </div>
)}
            <button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-xl bg-violet-500 font-semibold transition hover:bg-violet-400 active:scale-[0.98]"
            >
              {loading ? "Entering..." : "Enter Arena"}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs text-white/30">OR</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <p className="text-center text-sm text-white/40">
            Don't have an account?{" "}
            <Link
              href="/register"
              className="font-medium text-violet-400 transition hover:text-violet-300"
            >
              Create one
            </Link>
          </p>
        </div>
      </motion.div>
    </main>
  );
}