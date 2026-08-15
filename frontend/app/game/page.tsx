"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const GAME_WIDTH = 900;
const GAME_HEIGHT = 600;

interface Player {
  x: number;
  y: number;
  size: number;
  speed: number;
}

interface Orb {
  x: number;
  y: number;
  size: number;
}

interface Enemy {
  x: number;
  y: number;
  size: number;
  speed: number;
}

interface Projectile {
  x: number;
  y: number;
  dx: number;
  dy: number;
  speed: number;
  size: number;
}

export default function GamePage() {
  const router = useRouter();

  const projectiles = useRef<Projectile[]>([]);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const keys = useRef<Record<string, boolean>>({});

  const player = useRef<Player>({
    x: GAME_WIDTH / 2,
    y: GAME_HEIGHT / 2,
    size: 20,
    speed: 5,
  });

  const orb = useRef<Orb>({
    x: 200,
    y: 200,
    size: 10,
  });

  const enemies = useRef<Enemy[]>([
    {
      x: 100,
      y: 100,
      size: 18,
      speed: 1.5,
    },
    {
      x: 800,
      y: 500,
      size: 18,
      speed: 1.8,
    },
  ]);

  const health = useRef(100);

  const [displayHealth, setDisplayHealth] = useState(100);
  const [gameOver, setGameOver] = useState(false);

  const score = useRef(0);

  const [displayScore, setDisplayScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const gameOverRef = useRef(false);

  useEffect(() => {
    const token = localStorage.getItem("campus_clash_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    const canvas = canvasRef.current;

    if (!canvas) return;

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    const ctx: CanvasRenderingContext2D = context;

    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;

    const handleKeyDown = (event: KeyboardEvent) => {
      keys.current[event.key.toLowerCase()] = true;
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      keys.current[event.key.toLowerCase()] = false;
    };

    const handleShoot = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;

      if (gameOverRef.current) return;

      const nearestEnemy = enemies.current.reduce<Enemy | null>(
        (nearest, enemy) => {
          if (!nearest) return enemy;

          const currentDistance = Math.hypot(
            player.current.x - enemy.x,
            player.current.y - enemy.y,
          );

          const nearestDistance = Math.hypot(
            player.current.x - nearest.x,
            player.current.y - nearest.y,
          );

          return currentDistance < nearestDistance ? enemy : nearest;
        },
        null,
      );

      if (!nearestEnemy) return;

      const dx = nearestEnemy.x - player.current.x;

      const dy = nearestEnemy.y - player.current.y;

      const distance = Math.hypot(dx, dy);

      if (distance === 0) return;

      projectiles.current.push({
        x: player.current.x,
        y: player.current.y,
        dx: dx / distance,
        dy: dy / distance,
        speed: 9,
        size: 5,
      });
    };
    window.addEventListener("keydown", handleShoot);

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    let animationId: number;

    function spawnOrb() {
      orb.current.x = 30 + Math.random() * (GAME_WIDTH - 60);

      orb.current.y = 30 + Math.random() * (GAME_HEIGHT - 60);
    }

    function update() {
      if (gameOverRef.current) {
        return;
      }

      const p = player.current;

      if (keys.current["w"] || keys.current["arrowup"]) {
        p.y -= p.speed;
      }

      if (keys.current["s"] || keys.current["arrowdown"]) {
        p.y += p.speed;
      }

      if (keys.current["a"] || keys.current["arrowleft"]) {
        p.x -= p.speed;
      }

      if (keys.current["d"] || keys.current["arrowright"]) {
        p.x += p.speed;
      }

      p.x = Math.max(p.size, Math.min(GAME_WIDTH - p.size, p.x));

      p.y = Math.max(p.size, Math.min(GAME_HEIGHT - p.size, p.y));

      const orbDx = p.x - orb.current.x;
      const orbDy = p.y - orb.current.y;

      const orbDistance = Math.sqrt(orbDx * orbDx + orbDy * orbDy);

      if (orbDistance < p.size + orb.current.size) {
        score.current += 10;
        setDisplayScore(score.current);
        spawnOrb();
      }

      for (const enemy of enemies.current) {
        const enemyDx = p.x - enemy.x;
        const enemyDy = p.y - enemy.y;

        const enemyDistance = Math.sqrt(enemyDx * enemyDx + enemyDy * enemyDy);

        if (enemyDistance > 0) {
          enemy.x += (enemyDx / enemyDistance) * enemy.speed;

          enemy.y += (enemyDy / enemyDistance) * enemy.speed;
        }

        if (enemyDistance < p.size + enemy.size) {
          health.current -= 0.5;

          setDisplayHealth(Math.max(0, Math.round(health.current)));

          if (health.current <= 0) {
            gameOverRef.current = true;
            setGameOver(true);
            return;
          }
        }
      }
      for (let i = projectiles.current.length - 1; i >= 0; i--) {
        const projectile = projectiles.current[i];

        projectile.x += projectile.dx * projectile.speed;

        projectile.y += projectile.dy * projectile.speed;

        if (
          projectile.x < 0 ||
          projectile.x > GAME_WIDTH ||
          projectile.y < 0 ||
          projectile.y > GAME_HEIGHT
        ) {
          projectiles.current.splice(i, 1);
          continue;
        }

        for (let j = enemies.current.length - 1; j >= 0; j--) {
          const enemy = enemies.current[j];

          const distance = Math.hypot(
            projectile.x - enemy.x,
            projectile.y - enemy.y,
          );

          if (distance < projectile.size + enemy.size) {
            enemies.current.splice(j, 1);

            projectiles.current.splice(i, 1);

            score.current += 25;

            setDisplayScore(score.current);

            break;
          }
        }
      }
      if (enemies.current.length === 0) {
        enemies.current.push(
          {
            x: Math.random() * GAME_WIDTH,
            y: Math.random() * GAME_HEIGHT,
            size: 18,
            speed: 1.5 + Math.random(),
          },
          {
            x: Math.random() * GAME_WIDTH,
            y: Math.random() * GAME_HEIGHT,
            size: 18,
            speed: 1.5 + Math.random(),
          },
        );
      }
    }
    function draw() {
      ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      ctx.fillStyle = "#09090f";

      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      ctx.strokeStyle = "rgba(255,255,255,0.04)";

      ctx.lineWidth = 1;

      for (let x = 0; x < GAME_WIDTH; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, GAME_HEIGHT);
        ctx.stroke();
      }

      for (let y = 0; y < GAME_HEIGHT; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(GAME_WIDTH, y);
        ctx.stroke();
      }

      ctx.beginPath();

      ctx.arc(orb.current.x, orb.current.y, 20, 0, Math.PI * 2);

      ctx.fillStyle = "rgba(168,85,247,0.15)";

      ctx.fill();

      ctx.beginPath();

      ctx.arc(orb.current.x, orb.current.y, orb.current.size, 0, Math.PI * 2);

      ctx.fillStyle = "#a855f7";

      ctx.fill();

      for (const enemy of enemies.current) {
        ctx.beginPath();

        ctx.arc(enemy.x, enemy.y, enemy.size + 10, 0, Math.PI * 2);

        ctx.fillStyle = "rgba(239,68,68,0.12)";

        ctx.fill();

        ctx.beginPath();

        ctx.arc(enemy.x, enemy.y, enemy.size, 0, Math.PI * 2);

        ctx.fillStyle = "#ef4444";

        ctx.fill();
      }

      for (const projectile of projectiles.current) {
        ctx.beginPath();

        ctx.arc(projectile.x, projectile.y, projectile.size, 0, Math.PI * 2);

        ctx.fillStyle = "#facc15";

        ctx.fill();
      }

      ctx.beginPath();

      ctx.arc(player.current.x, player.current.y, 32, 0, Math.PI * 2);

      ctx.fillStyle = "rgba(59,130,246,0.12)";

      ctx.fill();

      ctx.beginPath();

      ctx.arc(
        player.current.x,
        player.current.y,
        player.current.size,
        0,
        Math.PI * 2,
      );

      ctx.fillStyle = "#3b82f6";

      ctx.fill();
    }

    function gameLoop() {
      update();
      draw();

      if (!gameOverRef.current) {
        animationId = requestAnimationFrame(gameLoop);
      }
    }

    gameLoop();

    return () => {
      cancelAnimationFrame(animationId);

      window.removeEventListener("keydown", handleKeyDown);

      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [router]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((time) => {
        if (time <= 1) {
          clearInterval(timer);

          gameOverRef.current = true;
          setGameOver(true);

          return 0;
        }

        return time - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <main className="min-h-screen bg-[#050509] text-white">
      {/* Header */}

      <header className="border-b border-white/10 bg-white/[0.02]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-sm text-white/50 transition hover:text-white"
          >
            ← Dashboard
          </button>

          <div className="flex items-center gap-6">
            <div>
              <p className="text-xs text-white/40">HEALTH</p>

              <p className="font-bold">{displayHealth}%</p>
            </div>
            <div>
              <p className="text-xs text-white/40">SCORE</p>

              <p className="font-bold">{displayScore}</p>
            </div>

            <div>
              <p className="text-xs text-white/40">TIME</p>

              <p className="font-bold">{timeLeft}s</p>
            </div>
          </div>
        </div>
      </header>

      {/* Game */}

      <section className="flex min-h-[calc(100vh-73px)] items-center justify-center px-3 py-6">
        <div className="w-full max-w-[900px]">
          <div className="mb-4">
            <h1 className="text-xl font-bold">Campus Arena</h1>

            <p className="text-sm text-white/40">
              Collect energy and survive the arena.
            </p>
          </div>

          <div className="overflow-hidden rounded-3xl border border-white/10 bg-black shadow-2xl">
            <canvas ref={canvasRef} className="block h-auto w-full" />
          </div>

          {/* Mobile controls */}

          <div className="mx-auto mt-6 grid w-48 grid-cols-3 gap-2 md:hidden">
            <div />

            <button
              className="h-14 rounded-xl bg-white/10 text-xl active:bg-white/20"
              onPointerDown={() => {
                keys.current["arrowup"] = true;
              }}
              onPointerUp={() => {
                keys.current["arrowup"] = false;
              }}
              onPointerLeave={() => {
                keys.current["arrowup"] = false;
              }}
            >
              ↑
            </button>

            <div />

            <button
              className="h-14 rounded-xl bg-white/10 text-xl active:bg-white/20"
              onPointerDown={() => {
                keys.current["arrowleft"] = true;
              }}
              onPointerUp={() => {
                keys.current["arrowleft"] = false;
              }}
              onPointerLeave={() => {
                keys.current["arrowleft"] = false;
              }}
            >
              ←
            </button>

            <button
              className="h-14 rounded-xl bg-white/10 text-xl active:bg-white/20"
              onPointerDown={() => {
                keys.current["arrowdown"] = true;
              }}
              onPointerUp={() => {
                keys.current["arrowdown"] = false;
              }}
              onPointerLeave={() => {
                keys.current["arrowdown"] = false;
              }}
            >
              ↓
            </button>

            <button
              className="h-14 rounded-xl bg-white/10 text-xl active:bg-white/20"
              onPointerDown={() => {
                keys.current["arrowright"] = true;
              }}
              onPointerUp={() => {
                keys.current["arrowright"] = false;
              }}
              onPointerLeave={() => {
                keys.current["arrowright"] = false;
              }}
            >
              →
            </button>
          </div>

          <p className="mt-5 text-center text-xs text-white/30">
            Desktop: WASD / Arrow Keys
          </p>
        </div>
      </section>
      {gameOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#101016] p-8 text-center shadow-2xl">
            <p className="text-sm font-medium tracking-widest text-red-400">
              ARENA OVER
            </p>

            <h2 className="mt-3 text-4xl font-bold">Game Over</h2>

            <p className="mt-3 text-white/40">You ran out of health.</p>

            <div className="mt-8 rounded-2xl bg-white/5 p-5">
              <p className="text-sm text-white/40">Final Score</p>

              <p className="mt-2 text-4xl font-bold text-violet-400">
                {displayScore}
              </p>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                onClick={() => window.location.reload()}
                className="rounded-xl bg-violet-500 px-4 py-3 font-semibold transition hover:bg-violet-400 active:scale-95"
              >
                Play Again
              </button>

              <button
                onClick={() => router.push("/dashboard")}
                className="rounded-xl bg-white/10 px-4 py-3 font-semibold transition hover:bg-white/15 active:scale-95"
              >
                Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
