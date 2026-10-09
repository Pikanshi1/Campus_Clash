import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { Server, Socket } from "socket.io";
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  MATCH_DURATION,
  PLAYER_FIRE_COOLDOWN,
  PLAYER_MAX_HEALTH,
  PLAYER_PROJECTILE_DAMAGE,
  PLAYER_PROJECTILE_SPEED,
} from "./constants";
import { createGameRoom, createPlayer, resetGameRoom } from "./gameState";
import { distance } from "./physics";
import { GameRoom, Player, Projectile, Vector } from "./types";
import {
  MultiplayerRoomStore,
  postgresMultiplayerRoomStore,
} from "./multiplayerRoomStore";

const MAX_ROOM_PLAYERS = 16;
const MAX_ROUNDS = 10;
const COUNTDOWN_MS = 10_000;
const ROUND_BREAK_MS = 5_000;
const EMPTY_ROOM_TTL_MS = 30 * 60_000;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export type RoomPhase = "lobby" | "countdown" | "running" | "round-end" | "finished";
export type ConnectionStatus = "connected" | "disconnected" | "left";

export interface MultiplayerPlayer {
  player: Player;
  socketId: string | null;
  connection: ConnectionStatus;
  eliminated: boolean;
  eliminations: number;
  roundsWon: number;
  roundScore: number;
  joinedAt: number;
}

export interface MultiplayerRoom {
  code: string;
  socketRoom: string;
  hostUserId: string | null;
  settings: { totalRounds: number; durationSeconds: number; hitsToEliminate: number };
  phase: RoomPhase;
  currentRound: number;
  countdownEndsAt: number | null;
  endsAt: number | null;
  roundBreakEndsAt: number | null;
  game: GameRoom;
  members: Map<string, MultiplayerPlayer>;
  lastActiveAt: number;
  roundWinnerUserId: string | null;
}

interface Membership {
  code: string;
  userId: string;
}

const rooms = new Map<string, MultiplayerRoom>();
const memberships = new Map<string, Membership>();
let roomStore: MultiplayerRoomStore = postgresMultiplayerRoomStore;
const persistenceQueues = new Map<string, Promise<void>>();
const lastPersistedAt = new Map<string, number>();
const persistenceTimers = new Map<string, ReturnType<typeof setTimeout>>();

interface StoredMultiplayerRoom {
  version: 1;
  code: string;
  hostUserId: string | null;
  settings: MultiplayerRoom["settings"];
  phase: RoomPhase;
  currentRound: number;
  countdownEndsAt: number | null;
  endsAt: number | null;
  roundBreakEndsAt: number | null;
  lastActiveAt: number;
  roundWinnerUserId: string | null;
  game: Omit<GameRoom, "players" | "enemies" | "projectiles" | "pickups"> & {
    players: Player[];
    enemies: GameRoom["enemies"] extends Map<string, infer T> ? T[] : never;
    projectiles: Projectile[];
    pickups: GameRoom["pickups"] extends Map<string, infer T> ? T[] : never;
  };
  members: Array<{
    userId: string;
    playerId: string;
    connection: ConnectionStatus;
    eliminated: boolean;
    eliminations: number;
    roundsWon: number;
    roundScore: number;
    joinedAt: number;
  }>;
}

export function serializeRoomForStorage(room: MultiplayerRoom): Prisma.InputJsonValue {
  const stored: StoredMultiplayerRoom = {
    version: 1,
    code: room.code,
    hostUserId: room.hostUserId,
    settings: room.settings,
    phase: room.phase,
    currentRound: room.currentRound,
    countdownEndsAt: room.countdownEndsAt,
    endsAt: room.endsAt,
    roundBreakEndsAt: room.roundBreakEndsAt,
    lastActiveAt: room.lastActiveAt,
    roundWinnerUserId: room.roundWinnerUserId,
    game: {
      id: room.game.id,
      status: room.game.status,
      startedAt: room.game.startedAt,
      endsAt: room.game.endsAt,
      wave: room.game.wave,
      nextWaveAt: room.game.nextWaveAt,
      obstacles: room.game.obstacles,
      players: [...room.game.players.values()],
      enemies: [...room.game.enemies.values()],
      projectiles: [...room.game.projectiles.values()],
      pickups: [...room.game.pickups.values()],
    },
    members: [...room.members].map(([userId, member]) => ({
      userId,
      playerId: member.player.id,
      connection: member.connection === "connected" ? "disconnected" : member.connection,
      eliminated: member.eliminated,
      eliminations: member.eliminations,
      roundsWon: member.roundsWon,
      roundScore: member.roundScore,
      joinedAt: member.joinedAt,
    })),
  };

  return JSON.parse(JSON.stringify(stored)) as Prisma.InputJsonValue;
}

export function restoreRoomFromStorage(code: string, value: Prisma.JsonValue): MultiplayerRoom {
  const stored = value as unknown as StoredMultiplayerRoom;
  if (
    stored.version !== 1 ||
    stored.code !== code ||
    !Array.isArray(stored.members) ||
    !stored.game ||
    !Array.isArray(stored.game.players) ||
    !Array.isArray(stored.game.enemies) ||
    !Array.isArray(stored.game.projectiles) ||
    !Array.isArray(stored.game.pickups)
  ) {
    throw new Error(`Invalid multiplayer room snapshot for ${code}`);
  }

  const players = new Map(stored.game.players.map((player) => [player.id, player]));
  const members = new Map<string, MultiplayerPlayer>();
  for (const storedMember of stored.members) {
    const player = players.get(storedMember.playerId);
    if (!player) throw new Error(`Missing player ${storedMember.playerId} in room ${code}`);
    members.set(storedMember.userId, {
      player,
      socketId: null,
      connection: storedMember.connection === "connected" ? "disconnected" : storedMember.connection,
      eliminated: storedMember.eliminated,
      eliminations: storedMember.eliminations,
      roundsWon: storedMember.roundsWon,
      roundScore: storedMember.roundScore,
      joinedAt: storedMember.joinedAt,
    });
  }

  const game: GameRoom = {
    id: stored.game.id,
    status: stored.game.status,
    startedAt: stored.game.startedAt,
    endsAt: stored.game.endsAt,
    wave: stored.game.wave,
    nextWaveAt: stored.game.nextWaveAt,
    obstacles: stored.game.obstacles,
    players,
    enemies: new Map(stored.game.enemies.map((enemy) => [enemy.id, enemy])),
    projectiles: new Map(stored.game.projectiles.map((projectile) => [projectile.id, projectile])),
    pickups: new Map(stored.game.pickups.map((pickup) => [pickup.id, pickup])),
  };

  return {
    code,
    socketRoom: socketRoomName(code),
    hostUserId: stored.hostUserId,
    settings: stored.settings,
    phase: stored.phase,
    currentRound: stored.currentRound,
    countdownEndsAt: stored.countdownEndsAt,
    endsAt: stored.endsAt,
    roundBreakEndsAt: stored.roundBreakEndsAt,
    game,
    members,
    lastActiveAt: stored.lastActiveAt,
    roundWinnerUserId: stored.roundWinnerUserId,
  };
}

function persistRoom(room: MultiplayerRoom, force = false) {
  const now = Date.now();
  const previousSave = lastPersistedAt.get(room.code) ?? 0;
  if (!force && now - previousSave < 500) {
    if (!persistenceTimers.has(room.code)) {
      const timer = setTimeout(() => {
        persistenceTimers.delete(room.code);
        if (rooms.has(room.code)) persistRoom(room, true);
      }, 500 - (now - previousSave));
      persistenceTimers.set(room.code, timer);
    }
    return;
  }

  lastPersistedAt.set(room.code, now);
  const snapshot = serializeRoomForStorage(room);
  const previousQueue = persistenceQueues.get(room.code) ?? Promise.resolve();
  const nextSave = previousQueue
    .catch(() => undefined)
    .then(() => roomStore.save(room.code, snapshot))
    .catch((error: unknown) => {
      lastPersistedAt.delete(room.code);
      console.error(`Failed to persist multiplayer room ${room.code}:`, error);
    });
  persistenceQueues.set(room.code, nextSave);
}

function deleteRoomSnapshot(code: string) {
  const previousQueue = persistenceQueues.get(code) ?? Promise.resolve();
  const nextDelete = previousQueue
    .catch(() => undefined)
    .then(() => roomStore.delete(code))
    .catch((error: unknown) => {
      console.error(`Failed to delete multiplayer room ${code}:`, error);
    });
  persistenceQueues.set(code, nextDelete);
}

async function flushRoomSnapshots() {
  for (const [code, timer] of persistenceTimers) {
    clearTimeout(timer);
    persistenceTimers.delete(code);
  }
  for (const room of rooms.values()) persistRoom(room, true);
  await Promise.all(persistenceQueues.values());
}

function newRoomCode() {
  let code = "";
  do {
    code = Array.from(randomBytes(6), (value) => ALPHABET[value % ALPHABET.length]).join("");
  } while (rooms.has(code));
  return code;
}

function socketRoomName(code: string) {
  return `multiplayer:${code}`;
}

function createMultiplayerRoom(code: string, hostUserId: string): MultiplayerRoom {
  const game = createGameRoom(`multiplayer-${code}`);
  game.enemies.clear();
  game.projectiles.clear();

  return {
    code,
    socketRoom: socketRoomName(code),
    hostUserId,
    settings: { totalRounds: 3, durationSeconds: MATCH_DURATION, hitsToEliminate: 3 },
    phase: "lobby",
    currentRound: 0,
    countdownEndsAt: null,
    endsAt: null,
    roundBreakEndsAt: null,
    game,
    members: new Map(),
    lastActiveAt: Date.now(),
    roundWinnerUserId: null,
  };
}

function makeMember(socket: Socket, room: MultiplayerRoom): MultiplayerPlayer {
  const userId = String(socket.data.userId);
  const index = room.members.size;
  const player = createPlayer(userId, String(socket.data.username || "Player"), index);
  player.health = PLAYER_MAX_HEALTH;
  player.maxHealth = PLAYER_MAX_HEALTH;
  room.game.players.set(userId, player);

  return {
    player,
    socketId: socket.id,
    connection: "connected",
    eliminated: room.phase === "running" || room.phase === "round-end",
    eliminations: 0,
    roundsWon: 0,
    roundScore: 0,
    joinedAt: Date.now(),
  };
}

function connectedMembers(room: MultiplayerRoom) {
  return [...room.members.values()].filter((member) => member.connection === "connected");
}

function chooseNewHost(room: MultiplayerRoom) {
  const nextHost = connectedMembers(room)
    .sort((a, b) => a.joinedAt - b.joinedAt)[0];
  room.hostUserId = nextHost?.player.id ?? null;
}

function sortedLeaderboard(room: MultiplayerRoom) {
  return [...room.members.values()].sort((a, b) =>
    b.player.score - a.player.score ||
    b.eliminations - a.eliminations ||
    b.roundsWon - a.roundsWon ||
    a.player.username.localeCompare(b.player.username) ||
    a.player.id.localeCompare(b.player.id),
  );
}

function publicState(room: MultiplayerRoom) {
  const ranking = sortedLeaderboard(room);
  const first = ranking[0];
  const second = ranking[1];
  const finalWinnerUserId = room.phase !== "finished" || !first
    ? null
    : second && first.player.score === second.player.score &&
      first.eliminations === second.eliminations && first.roundsWon === second.roundsWon
      ? null
      : first.player.id;

  return {
    code: room.code,
    serverNow: Date.now(),
    hostUserId: room.hostUserId,
    settings: room.settings,
    phase: room.phase,
    currentRound: room.currentRound,
    countdownEndsAt: room.countdownEndsAt,
    endsAt: room.endsAt,
    roundWinnerUserId: room.roundWinnerUserId,
    finalWinnerUserId,
    aliveCount: [...room.members.values()].filter((member) =>
      member.connection === "connected" && !member.eliminated,
    ).length,
    players: [...room.members.values()].map((member) => ({
      id: member.player.id,
      username: member.player.username,
      position: member.player.position,
      health: member.player.health,
      maxHealth: member.player.maxHealth,
      eliminated: member.eliminated,
      status: member.connection,
      color: member.player.color,
    })),
    projectiles: [...room.game.projectiles.values()].map((projectile) => ({
      id: projectile.id,
      ownerId: projectile.ownerId,
      position: projectile.position,
      radius: projectile.radius,
      color: projectile.color,
    })),
    obstacles: room.game.obstacles,
  };
}

function emitRoom(io: Server, room: MultiplayerRoom) {
  if (connectedMembers(room).length > 0) room.lastActiveAt = Date.now();
  persistRoom(room);
  const state = publicState(room);
  io.to(room.socketRoom).emit("room_state", state);

  const ranking = sortedLeaderboard(room);
  for (const [index, member] of ranking.entries()) {
    if (!member.socketId || member.connection !== "connected") continue;
    io.to(member.socketId).emit("room_personal", {
      userId: member.player.id,
      rank: index + 1,
      totalPlayers: ranking.length,
      username: member.player.username,
      score: member.player.score,
      eliminations: member.eliminations,
      roundsWon: member.roundsWon,
      eliminated: member.eliminated,
      roundScore: member.roundScore,
    });
  }
}

function memberForSocket(socket: Socket) {
  const membership = memberships.get(socket.id);
  if (!membership) return undefined;
  const room = rooms.get(membership.code);
  const member = room?.members.get(membership.userId);
  if (!room || !member || member.socketId !== socket.id) return undefined;
  return { room, member };
}

function sendError(socket: Socket, message: string) {
  socket.emit("room_error", { message });
}

function enterRoom(io: Server, socket: Socket, room: MultiplayerRoom) {
  const userId = String(socket.data.userId);
  const existingMembership = memberships.get(socket.id);
  if (existingMembership) {
    sendError(socket, "Leave your current room before joining another one.");
    return;
  }

  let member = room.members.get(userId);
  if (!member && room.phase === "finished") {
    sendError(socket, "This match is complete. Ask the host to return the room to its lobby before joining.");
    return;
  }
  const previousSocket = member?.socketId
    ? io.sockets.sockets.get(member.socketId)
    : undefined;
  if (member?.connection === "connected" && member.socketId !== socket.id && previousSocket) {
    sendError(socket, "Your account is already connected to this room.");
    return;
  }

  if (!member) {
    if (room.members.size >= MAX_ROOM_PLAYERS) {
      sendError(socket, "This room is full.");
      return;
    }
    member = makeMember(socket, room);
    room.members.set(userId, member);
  } else {
    member.socketId = socket.id;
    member.connection = "connected";
    member.player.username = String(socket.data.username || member.player.username);
    member.player.velocity = { x: 0, y: 0 };
    if (room.phase === "running" && member.eliminated) {
      member.player.health = 0;
    }
  }

  if (!room.hostUserId) room.hostUserId = userId;
  socket.join(room.socketRoom);
  memberships.set(socket.id, { code: room.code, userId });
  emitRoom(io, room);
}

function startRound(room: MultiplayerRoom, now: number) {
  room.phase = "running";
  room.countdownEndsAt = null;
  room.roundBreakEndsAt = null;
  room.endsAt = now + room.settings.durationSeconds * 1000;
  room.roundWinnerUserId = null;
  room.game.startedAt = now;
  room.game.endsAt = room.endsAt;
  room.game.projectiles.clear();

  for (const member of room.members.values()) {
    const { player } = member;
    const angle = Math.random() * Math.PI * 2;
    const radius = 180 + Math.random() * 140;
    player.position = {
      x: Math.max(30, Math.min(GAME_WIDTH - 30, GAME_WIDTH / 2 + Math.cos(angle) * radius)),
      y: Math.max(30, Math.min(GAME_HEIGHT - 30, GAME_HEIGHT / 2 + Math.sin(angle) * radius)),
    };
    player.velocity = { x: 0, y: 0 };
    player.health = PLAYER_MAX_HEALTH;
    player.maxHealth = PLAYER_MAX_HEALTH;
    player.lastShot = 0;
    player.respawnAt = null;
    member.eliminated = false;
    member.roundScore = 0;
  }
}

function startCountdown(room: MultiplayerRoom) {
  room.phase = "countdown";
  room.currentRound = 1;
  room.countdownEndsAt = Date.now() + COUNTDOWN_MS;
  room.endsAt = null;
  room.roundWinnerUserId = null;
  room.game.projectiles.clear();

  for (const member of room.members.values()) {
    member.player.score = 0;
    member.player.kills = 0;
    member.player.deaths = 0;
    member.eliminations = 0;
    member.roundsWon = 0;
    member.roundScore = 0;
    member.eliminated = false;
  }
}

function finishRound(room: MultiplayerRoom, now: number) {
  if (room.phase !== "running") return;
  room.phase = "round-end";
  room.endsAt = null;
  room.roundBreakEndsAt = now + ROUND_BREAK_MS;
  room.game.projectiles.clear();

  for (const member of room.members.values()) {
    member.player.velocity = { x: 0, y: 0 };
  }

  const participants = [...room.members.values()];
  const active = participants.filter((member) => !member.eliminated);
  let winner: MultiplayerPlayer | undefined;

  if (active.length === 1 && room.members.size > 1) {
    winner = active[0];
  } else {
    const bestScore = Math.max(0, ...participants.map((member) => member.roundScore));
    const leaders = participants.filter((member) => member.roundScore === bestScore);
    if (bestScore > 0 && leaders.length === 1) winner = leaders[0];
  }

  room.roundWinnerUserId = winner?.player.id ?? null;
  if (winner) winner.roundsWon += 1;
  if (room.currentRound >= room.settings.totalRounds) {
    room.phase = "finished";
    room.roundBreakEndsAt = null;
  }
}

function leaveRoom(io: Server, socket: Socket, voluntary: boolean) {
  const membership = memberships.get(socket.id);
  if (!membership) return;
  const room = rooms.get(membership.code);
  const member = room?.members.get(membership.userId);
  memberships.delete(socket.id);
  socket.leave(socketRoomName(membership.code));
  if (!room || !member || member.socketId !== socket.id) return;

  member.connection = voluntary ? "left" : "disconnected";
  if (voluntary && room.phase === "running") member.eliminated = true;
  member.socketId = null;
  member.player.velocity = { x: 0, y: 0 };
  for (const [projectileId, projectile] of room.game.projectiles) {
    if (projectile.ownerId === member.player.id) room.game.projectiles.delete(projectileId);
  }
  if (room.hostUserId === membership.userId) chooseNewHost(room);
  emitRoom(io, room);
  if (voluntary) socket.emit("room_left", { code: room.code });
}

function closeRoom(io: Server, socket: Socket) {
  const membership = memberForSocket(socket);
  if (!membership) return;
  const { room, member } = membership;
  if (room.hostUserId !== member.player.id) {
    sendError(socket, "Only the room host can close this room.");
    return;
  }
  if (room.phase !== "lobby" && room.phase !== "finished") {
    sendError(socket, "A room can only be closed from the lobby or after the match ends.");
    return;
  }

  io.to(room.socketRoom).emit("room_closed", { message: "The host closed this room." });
  for (const roomMember of room.members.values()) {
    if (!roomMember.socketId) continue;
    memberships.delete(roomMember.socketId);
    const connectedSocket = io.sockets.sockets.get(roomMember.socketId);
    connectedSocket?.leave(room.socketRoom);
  }
  rooms.delete(room.code);
  deleteRoomSnapshot(room.code);
}

function shootAtPlayers(room: MultiplayerRoom, member: MultiplayerPlayer, target: Vector) {
  const { player } = member;
  const now = Date.now();
  if (room.phase !== "running" || member.eliminated || member.connection !== "connected") return;
  if (!Number.isFinite(target.x) || !Number.isFinite(target.y)) return;
  if (now - player.lastShot < PLAYER_FIRE_COOLDOWN) return;

  const length = Math.hypot(target.x, target.y);
  if (length < 0.01 || length > 1.01) return;
  const direction = { x: target.x / length, y: target.y / length };
  const projectile: Projectile = {
    id: `mp-${randomBytes(8).toString("hex")}`,
    ownerId: player.id,
    position: { ...player.position },
    velocity: { x: direction.x * PLAYER_PROJECTILE_SPEED, y: direction.y * PLAYER_PROJECTILE_SPEED },
    damage: PLAYER_PROJECTILE_DAMAGE,
    radius: 6,
    life: 1.5,
    color: player.color,
  };
  room.game.projectiles.set(projectile.id, projectile);
  player.lastShot = now;
}

function hitObstacle(room: MultiplayerRoom, position: Vector) {
  return room.game.obstacles.some((obstacle) =>
    position.x >= obstacle.x - 6 && position.x <= obstacle.x + obstacle.width + 6 &&
    position.y >= obstacle.y - 6 && position.y <= obstacle.y + obstacle.height + 6,
  );
}

function updateCombat(io: Server, room: MultiplayerRoom, delta: number) {
  for (const member of room.members.values()) {
    const player = member.player;
    if (member.connection !== "connected" || member.eliminated) continue;
    player.position.x = Math.max(20, Math.min(GAME_WIDTH - 20, player.position.x + player.velocity.x * 260 * delta));
    player.position.y = Math.max(20, Math.min(GAME_HEIGHT - 20, player.position.y + player.velocity.y * 260 * delta));
  }

  for (const [projectileId, projectile] of room.game.projectiles) {
    projectile.position.x += projectile.velocity.x * delta;
    projectile.position.y += projectile.velocity.y * delta;
    projectile.life -= delta;
    if (projectile.life <= 0 || projectile.position.x < 0 || projectile.position.x > GAME_WIDTH ||
      projectile.position.y < 0 || projectile.position.y > GAME_HEIGHT || hitObstacle(room, projectile.position)) {
      room.game.projectiles.delete(projectileId);
      continue;
    }

    for (const target of room.members.values()) {
      if (target.player.id === projectile.ownerId || target.connection !== "connected" || target.eliminated) continue;
      if (distance(projectile.position, target.player.position) > projectile.radius + 18) continue;

      const damagePerHit = Math.ceil(PLAYER_MAX_HEALTH / room.settings.hitsToEliminate);
      target.player.health = Math.max(0, target.player.health - damagePerHit);
      if (target.player.health === 0) {
        target.eliminated = true;
        target.player.deaths += 1;
        target.player.velocity = { x: 0, y: 0 };
        const attacker = room.members.get(projectile.ownerId);
        if (attacker) {
          attacker.eliminations += 1;
          attacker.player.kills += 1;
          attacker.player.score += 200;
          attacker.roundScore += 1;
        }
      }

      io.to(room.socketRoom).emit("player_hit", {
        targetUserId: target.player.id,
        shooterUserId: projectile.ownerId,
        health: target.player.health,
        eliminated: target.eliminated,
      });
      room.game.projectiles.delete(projectileId);
      break;
    }
  }

  const active = [...room.members.values()].filter((member) => !member.eliminated);
  if (room.members.size > 1 && active.length <= 1) finishRound(room, Date.now());
}

export async function setupMultiplayerServer(
  io: Server,
  store: MultiplayerRoomStore = postgresMultiplayerRoomStore,
): Promise<() => Promise<void>> {
  roomStore = store;
  const savedRooms = await roomStore.loadAll();
  for (const saved of savedRooms) {
    const room = restoreRoomFromStorage(saved.code, saved.state);
    const expired = Date.now() - room.lastActiveAt > EMPTY_ROOM_TTL_MS;
    if (expired) {
      await roomStore.delete(room.code);
      continue;
    }
    rooms.set(room.code, room);
    lastPersistedAt.set(room.code, saved.updatedAt.getTime());
  }

  io.on("connection", (socket: Socket) => {
    socket.on("room_create", () => {
      if (memberships.has(socket.id)) {
        sendError(socket, "Leave your current room before creating another one.");
        return;
      }
      const code = newRoomCode();
      const room = createMultiplayerRoom(code, String(socket.data.userId));
      rooms.set(code, room);
      enterRoom(io, socket, room);
    });

    socket.on("room_join", (payload: { code?: string }) => {
      const code = typeof payload?.code === "string" ? payload.code.trim().toUpperCase() : "";
      const room = rooms.get(code);
      if (!room) {
        sendError(socket, "Room code not found. Check the code and try again.");
        return;
      }
      enterRoom(io, socket, room);
    });

    socket.on("room_configure", (payload: { totalRounds?: number; durationSeconds?: number; hitsToEliminate?: number }) => {
      const membership = memberForSocket(socket);
      if (!membership) return;
      const { room, member } = membership;
      if (room.hostUserId !== member.player.id) {
        sendError(socket, "Only the room host can change settings.");
        return;
      }
      if (room.phase !== "lobby" && room.phase !== "finished") {
        sendError(socket, "Settings cannot be changed while a match is underway.");
        return;
      }
      const { totalRounds, durationSeconds, hitsToEliminate } = payload ?? {};
      if (totalRounds !== undefined && (!Number.isInteger(totalRounds) || totalRounds < 1 || totalRounds > MAX_ROUNDS)) {
        sendError(socket, `Choose between 1 and ${MAX_ROUNDS} rounds.`);
        return;
      }
      if (durationSeconds !== undefined && ![60, 100, 120].includes(durationSeconds)) {
        sendError(socket, "Round duration must be 60, 100, or 120 seconds.");
        return;
      }
      if (hitsToEliminate !== undefined && (!Number.isInteger(hitsToEliminate) || hitsToEliminate < 1 || hitsToEliminate > 5)) {
        sendError(socket, "Choose between 1 and 5 hits to eliminate a player.");
        return;
      }
      room.settings = {
        totalRounds: totalRounds ?? room.settings.totalRounds,
        durationSeconds: durationSeconds ?? room.settings.durationSeconds,
        hitsToEliminate: hitsToEliminate ?? room.settings.hitsToEliminate,
      };
      emitRoom(io, room);
    });

    socket.on("room_start", () => {
      const membership = memberForSocket(socket);
      if (!membership) return;
      const { room, member } = membership;
      if (room.hostUserId !== member.player.id) {
        sendError(socket, "Only the room host can start the match.");
        return;
      }
      if (room.phase !== "lobby" && room.phase !== "finished") {
        sendError(socket, "The match is already in progress.");
        return;
      }
      if (connectedMembers(room).length < 2) {
        sendError(socket, "At least two connected players are needed to start.");
        return;
      }
      startCountdown(room);
      emitRoom(io, room);
    });

    socket.on("room_return_lobby", () => {
      const membership = memberForSocket(socket);
      if (!membership) return;
      const { room, member } = membership;
      if (room.hostUserId !== member.player.id || room.phase !== "finished") {
        sendError(socket, "Only the host can return a finished match to the lobby.");
        return;
      }
      room.phase = "lobby";
      room.currentRound = 0;
      room.countdownEndsAt = null;
      room.endsAt = null;
      room.roundBreakEndsAt = null;
      emitRoom(io, room);
    });

    socket.on("room_leave", () => leaveRoom(io, socket, true));
  socket.on("room_close", () => closeRoom(io, socket));

    socket.on("move", (input: Vector) => {
      const membership = memberForSocket(socket);
      if (!membership || membership.room.phase !== "running" || membership.member.eliminated) return;
      if (!Number.isFinite(input?.x) || !Number.isFinite(input?.y)) return;
      const length = Math.hypot(input.x, input.y);
      const scale = length > 1 ? 1 / length : 1;
      membership.member.player.velocity = { x: input.x * scale, y: input.y * scale };
    });

    socket.on("shoot", (input: Vector) => {
      const membership = memberForSocket(socket);
      if (membership) shootAtPlayers(membership.room, membership.member, input);
    });

    socket.on("disconnect", () => leaveRoom(io, socket, false));
  });

  let previous = Date.now();
  const gameLoop = setInterval(() => {
    const now = Date.now();
    const delta = Math.min((now - previous) / 1000, 0.05);
    previous = now;

    for (const [code, room] of rooms) {
      if (connectedMembers(room).length === 0 && now - room.lastActiveAt > EMPTY_ROOM_TTL_MS) {
        io.to(room.socketRoom).emit("room_error", { message: "This room expired because it was inactive." });
        rooms.delete(code);
        deleteRoomSnapshot(code);
        continue;
      }

      if (room.phase === "countdown" && room.countdownEndsAt !== null && now >= room.countdownEndsAt) {
        startRound(room, now);
      } else if (room.phase === "running") {
        updateCombat(io, room, delta);
        if (room.phase === "running" && room.endsAt !== null && now >= room.endsAt) finishRound(room, now);
      } else if (room.phase === "round-end" && room.roundBreakEndsAt !== null && now >= room.roundBreakEndsAt) {
        room.currentRound += 1;
        startRound(room, now);
      }

      if (room.phase !== "lobby") emitRoom(io, room);
    }
  }, 1000 / 20);

  return async () => {
    clearInterval(gameLoop);
    await flushRoomSnapshots();
    rooms.clear();
    memberships.clear();
    lastPersistedAt.clear();
    persistenceQueues.clear();
  };
}