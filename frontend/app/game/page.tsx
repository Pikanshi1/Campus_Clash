"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { socket } from "@/lib/socket";

const WIDTH = 1200;
const HEIGHT = 700;

interface Vector {
  x: number;
  y: number;
}

interface Player {
  id: string;
  username: string;
  position: Vector;
  health: number;
  maxHealth: number;
  score: number;
  kills: number;
  deaths: number;
  streak: number;
  color: string;
  shieldUntil: number;
  respawnAt: number | null;
}

interface Enemy {
  id: string;
  type: "chaser" | "tank" | "shooter";
  position: Vector;
  health: number;
  maxHealth: number;
}

interface Projectile {
  id: string;
  ownerId: string;
  position: Vector;
  velocity: Vector;
  radius: number;
  color: string;
}

interface Pickup {
  id: string;
  type: "energy" | "shield" | "health";
  position: Vector;
  radius: number;
  value: number;
}

interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface GameState {
  id: string;
  status: string;
  wave: number;
  endsAt: number;
  players: Player[];
  enemies: Enemy[];
  projectiles: Projectile[];
  pickups: Pickup[];
  obstacles: Obstacle[];
}

export default function GamePage() {
  const router = useRouter();

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const keys = useRef<Record<string, boolean>>({});

  const mouse = useRef<Vector>({
    x: WIDTH / 2,
    y: HEIGHT / 2,
  });
  const facing = useRef<Vector>({
    x: 1,
    y: 0,
  });

  const [game, setGame] = useState<GameState | null>(null);

  const [now, setNow] = useState(() => Date.now());

  const [connected, setConnected] = useState(false);

  const [finished, setFinished] = useState(false);

  const [winner, setWinner] = useState<Player | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("campus_clash_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    const storedUsername = localStorage.getItem("campus_clash_username");

    socket.connect();

    const onConnect = () => {
      setConnected(true);

      socket.emit("join_game", {
        username: storedUsername || "Player",
      });
    };

    const onConnectError = () => {
      setConnected(false);
    };

    const onDisconnect = () => {
      setConnected(false);
    };

    socket.on("connect", onConnect);

    socket.on("connect_error", onConnectError);

    socket.on("disconnect", onDisconnect);

    const onState = (state: GameState) => {
      setGame(state);

      if (state.status === "running") {
        setFinished(false);
        setWinner(null);
      }
    };

    const onFinished = ({ winner }: { winner: Player | null }) => {
      setWinner(winner);
      setFinished(true);
    };

    socket.on("game_state", onState);

    socket.on("game_finished", onFinished);

    return () => {
      socket.off("connect", onConnect);

      socket.off("disconnect", onDisconnect);

      socket.off("connect_error", onConnectError);

      socket.off("game_state", onState);

      socket.off("game_finished", onFinished);

      socket.disconnect();
    };
  }, [router]);

  useEffect(() => {
    const clock = window.setInterval(() => setNow(Date.now()), 250);

    return () => window.clearInterval(clock);
  }, []);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      keys.current[event.key.toLowerCase()] = true;
    };

    const up = (event: KeyboardEvent) => {
      keys.current[event.key.toLowerCase()] = false;
    };

    window.addEventListener("keydown", down);

    window.addEventListener("keyup", up);

    return () => {
      window.removeEventListener("keydown", down);

      window.removeEventListener("keyup", up);
    };
  }, []);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      if (!socket.connected) {
        frame = requestAnimationFrame(update);

        return;
      }

      let x = 0;
      let y = 0;

      if (keys.current["w"] || keys.current["arrowup"]) {
        y -= 1;
      }

      if (keys.current["s"] || keys.current["arrowdown"]) {
        y += 1;
      }

      if (keys.current["a"] || keys.current["arrowleft"]) {
        x -= 1;
      }

      if (keys.current["d"] || keys.current["arrowright"]) {
        x += 1;
      }

      socket.emit("move", {
        x,
        y,
      });

      frame = requestAnimationFrame(update);
    };

    update();

    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.code !== "Space") return;

    event.preventDefault();

    if (!socket.connected) return;

    socket.emit("shoot", {
      x: facing.current.x,
      y: facing.current.y,
    });
  };

  window.addEventListener(
    "keydown",
    handleKeyDown
  );

  return () => {
    window.removeEventListener(
      "keydown",
      handleKeyDown
    );
  };
}, []);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    const resize = () => {
      const ratio = window.devicePixelRatio || 1;

      canvas.width = WIDTH * ratio;

      canvas.height = HEIGHT * ratio;

      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    resize();

    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    let frame = 0;

    const render = () => {
      drawGame(ctx, game);

      frame = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(frame);
  }, [game]);

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();

    mouse.current = {
      x: ((event.clientX - rect.left) / rect.width) * WIDTH,

      y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
    };

    const player = game?.players.find((item) => item.id === socket.id);

    if (player) {
      const direction = {
        x: mouse.current.x - player.position.x,
        y: mouse.current.y - player.position.y,
      };
      const length = Math.hypot(direction.x, direction.y);

      if (length > 0) {
        facing.current = {
          x: direction.x / length,
          y: direction.y / length,
        };
      }
    }
  };

  const shoot = () => {
    socket.emit("shoot", mouse.current);
  };

  const currentPlayer = game?.players.find((player) => player.id === socket.id);

  const timeLeft = game
    ? Math.max(0, Math.ceil((game.endsAt - now) / 1000))
    : 0;

  return (
    <main className="min-h-screen bg-[#050509] text-white">
      <header className="border-b border-white/10 bg-white/2">
        <div className="mx-auto flex max-w-350 items-center justify-between px-5 py-4">
          <div>
            <h1 className="text-lg font-bold">Campus Clash</h1>

            <p className="text-xs text-white/40">Multiplayer Arena</p>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-[10px] text-white/40">STATUS</p>

              <p
                className={
                  connected
                    ? "font-bold text-green-400"
                    : "font-bold text-red-400"
                }
              >
                {connected ? "ONLINE" : "OFFLINE"}
              </p>
            </div>

            <div className="text-center">
              <p className="text-[10px] text-white/40">WAVE</p>

              <p className="font-bold">{game?.wave ?? 1}</p>
            </div>

            <div className="text-center">
              <p className="text-[10px] text-white/40">TIME</p>

              <p className="font-bold">{timeLeft}s</p>
            </div>

            <button
              onClick={() => router.push("/dashboard")}
              className="rounded-xl bg-white/5 px-4 py-2 text-sm transition hover:bg-white/10"
            >
              Dashboard
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-350 px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Arena</h2>

            <p className="text-sm text-white/40">
              WASD to move · Mouse to aim · Click to fire
            </p>
          </div>

          {currentPlayer && (
            <div className="flex items-center gap-5">
              <div>
                <p className="text-xs text-white/40">HEALTH</p>

                <div className="mt-1 h-2 w-32 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-green-500 transition-all"
                    style={{
                      width: `${Math.max(
                        0,
                        (currentPlayer.health / currentPlayer.maxHealth) * 100,
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <p className="text-xs text-white/40">SCORE</p>

                <p className="font-bold">{currentPlayer.score}</p>
              </div>

              <div>
                <p className="text-xs text-white/40">KILLS</p>

                <p className="font-bold">{currentPlayer.kills}</p>
              </div>

              <div>
                <p className="text-xs text-white/40">STREAK</p>

                <p className="font-bold text-orange-400">
                  {currentPlayer.streak}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_240px]">
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-black shadow-2xl">
            <canvas
              ref={canvasRef}
              width={WIDTH}
              height={HEIGHT}
              onMouseMove={handleMouseMove}
              onClick={shoot}
              className="block h-auto w-full cursor-crosshair"
            />
          </div>

          <aside className="rounded-3xl border border-white/10 bg-white/3 p-5">
            <h3 className="mb-4 font-bold">Scoreboard</h3>

            <div className="space-y-3">
              {[...(game?.players ?? [])]
                .sort((a, b) => b.score - a.score)
                .map((player, index) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-white/30">{index + 1}</span>

                      <span
                        className="h-3 w-3 rounded-full"
                        style={{
                          background: player.color,
                        }}
                      />

                      <span className="max-w-25 truncate text-sm">
                        {player.username}
                      </span>
                    </div>

                    <span className="text-sm font-bold">{player.score}</span>
                  </div>
                ))}
            </div>

            <div className="mt-6 border-t border-white/10 pt-5">
              <p className="text-xs text-white/40">PLAYERS</p>

              <p className="mt-1 text-2xl font-bold">
                {game?.players.length ?? 0}
              </p>

              <p className="mt-4 text-xs text-white/40">ENEMIES</p>

              <p className="mt-1 text-2xl font-bold text-red-400">
                {game?.enemies.length ?? 0}
              </p>
            </div>
          </aside>
        </div>

        <div className="mt-5 flex justify-center gap-3 md:hidden">
          <button
            onPointerDown={() => (keys.current["arrowup"] = true)}
            onPointerUp={() => (keys.current["arrowup"] = false)}
            className="rounded-xl bg-white/10 px-6 py-4"
          >
            ↑
          </button>

          <button
            onPointerDown={() => (keys.current["arrowleft"] = true)}
            onPointerUp={() => (keys.current["arrowleft"] = false)}
            className="rounded-xl bg-white/10 px-6 py-4"
          >
            ←
          </button>

          <button
            onPointerDown={() => (keys.current["arrowdown"] = true)}
            onPointerUp={() => (keys.current["arrowdown"] = false)}
            className="rounded-xl bg-white/10 px-6 py-4"
          >
            ↓
          </button>

          <button
            onPointerDown={() => (keys.current["arrowright"] = true)}
            onPointerUp={() => (keys.current["arrowright"] = false)}
            className="rounded-xl bg-white/10 px-6 py-4"
          >
            →
          </button>

          <button
            onPointerDown={shoot}
            className="rounded-xl bg-violet-500 px-6 py-4 font-bold"
          >
            FIRE
          </button>
        </div>
      </section>

      {finished && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-5 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#101016] p-8 text-center">
            <p className="text-sm tracking-widest text-violet-400">
              MATCH COMPLETE
            </p>

            <h2 className="mt-3 text-4xl font-bold">Arena Champion</h2>

            {winner && (
              <>
                <p className="mt-6 text-white/40">Winner</p>

                <p
                  className="mt-2 text-3xl font-bold"
                  style={{
                    color: winner.color,
                  }}
                >
                  {winner.username}
                </p>

                <p className="mt-2 text-white/50">{winner.score} points</p>
              </>
            )}

            <button
              onClick={() => {
                setFinished(false);
                setWinner(null);
                setGame(null);
                socket.disconnect();
                socket.connect();
              }}
              className="mt-8 w-full rounded-xl bg-violet-500 px-5 py-3 font-bold transition hover:bg-violet-400"
            >
              Play Again
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function drawGame(ctx: CanvasRenderingContext2D, game: GameState | null) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = "#050509";

  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.strokeStyle = "rgba(255,255,255,0.035)";

  ctx.lineWidth = 1;

  for (let x = 0; x <= WIDTH; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, HEIGHT);
    ctx.stroke();
  }

  for (let y = 0; y <= HEIGHT; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
    ctx.stroke();
  }

  if (!game) {
    ctx.fillStyle = "rgba(255,255,255,0.5)";

    ctx.font = "20px sans-serif";

    ctx.textAlign = "center";

    ctx.fillText("Connecting to arena...", WIDTH / 2, HEIGHT / 2);

    return;
  }

  for (const obstacle of game.obstacles) {
    ctx.fillStyle = "#15151f";

    ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);

    ctx.strokeStyle = "rgba(139,92,246,0.3)";

    ctx.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
  }

  for (const pickup of game.pickups) {
    const color =
      pickup.type === "health"
        ? "#22c55e"
        : pickup.type === "shield"
          ? "#06b6d4"
          : "#a855f7";

    ctx.beginPath();

    ctx.arc(
      pickup.position.x,
      pickup.position.y,
      pickup.radius + 8,
      0,
      Math.PI * 2,
    );

    ctx.fillStyle = `${color}22`;

    ctx.fill();

    ctx.beginPath();

    ctx.arc(
      pickup.position.x,
      pickup.position.y,
      pickup.radius,
      0,
      Math.PI * 2,
    );

    ctx.fillStyle = color;

    ctx.fill();
  }

  for (const projectile of game.projectiles) {
    ctx.beginPath();

    ctx.arc(
      projectile.position.x,
      projectile.position.y,
      projectile.radius,
      0,
      Math.PI * 2,
    );

    ctx.fillStyle = projectile.color;

    ctx.shadowBlur = 15;
    ctx.shadowColor = projectile.color;

    ctx.fill();

    ctx.shadowBlur = 0;
  }

  for (const enemy of game.enemies) {
    const radius =
      enemy.type === "tank" ? 27 : enemy.type === "shooter" ? 20 : 18;

    const color =
      enemy.type === "tank"
        ? "#f97316"
        : enemy.type === "shooter"
          ? "#eab308"
          : "#ef4444";

    ctx.beginPath();

    ctx.arc(enemy.position.x, enemy.position.y, radius + 9, 0, Math.PI * 2);

    ctx.fillStyle = `${color}20`;

    ctx.fill();

    ctx.beginPath();

    ctx.arc(enemy.position.x, enemy.position.y, radius, 0, Math.PI * 2);

    ctx.fillStyle = color;

    ctx.fill();

    const healthWidth = radius * 2;

    ctx.fillStyle = "rgba(0,0,0,0.6)";

    ctx.fillRect(
      enemy.position.x - radius,
      enemy.position.y - radius - 10,
      healthWidth,
      4,
    );

    ctx.fillStyle = "#22c55e";

    ctx.fillRect(
      enemy.position.x - radius,
      enemy.position.y - radius - 10,
      healthWidth * Math.max(0, enemy.health / enemy.maxHealth),
      4,
    );
  }

  for (const player of game.players) {
    if (player.respawnAt !== null) {
      continue;
    }

    const isCurrent = player.id === socket.id;

    ctx.beginPath();

    ctx.arc(player.position.x, player.position.y, 32, 0, Math.PI * 2);

    ctx.fillStyle = `${player.color}20`;

    ctx.fill();

    if (player.shieldUntil > Date.now()) {
      ctx.beginPath();

      ctx.arc(player.position.x, player.position.y, 27, 0, Math.PI * 2);

      ctx.strokeStyle = "#22d3ee";

      ctx.lineWidth = 3;

      ctx.stroke();
    }

    ctx.beginPath();

    ctx.arc(player.position.x, player.position.y, 18, 0, Math.PI * 2);

    ctx.fillStyle = player.color;

    ctx.fill();

    if (isCurrent) {
      ctx.beginPath();

      ctx.arc(player.position.x, player.position.y, 23, 0, Math.PI * 2);

      ctx.strokeStyle = "#ffffff";

      ctx.lineWidth = 2;

      ctx.stroke();
    }

    const healthWidth = 44;

    ctx.fillStyle = "rgba(0,0,0,0.7)";

    ctx.fillRect(
      player.position.x - healthWidth / 2,
      player.position.y - 35,
      healthWidth,
      5,
    );

    ctx.fillStyle = "#22c55e";

    ctx.fillRect(
      player.position.x - healthWidth / 2,
      player.position.y - 35,
      healthWidth * Math.max(0, player.health / player.maxHealth),
      5,
    );

    ctx.fillStyle = "#ffffff";

    ctx.font = "11px sans-serif";

    ctx.textAlign = "center";

    ctx.fillText(player.username, player.position.x, player.position.y - 43);
  }
}
