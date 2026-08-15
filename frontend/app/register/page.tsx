"use client";

"use client";

import { motion } from "framer-motion";
import {
  ArrowLeft,
  Gamepad2,
  Lock,
  Mail,
  User,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#07070d] px-5 py-10 text-white">
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

          <h1 className="mt-6 text-3xl font-bold">Join the Clash</h1>

          <p className="mt-2 text-sm text-white/45">
            Create your player profile and enter the arena.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          <form
            onSubmit={async (e: FormEvent) => {
              e.preventDefault();

              setError("");
              setLoading(true);

              try {
                await apiRequest("/auth/register", {
                  method: "POST",
                  body: JSON.stringify({
                    username,
                    email,
                    password,
                  }),
                });

                router.push("/login");
              } catch (error) {
                setError(
                  error instanceof Error
                    ? error.message
                    : "Registration failed",
                );
              } finally {
                setLoading(false);
              }
            }}
            className="space-y-5"
          >
            <div>
              <label className="mb-2 block text-sm text-white/70">
                Username
              </label>

              <div className="relative">
                <User
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
                />

                <input
                  type="text"
                  placeholder="Choose your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-12 w-full rounded-xl border border-white/10 bg-black/20 pl-11 pr-4 text-sm outline-none transition placeholder:text-white/20 focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/10"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm text-white/70">Email</label>

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
                  placeholder="Create a password"
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
              {loading ? "Creating..." : "Create Player"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-white/40">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-violet-400 transition hover:text-violet-300"
            >
              Login
            </Link>
          </p>
        </div>
      </motion.div>
    </main>
  );
}
