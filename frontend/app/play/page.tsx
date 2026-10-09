"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Gamepad2, UserRound, Users } from "lucide-react";
import Link from "next/link";

export default function PlayPage() {
  const router = useRouter();
  const [rulesAccepted, setRulesAccepted] = useState(false);

  function startGame(mode: "solo" | "multiplayer") {
    if (mode === "solo" && !rulesAccepted) return;

    if (!localStorage.getItem("campus_clash_token")) {
      router.push(mode === "solo" ? "/login?next=/play" : "/login?next=/multiplayer");
      return;
    }

    if (mode === "solo") {
      localStorage.setItem("campus_clash_rules_accepted", "true");
      router.push("/game?mode=solo");
      return;
    }

    router.push("/multiplayer");
  }

  return (
    <main className="min-h-screen bg-[#07070d] px-5 py-10 text-white sm:px-8">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-white/55 transition hover:text-white">
        <ArrowLeft size={16} />
        Home
      </Link>

      <div className="mx-auto max-w-4xl py-12">
        <p className="text-sm font-semibold uppercase text-violet-300">Before you play</p>
        <h1 className="mt-3 text-4xl font-black">Know the arena.</h1>
        <p className="mt-3 max-w-2xl leading-7 text-white/55">
          Play Solo against enemy waves, or create or join a room for player-versus-player rounds.
        </p>

        <section className="mt-9 border-y border-white/10 py-7" aria-labelledby="rules-heading">
          <h2 id="rules-heading" className="text-lg font-bold">Solo rules and controls</h2>
          <ul className="mt-4 grid gap-x-10 gap-y-3 text-sm leading-6 text-white/65 sm:grid-cols-2">
            <li><strong className="text-white">Move:</strong> WASD or arrow keys</li>
            <li><strong className="text-white">Aim:</strong> Move your mouse over the arena</li>
            <li><strong className="text-white">Fire:</strong> Click the arena or press Space</li>
            <li><strong className="text-white">Survive:</strong> Avoid enemies and use health drops</li>
            <li><strong className="text-white">Scoring:</strong> Defeat enemies to earn points</li>
            <li><strong className="text-white">Solo match:</strong> Score as much as you can before time expires</li>
          </ul>
        </section>

        <label className="mt-6 flex w-fit cursor-pointer items-center gap-3 text-sm text-white/75">
          <input
            type="checkbox"
            checked={rulesAccepted}
            onChange={(event) => setRulesAccepted(event.target.checked)}
            className="size-4 accent-violet-500"
          />
          I have read the Solo rules and controls
        </label>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            disabled={!rulesAccepted}
            onClick={() => startGame("solo")}
            className="flex min-h-36 items-center gap-5 border border-white/10 bg-white/4 p-6 text-left transition hover:border-violet-400/40 hover:bg-white/6 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <UserRound className="shrink-0 text-violet-300" size={30} />
            <span>
              <span className="block text-lg font-bold">Solo</span>
              <span className="mt-1 block text-sm text-white/50">Play alone in a private arena.</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => startGame("multiplayer")}
            className="flex min-h-36 items-center gap-5 border border-white/10 bg-white/4 p-6 text-left transition hover:border-cyan-300/40 hover:bg-white/6 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Users className="shrink-0 text-cyan-300" size={30} />
            <span>
              <span className="block text-lg font-bold">Multiplayer</span>
              <span className="mt-1 block text-sm text-white/50">Create or join a private room; the host sets round rules.</span>
            </span>
          </button>
        </div>

        <p className="mt-5 flex items-center gap-2 text-xs text-white/35">
          <Gamepad2 size={14} /> Solo lasts 100 seconds; room hosts choose 60, 100, or 120-second rounds.
        </p>
      </div>
    </main>
  );
}