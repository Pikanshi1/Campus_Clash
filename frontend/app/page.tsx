"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  Gamepad2,
  Shield,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#07070d] text-white">
      {/* Navbar */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/10 bg-[#07070d]/70 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500">
              <Zap size={20} fill="white" />
            </div>

            <span className="text-lg font-bold tracking-tight">
              CAMPUS<span className="text-violet-400">CLASH</span>
            </span>
          </div>

          <div className="hidden items-center gap-8 md:flex">
            <a href="#home" className="text-sm text-white/70 transition hover:text-white">
              Home
            </a>
            <a href="#features" className="text-sm text-white/70 transition hover:text-white">
              Features
            </a>
            <a href="#how" className="text-sm text-white/70 transition hover:text-white">
              How It Works
            </a>
            <Link href="/multiplayer" className="text-sm text-white/70 transition hover:text-white">
              Rooms
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden text-sm text-white/70 transition hover:text-white sm:block">
              Login
            </Link>

            <Link href="/play" className="group flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-violet-400">
              Play Now
              <ArrowRight
                size={16}
                className="transition-transform group-hover:translate-x-1"
              />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section
        id="home"
        className="relative flex min-h-screen items-center overflow-hidden pt-20"
      >
        {/* Background glow */}
        <div className="pointer-events-none absolute left-1/2 top-1/3 h-125 w-125 -translate-x-1/2 rounded-full bg-violet-600/20 blur-[140px]" />

        <div className="relative mx-auto grid w-full max-w-7xl gap-14 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/10 px-4 py-2 text-sm text-violet-300">
              <span className="h-2 w-2 animate-pulse rounded-full bg-violet-400" />
              The campus is your arena
            </div>

            <h1 className="max-w-3xl text-5xl font-black leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
              COMPETE.
              <br />
              <span className="text-violet-400">CLASH.</span>
              <br />
              CONQUER.
            </h1>

            <p className="mt-7 max-w-xl text-base leading-7 text-white/55 sm:text-lg">
              Play solo against enemy waves or join a room to battle other players in timed rounds.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/play" className="group flex items-center justify-center gap-2 rounded-xl bg-violet-500 px-6 py-3.5 font-semibold transition hover:bg-violet-400">
                Enter the Arena
                <ArrowRight
                  size={18}
                  className="transition-transform group-hover:translate-x-1"
                />
              </Link>

              <Link href="/multiplayer" className="rounded-xl border border-white/10 bg-white/5 px-6 py-3.5 font-semibold text-white/80 backdrop-blur transition hover:bg-white/10">
                Join a Room
              </Link>
            </div>

          </motion.div>

          {/* Game preview */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="relative"
          >
            <div className="absolute -inset-5 rounded-4xl bg-violet-500/10 blur-3xl" />

            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/4 p-3 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <div className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
                </div>

                <span className="text-xs text-white/40">
                  CAMPUS ARENA
                </span>
              </div>

              <div className="relative aspect-4/3 overflow-hidden rounded-2xl bg-linear-to-br from-violet-950 via-[#10101c] to-cyan-950">
                {/* Arena grid */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.15)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.15)_1px,transparent_1px)] bg-size-[40px_40px] opacity-20" />

                {/* Decorative arena objects */}
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="absolute left-[20%] top-[25%] flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-300/30 bg-violet-400/20 text-3xl shadow-lg shadow-violet-500/20"
                >
                  🎮
                </motion.div>

                <motion.div
                  animate={{ y: [0, 12, 0] }}
                  transition={{ duration: 3.5, repeat: Infinity }}
                  className="absolute right-[20%] top-[30%] flex h-14 w-14 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-400/20 text-2xl"
                >
                  ⚡
                </motion.div>

                <div className="absolute bottom-[20%] left-[35%] flex h-20 w-20 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-4xl backdrop-blur">
                  🧑‍🎓
                </div>

                <div className="absolute right-[15%] top-[15%] flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs backdrop-blur">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
                  ARENA
                </div>

                <div className="absolute bottom-4 left-4 right-4 flex justify-between rounded-xl border border-white/10 bg-black/30 px-4 py-3 backdrop-blur">
                  <span className="text-xs text-white/60">ROUND PREVIEW</span>
                  <span className="font-bold text-violet-300">ROOM MATCH</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-white/5 py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-400">
              Built to compete
            </p>

            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
              Everything you need to dominate.
            </h2>

            <p className="mt-4 text-white/50">
              Choose enemy-wave survival or create a private room for timed player-versus-player rounds.
            </p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            <FeatureCard
              icon={<Gamepad2 />}
              title="Two ways to play"
              description="Survive enemy waves alone or battle other players in a private room."
            />

            <FeatureCard
              icon={<Shield />}
              title="Round-based rooms"
              description="Room hosts set the round count and choose 60, 100, or 120-second rounds."
            />

            <FeatureCard
              icon={<Users />}
              title="Room codes"
              description="Invite up to 15 other players to a room with a shareable code."
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-t border-white/5 py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-400">
              Simple to start
            </p>

            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
              Four steps. One goal.
            </h2>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-4">
            {[
              ["01", "Choose", "Play Solo or Multiplayer."],
              ["02", "Create", "Host a room or enter a room code."],
              ["03", "Compete", "Move, aim, and shoot during each round."],
              ["04", "Review", "See your rank and personal results."],
            ].map(([number, title, description]) => (
              <div key={number} className="relative">
                <span className="text-5xl font-black text-white/10">
                  {number}
                </span>

                <h3 className="mt-3 text-xl font-bold">{title}</h3>

                <p className="mt-2 text-sm leading-6 text-white/45">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-5 pb-24 pt-12 sm:px-8">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl border border-violet-400/20 bg-violet-500/10 px-6 py-16 text-center sm:px-12">
          <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/20 blur-[100px]" />

          <div className="relative">
            <h2 className="text-3xl font-black sm:text-5xl">
              Ready to enter the arena?
            </h2>

            <p className="mx-auto mt-4 max-w-xl text-white/50">
              Set up a private room, choose the round settings, and start when your players are ready.
            </p>

            <Link href="/play" className="mt-8 inline-block rounded-xl bg-white px-7 py-3.5 font-semibold text-black transition hover:bg-violet-200">
              Play Campus Clash
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5 py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 text-sm text-white/40 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span>© 2026 Campus Clash</span>
          <span>Built for competitors.</span>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ duration: 0.2 }}
      className="group rounded-2xl border border-white/10 bg-white/3 p-6 transition-colors hover:border-violet-400/20 hover:bg-white/5"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400 transition group-hover:bg-violet-500/20">
        {icon}
      </div>

      <h3 className="mt-5 text-lg font-bold">{title}</h3>

      <p className="mt-2 text-sm leading-6 text-white/45">
        {description}
      </p>
    </motion.div>
  );
}