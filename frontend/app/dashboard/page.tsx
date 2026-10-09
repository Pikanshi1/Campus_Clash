"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Gamepad2,
  Trophy,
  Zap,
  Target,
  LogOut,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  level: number;
  xp: number;
  score: number;
  wins: number;
  matches: number;
}

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const token = localStorage.getItem("campus_clash_token");

      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        const response = await fetch(
          `${API_BASE_URL}/auth/me`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          localStorage.removeItem("campus_clash_token");
          router.replace("/login");
          return;
        }

        const data = await response.json();

        setUser(data.user);
      } catch {
        localStorage.removeItem("campus_clash_token");
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [router]);

  function logout() {
    localStorage.removeItem("campus_clash_token");
    router.replace("/login");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#07070d] text-white">
        Loading arena...
      </main>
    );
  }

  if (!user) return null;

  return (
    <main className="min-h-screen bg-[#07070d] text-white">
      <nav className="border-b border-white/10 bg-white/2 px-5 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500">
              <Gamepad2 size={20} />
            </div>

            <span className="font-bold">Campus Clash</span>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/50 transition hover:bg-white/5 hover:text-white"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:py-12">
        <div className="mb-10">
          <p className="text-sm text-violet-400">
            Welcome back
          </p>

          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
            {user.username}
          </h1>

          <p className="mt-2 text-white/40">
            Ready to enter the arena?
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<Trophy size={20} />}
            label="Level"
            value={user.level}
          />

          <StatCard
            icon={<Zap size={20} />}
            label="XP"
            value={user.xp}
          />

          <StatCard
            icon={<Target size={20} />}
            label="Wins"
            value={user.wins}
          />

          <StatCard
            icon={<Trophy size={20} />}
            label="Score"
            value={user.score}
          />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <section className="rounded-3xl border border-white/10 bg-white/4 p-6 sm:p-8">
            <p className="text-sm font-medium text-violet-400">
              Featured Arena
            </p>

            <h2 className="mt-3 text-2xl font-bold">
              Campus Arena
            </h2>

            <p className="mt-3 max-w-xl text-sm leading-6 text-white/40">
              Enter the arena, collect energy, survive the
              chaos and climb the Campus Clash leaderboard.
            </p>

            <button
              onClick={() => router.push("/play")}
              className="mt-7 flex items-center gap-2 rounded-xl bg-violet-500 px-6 py-3 font-semibold transition hover:bg-violet-400 active:scale-95"
            >
              <Gamepad2 size={18} />
              Play Now
            </button>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/4 p-6 sm:p-8">
            <h2 className="text-lg font-semibold">
              Your Progress
            </h2>

            <div className="mt-6">
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-white/40">
                  Level {user.level}
                </span>

                <span className="text-white/40">
                  {user.xp % 100}/100 XP
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-violet-500"
                  style={{
                    width: `${user.xp % 100}%`,
                  }}
                />
              </div>
            </div>

            <div className="mt-8 flex justify-between border-t border-white/10 pt-5 text-sm">
              <span className="text-white/40">
                Matches
              </span>

              <span className="font-medium">
                {user.matches}
              </span>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/4 p-5">
      <div className="flex items-center gap-3 text-violet-400">
        {icon}
        <span className="text-sm text-white/40">
          {label}
        </span>
      </div>

      <p className="mt-4 text-2xl font-bold">
        {value.toLocaleString()}
      </p>
    </div>
  );
}