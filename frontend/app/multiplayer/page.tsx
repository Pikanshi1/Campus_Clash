"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Copy, DoorOpen, Shield, Users } from "lucide-react";
import Link from "next/link";
import { socket } from "@/lib/socket";

const WIDTH = 1200;
const HEIGHT = 700;

interface RoomPlayer {
  id: string;
  username: string;
  position: { x: number; y: number };
  health: number;
  maxHealth: number;
  eliminated: boolean;
  status: "connected" | "disconnected" | "left";
  color: string;
}

interface RoomState {
  code: string;
  serverNow: number;
  hostUserId: string | null;
  settings: { totalRounds: number; durationSeconds: number; hitsToEliminate: number };
  phase: "lobby" | "countdown" | "running" | "round-end" | "finished";
  currentRound: number;
  countdownEndsAt: number | null;
  endsAt: number | null;
  roundWinnerUserId: string | null;
  finalWinnerUserId: string | null;
  aliveCount: number;
  players: RoomPlayer[];
  projectiles: Array<{
    id: string;
    ownerId: string;
    position: { x: number; y: number };
    radius: number;
    color: string;
  }>;
  obstacles: Array<{ x: number; y: number; width: number; height: number }>;
}

interface PersonalState {
  userId: string;
  rank: number;
  totalPlayers: number;
  username: string;
  score: number;
  eliminations: number;
  roundsWon: number;
  eliminated: boolean;
  roundScore: number;
}

export default function MultiplayerPage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keyState = useRef<Record<string, boolean>>({});
  const aim = useRef({ x: 1, y: 0 });
  const roomCodeRef = useRef("");
  const userIdRef = useRef("");
  const roomStateRef = useRef<RoomState | null>(null);
  const noticeTimerRef = useRef<number | null>(null);
  const [connected, setConnected] = useState(false);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [personal, setPersonal] = useState<PersonalState | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [codeInput, setCodeInput] = useState("");
  const [roundsDraft, setRoundsDraft] = useState("3");
  const [durationDraft, setDurationDraft] = useState("100");
  const [message, setMessage] = useState("");
  const [hitAt, setHitAt] = useState(0);
  const [combatNotice, setCombatNotice] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("campus_clash_token");
    if (!token) {
      router.replace("/login?next=/multiplayer");
      return;
    }

    socket.auth = { token };
    const queryCode = new URLSearchParams(window.location.search).get("code")?.trim().toUpperCase();
    const onConnect = () => {
      setConnected(true);
      const code = roomCodeRef.current || queryCode || sessionStorage.getItem("campus_clash_room_code") || "";
      if (code) socket.emit("room_join", { code });
    };
    const onDisconnect = () => setConnected(false);
    const onRoom = (state: RoomState) => {
      roomCodeRef.current = state.code;
      roomStateRef.current = state;
      sessionStorage.setItem("campus_clash_room_code", state.code);
      setRoom(state);
      setRoundsDraft(String(state.settings.totalRounds));
      setDurationDraft(String(state.settings.durationSeconds));
      setMessage("");
    };
    const onPersonal = (state: PersonalState) => setPersonal(state);
    const onError = ({ message: errorMessage }: { message: string }) => setMessage(errorMessage);
    const onLeft = () => {
      roomCodeRef.current = "";
      sessionStorage.removeItem("campus_clash_room_code");
      setRoom(null);
      setPersonal(null);
      router.push("/dashboard");
    };
    const onClosed = ({ message: closeMessage }: { message: string }) => {
      roomCodeRef.current = "";
      sessionStorage.removeItem("campus_clash_room_code");
      setRoom(null);
      setPersonal(null);
      setMessage(closeMessage);
    };
    const onHit = ({ targetUserId, shooterUserId, eliminated }: {
      targetUserId: string;
      shooterUserId: string;
      eliminated: boolean;
    }) => {
      if (userIdRef.current === targetUserId) setHitAt(Date.now());
      const latestRoom = roomStateRef.current;
      const targetName = latestRoom?.players.find((player) => player.id === targetUserId)?.username ?? "A player";
      const shooterName = latestRoom?.players.find((player) => player.id === shooterUserId)?.username ?? "A player";
      setCombatNotice(eliminated ? `${shooterName} eliminated ${targetName}` : `${targetName} was hit`);
      if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
      noticeTimerRef.current = window.setTimeout(() => setCombatNotice(""), 2200);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("room_state", onRoom);
    socket.on("room_personal", onPersonal);
    socket.on("room_error", onError);
    socket.on("room_left", onLeft);
    socket.on("room_closed", onClosed);
    socket.on("player_hit", onHit);
    socket.connect();

    const clock = window.setInterval(() => setNow(Date.now()), 100);
    const updateKeys = () => {
      if (!socket.connected || roomCodeRef.current === "") return;
      const x = Number(Boolean(keyState.current.d || keyState.current.arrowright)) -
        Number(Boolean(keyState.current.a || keyState.current.arrowleft));
      const y = Number(Boolean(keyState.current.s || keyState.current.arrowdown)) -
        Number(Boolean(keyState.current.w || keyState.current.arrowup));
      socket.emit("move", { x, y });
    };
    const frame = window.setInterval(updateKeys, 50);
    const keyDown = (event: KeyboardEvent) => {
      keyState.current[event.key.toLowerCase()] = true;
      if (event.code === "Space") {
        event.preventDefault();
        if (socket.connected && roomCodeRef.current) socket.emit("shoot", aim.current);
      }
    };
    const keyUp = (event: KeyboardEvent) => {
      keyState.current[event.key.toLowerCase()] = false;
    };
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);

    return () => {
      window.clearInterval(clock);
      window.clearInterval(frame);
      if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("room_state", onRoom);
      socket.off("room_personal", onPersonal);
      socket.off("room_error", onError);
      socket.off("room_left", onLeft);
      socket.off("room_closed", onClosed);
      socket.off("player_hit", onHit);
      socket.disconnect();
    };
  }, [router]);

  useEffect(() => {
    userIdRef.current = personal?.userId ?? "";
  }, [personal?.userId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = WIDTH * ratio;
    canvas.height = HEIGHT * ratio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    drawArena(context, room);
  }, [room]);

  function createRoom() {
    setMessage("");
    socket.emit("room_create");
  }

  function joinRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    socket.emit("room_join", { code: codeInput.trim().toUpperCase() });
  }

  function leaveRoom() {
    if (room?.phase === "running" && !window.confirm("Leave this active round? You can rejoin with the room code, but may be eliminated for this round.")) return;
    socket.emit("room_leave");
  }

  async function copyCode() {
    if (!room) return;
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setMessage("Copy was unavailable. Share the room code manually.");
    }
  }

  function aimAt(event: React.MouseEvent<HTMLCanvasElement>) {
    if (!room || !personal) return;
    const self = room.players.find((player) => player.id === personal.userId);
    if (!self) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * WIDTH - self.position.x;
    const y = ((event.clientY - rect.top) / rect.height) * HEIGHT - self.position.y;
    const length = Math.hypot(x, y) || 1;
    aim.current = { x: x / length, y: y / length };
  }

  function shootAt(event: React.MouseEvent<HTMLCanvasElement>) {
    aimAt(event);
    socket.emit("shoot", aim.current);
  }

  function remaining(endAt: number | null, currentTime = now) {
    return endAt === null ? 0 : Math.max(0, Math.ceil((endAt - currentTime) / 1000));
  }

  const isHost = Boolean(room && personal && room.hostUserId === personal.userId);
  const countdown = room?.phase === "countdown" ? Math.min(10, remaining(room.countdownEndsAt, room.serverNow)) : 0;
  const timeLeft = remaining(room?.endsAt ?? null, room?.serverNow ?? now);
  const myPlayer = room?.players.find((player) => player.id === personal?.userId);

  return (
    <main className="min-h-screen bg-[#050509] px-4 py-5 text-white sm:px-6">
      <header className="mx-auto flex max-w-7xl items-center justify-between border-b border-white/10 pb-4">
        <div>
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-xs text-white/40 hover:text-white">
            <ArrowLeft size={14} /> Dashboard
          </Link>
          <h1 className="mt-2 text-xl font-bold">Multiplayer Arena</h1>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className={connected ? "text-green-300" : "text-red-300"}>
            {connected ? "Connected" : "Reconnecting..."}
          </span>
          {room && <button onClick={leaveRoom} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 hover:bg-white/5"><DoorOpen size={16} /> Leave Room</button>}
        </div>
      </header>

      <div className="mx-auto max-w-7xl py-6">
        {message && <p role="alert" className="mb-5 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">{message}</p>}
        {combatNotice && <p role="status" className="mb-4 border-l-2 border-red-400 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-100">{combatNotice}</p>}

        {!room ? (
          <section className="mx-auto grid max-w-4xl gap-8 py-12 lg:grid-cols-[1fr_1fr]">
            <div>
              <p className="text-xs font-bold uppercase text-violet-300">Play together</p>
              <h2 className="mt-3 text-4xl font-black">Create a room or join by code.</h2>
              <p className="mt-4 text-sm leading-6 text-white/50">Every room has its own host, settings, rounds, timer, and results. Up to 16 players can join a room.</p>
              <button onClick={createRoom} disabled={!connected} className="mt-7 inline-flex items-center gap-2 rounded-xl bg-violet-500 px-5 py-3 font-semibold hover:bg-violet-400 disabled:opacity-50"><Users size={18} /> Create room</button>
            </div>
            <form onSubmit={joinRoom} className="self-center border border-white/10 bg-white/4 p-6">
              <label htmlFor="room-code" className="block text-sm font-semibold">Room code</label>
              <input id="room-code" value={codeInput} onChange={(event) => setCodeInput(event.target.value.toUpperCase().slice(0, 6))} maxLength={6} required placeholder="ABC123" className="mt-3 h-12 w-full rounded-lg border border-white/10 bg-black/30 px-4 font-mono text-lg uppercase tracking-widest outline-none focus:border-violet-400/50" />
              <button disabled={!connected || codeInput.trim().length < 6} className="mt-4 h-11 w-full rounded-lg bg-white/10 font-semibold hover:bg-white/15 disabled:opacity-40">Join room</button>
            </form>
          </section>
        ) : (
          <>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <p className="text-xs uppercase text-white/40">Room code</p>
                <div className="mt-1 flex items-center gap-3">
                  <span className="font-mono text-2xl font-bold tracking-[0.2em]">{room.code}</span>
                  <button onClick={copyCode} title="Copy invite code" className="rounded-md p-2 text-white/55 hover:bg-white/10 hover:text-white"><Copy size={16} /></button>
                  <span className="text-xs text-green-300">{copied ? "Copied" : ""}</span>
                </div>
              </div>
              <div className="flex items-center gap-5 text-sm">
                <span><Users className="mr-2 inline" size={16} />{room.players.length}/16 players</span>
                {room.phase === "running" && <span>Round {room.currentRound} of {room.settings.totalRounds}</span>}
                {room.phase === "running" && <span className="font-mono text-lg">{timeLeft}s</span>}
              </div>
            </div>

            {room.phase === "lobby" && (
              <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
                <section className="border border-white/10 bg-white/3 p-5">
                  <h2 className="font-bold">Players in this room</h2>
                  <ul className="mt-4 divide-y divide-white/5">
                    {room.players.map((player) => (
                      <li key={player.id} className="flex items-center justify-between py-3 text-sm">
                        <span className="flex items-center gap-3"><span className="size-3 rounded-full" style={{ backgroundColor: player.color }} />{player.username}{player.id === room.hostUserId && <span className="text-xs text-violet-300">HOST</span>}{player.id === personal?.userId && <span className="text-xs text-white/35">YOU</span>}</span>
                        <span className={player.status === "connected" ? "text-green-300" : "text-amber-300"}>{player.status}</span>
                      </li>
                    ))}
                  </ul>
                </section>
                <section className="border border-white/10 bg-white/3 p-5">
                  <h2 className="font-bold">Room settings</h2>
                  <label className="mt-4 block text-xs text-white/45">Total rounds</label>
                  <select disabled={!isHost} value={roundsDraft} onChange={(event) => { setRoundsDraft(event.target.value); socket.emit("room_configure", { totalRounds: Number(event.target.value) }); }} className="mt-2 h-10 w-full rounded-lg border border-white/10 bg-[#111118] px-3 text-sm disabled:opacity-60">{Array.from({ length: 10 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1} rounds</option>)}</select>
                  <label className="mt-4 block text-xs text-white/45">Round duration</label>
                  <select disabled={!isHost} value={durationDraft} onChange={(event) => { setDurationDraft(event.target.value); socket.emit("room_configure", { durationSeconds: Number(event.target.value) }); }} className="mt-2 h-10 w-full rounded-lg border border-white/10 bg-[#111118] px-3 text-sm disabled:opacity-60"><option value="60">60 seconds</option><option value="100">100 seconds</option><option value="120">120 seconds</option></select>
                  <label className="mt-4 block text-xs text-white/45">Hits to eliminate</label>
                  <select disabled={!isHost} value={room.settings.hitsToEliminate} onChange={(event) => socket.emit("room_configure", { hitsToEliminate: Number(event.target.value) })} className="mt-2 h-10 w-full rounded-lg border border-white/10 bg-[#111118] px-3 text-sm disabled:opacity-60">{[1, 2, 3, 4, 5].map((hits) => <option key={hits} value={hits}>{hits} hits</option>)}</select>
                  <button disabled={!isHost || room.players.filter((player) => player.status === "connected").length < 2} onClick={() => socket.emit("room_start")} className="mt-6 h-11 w-full rounded-lg bg-violet-500 font-bold hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-40">Start game</button>
                                    {isHost && <button onClick={() => { if (window.confirm("Close this room for everyone?")) socket.emit("room_close"); }} className="mt-2 h-10 w-full rounded-lg border border-red-400/20 text-sm text-red-200 hover:bg-red-400/10">Close room</button>}
                  {!isHost && <p className="mt-3 text-xs text-white/35">Waiting for the host to start.</p>}
                </section>
                <section className="border-t border-white/10 py-5 lg:col-span-2">
                  <h2 className="flex items-center gap-2 font-bold"><Shield size={17} className="text-violet-300" /> Multiplayer instructions</h2>
                  <div className="mt-3 grid gap-3 text-sm text-white/55 sm:grid-cols-2 lg:grid-cols-3">
                    <p>Move with WASD or the arrow keys. Aim with the mouse and click to fire, or press Space.</p>
                    <p>Each player starts with 100 health. {room.settings.hitsToEliminate} server-validated hits eliminate a player for that round.</p>
                    <p>Eliminations score points. The room shares a {room.settings.durationSeconds}-second round timer; round wins, score, and eliminations break ties.</p>
                  </div>
                </section>
              </div>
            )}

            {room.phase !== "lobby" && (
              <>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm">
                  <p className="text-white/55">WASD / arrows to move · Mouse to aim · Click or Space to fire</p>
                  {personal && <p className="text-white/60">Your rank <strong className="text-white">{personal.rank}/{personal.totalPlayers}</strong> · Score <strong className="text-white">{personal.score}</strong> · Eliminations <strong className="text-white">{personal.eliminations}</strong> · Round wins <strong className="text-white">{personal.roundsWon}</strong></p>}
                </div>
                <p className="mb-3 text-xs text-white/40">100 health · {room.settings.hitsToEliminate} hits eliminate · Eliminated players are out until the next round · Host settings: {room.settings.totalRounds} rounds of {room.settings.durationSeconds} seconds</p>
                <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
                  <div className="relative overflow-hidden border border-white/10 bg-black">
                    <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} onMouseMove={aimAt} onClick={shootAt} className={`block aspect-12/7 w-full ${room.phase === "running" && !personal?.eliminated ? "cursor-crosshair" : "cursor-default"}`} />
                    {room.phase === "countdown" && <div className="absolute inset-0 grid place-items-center bg-black/60"><div className="text-center"><p className="text-sm font-bold uppercase tracking-widest text-violet-300">Round 1 starts in</p><p className="mt-3 font-mono text-7xl font-black">{countdown}</p></div></div>}
                    {room.phase === "round-end" && <div className="absolute inset-0 grid place-items-center bg-black/70"><div className="text-center"><p className="text-xs font-bold uppercase tracking-widest text-violet-300">Round {room.currentRound} complete</p><p className="mt-3 text-3xl font-bold">{room.roundWinnerUserId ? `${room.players.find((player) => player.id === room.roundWinnerUserId)?.username ?? "Player"} wins the round` : "Round drawn"}</p><p className="mt-3 text-sm text-white/50">Next round starting shortly</p></div></div>}
                    {room.phase === "finished" && <div className="absolute inset-0 grid place-items-center bg-black/75 p-5"><div className="w-full max-w-md border border-white/10 bg-[#101016] p-7 text-center"><p className="text-xs font-bold uppercase tracking-widest text-violet-300">Match complete</p><h2 className="mt-3 text-3xl font-black">{room.finalWinnerUserId ? `${room.players.find((player) => player.id === room.finalWinnerUserId)?.username ?? "Player"} wins` : "Final draw"}</h2><p className="mt-4 text-lg">Your final rank: {personal?.rank} of {personal?.totalPlayers}</p><div className="mt-4 grid grid-cols-3 gap-2 text-sm"><p><strong className="block text-xl">{personal?.score ?? 0}</strong><span className="text-white/40">Score</span></p><p><strong className="block text-xl">{personal?.eliminations ?? 0}</strong><span className="text-white/40">Eliminations</span></p><p><strong className="block text-xl">{personal?.roundsWon ?? 0}</strong><span className="text-white/40">Round wins</span></p></div>{isHost && <><button onClick={() => socket.emit("room_start")} className="mt-6 w-full rounded-lg bg-violet-500 px-4 py-3 font-bold hover:bg-violet-400">Start another match</button><button onClick={() => socket.emit("room_return_lobby")} className="mt-2 w-full rounded-lg bg-white/10 px-4 py-3 font-semibold hover:bg-white/15">Return room to lobby</button></>}</div></div>}
                    {room.phase === "running" && personal?.eliminated && <div className="absolute inset-0 grid place-items-center bg-black/55"><p className="border border-red-400/30 bg-black/60 px-5 py-3 font-bold text-red-200">Eliminated for this round</p></div>}
                    {hitAt > now - 350 && <div className="pointer-events-none absolute inset-0 border-4 border-red-500/80" />}
                  </div>
                  <aside className="border border-white/10 bg-white/3 p-5">
                    <h2 className="font-bold">Room standings</h2>
                    <p className="mt-1 text-xs text-white/40">Your detailed stats are private.</p>
                    <div className="mt-4 space-y-3">{room.players.map((player) => <div key={player.id} className="flex items-center gap-3 text-sm"><span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: player.color }} /><span className="min-w-0 flex-1 truncate">{player.username}{player.id === personal?.userId ? " (you)" : ""}</span><span className="text-xs text-white/45">{player.status !== "connected" ? player.status : player.eliminated ? "out" : `${player.health} HP`}</span></div>)}</div>
                    <div className="mt-5 border-t border-white/10 pt-4 text-sm"><p className="text-white/45">Survivors <strong className="float-right text-white">{room.aliveCount}</strong></p><p className="mt-2 text-white/45">Round <strong className="float-right text-white">{room.currentRound}/{room.settings.totalRounds}</strong></p>{room.phase === "running" && <p className="mt-2 text-white/45">Time <strong className="float-right font-mono text-white">{timeLeft}s</strong></p>}</div>
                    {room.phase === "running" && <div className="mt-5"><p className="mb-2 text-xs text-white/45">YOUR HEALTH</p><div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-green-400 transition-all" style={{ width: `${myPlayer ? (myPlayer.health / myPlayer.maxHealth) * 100 : 0}%` }} /></div></div>}
                  </aside>
                </div>
                <div className="mx-auto mt-4 grid w-52 grid-cols-3 gap-2 sm:hidden">
                  <span />
                  <button aria-label="Move up" onPointerDown={() => { keyState.current.arrowup = true; }} onPointerUp={() => { keyState.current.arrowup = false; }} onPointerCancel={() => { keyState.current.arrowup = false; }} className="touch-none rounded-lg bg-white/10 py-3">↑</button>
                  <span />
                  <button aria-label="Move left" onPointerDown={() => { keyState.current.arrowleft = true; }} onPointerUp={() => { keyState.current.arrowleft = false; }} onPointerCancel={() => { keyState.current.arrowleft = false; }} className="touch-none rounded-lg bg-white/10 py-3">←</button>
                  <button aria-label="Move down" onPointerDown={() => { keyState.current.arrowdown = true; }} onPointerUp={() => { keyState.current.arrowdown = false; }} onPointerCancel={() => { keyState.current.arrowdown = false; }} className="touch-none rounded-lg bg-white/10 py-3">↓</button>
                  <button aria-label="Move right" onPointerDown={() => { keyState.current.arrowright = true; }} onPointerUp={() => { keyState.current.arrowright = false; }} onPointerCancel={() => { keyState.current.arrowright = false; }} className="touch-none rounded-lg bg-white/10 py-3">→</button>
                  <span />
                  <button aria-label="Fire" onPointerDown={() => socket.emit("shoot", aim.current)} className="col-span-3 rounded-lg bg-violet-500 py-3 font-semibold">Fire</button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function drawArena(context: CanvasRenderingContext2D, room: RoomState | null) {
  context.clearRect(0, 0, WIDTH, HEIGHT);
  context.fillStyle = "#050509";
  context.fillRect(0, 0, WIDTH, HEIGHT);
  context.strokeStyle = "rgba(255,255,255,0.045)";
  for (let x = 0; x <= WIDTH; x += 40) {
    context.beginPath(); context.moveTo(x, 0); context.lineTo(x, HEIGHT); context.stroke();
  }
  for (let y = 0; y <= HEIGHT; y += 40) {
    context.beginPath(); context.moveTo(0, y); context.lineTo(WIDTH, y); context.stroke();
  }
  if (!room) return;
  for (const obstacle of room.obstacles) {
    context.fillStyle = "#15151f";
    context.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    context.strokeStyle = "rgba(139,92,246,0.35)";
    context.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
  }
  for (const projectile of room.projectiles) {
    context.beginPath();
    context.arc(projectile.position.x, projectile.position.y, projectile.radius, 0, Math.PI * 2);
    context.fillStyle = projectile.color;
    context.fill();
  }
  for (const player of room.players) {
    context.beginPath();
    context.arc(player.position.x, player.position.y, 25, 0, Math.PI * 2);
    context.fillStyle = player.eliminated ? "rgba(255,255,255,0.08)" : `${player.color}35`;
    context.fill();
    context.beginPath();
    context.arc(player.position.x, player.position.y, 17, 0, Math.PI * 2);
    context.fillStyle = player.eliminated ? "#555560" : player.color;
    context.fill();
    context.fillStyle = "#08080c";
    context.font = "bold 12px sans-serif";
    context.textAlign = "center";
    context.fillText(player.username.slice(0, 16), player.position.x, player.position.y - 30);
    if (!player.eliminated) {
      context.fillStyle = "rgba(255,255,255,0.2)";
      context.fillRect(player.position.x - 18, player.position.y + 23, 36, 4);
      context.fillStyle = player.health <= 35 ? "#ef4444" : "#22c55e";
      context.fillRect(player.position.x - 18, player.position.y + 23, 36 * player.health / player.maxHealth, 4);
    }
  }
}