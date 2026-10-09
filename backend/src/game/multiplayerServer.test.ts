import assert from "node:assert/strict";
import http from "node:http";
import { test } from "node:test";
import { Prisma } from "@prisma/client";
import { Server as SocketServer } from "socket.io";
import { io as createClient, Socket as ClientSocket } from "socket.io-client";
import { MultiplayerRoomStore } from "./multiplayerRoomStore.js";
import { setupMultiplayerServer } from "./multiplayerServer.js";

interface RoomState {
  code: string;
  hostUserId: string;
  phase: string;
  finalWinnerUserId: string | null;
  settings: { totalRounds: number; durationSeconds: number; hitsToEliminate: number };
  players: Array<{
    id: string;
    username: string;
    status: string;
    position: { x: number; y: number };
  }>;
}

class MemoryRoomStore implements MultiplayerRoomStore {
  private readonly records = new Map<string, { state: Prisma.JsonValue; updatedAt: Date }>();

  async loadAll() {
    return [...this.records].map(([code, record]) => ({ code, ...record }));
  }

  async save(code: string, state: Prisma.InputJsonValue) {
    this.records.set(code, {
      state: JSON.parse(JSON.stringify(state)) as Prisma.JsonValue,
      updatedAt: new Date(),
    });
  }

  async delete(code: string) {
    this.records.delete(code);
  }
}

async function startHarness(store: MultiplayerRoomStore) {
  const httpServer = http.createServer();
  const ioServer = new SocketServer(httpServer, { cors: { origin: "*" } });
  ioServer.use((socket, next) => {
    socket.data.userId = String(socket.handshake.auth.userId);
    socket.data.username = String(socket.handshake.auth.username);
    next();
  });

  const stopGame = await setupMultiplayerServer(ioServer, store);
  await new Promise<void>((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
  const address = httpServer.address();
  assert(address && typeof address !== "string");
  const clients = new Set<ClientSocket>();

  return {
    connect(userId: string, username: string) {
      const client = createClient(`http://127.0.0.1:${address.port}`, {
        auth: { userId, username },
        transports: ["websocket"],
        reconnection: false,
      });
      clients.add(client);
      return new Promise<ClientSocket>((resolve, reject) => {
        client.once("connect", () => resolve(client));
        client.once("connect_error", reject);
      });
    },
    async close() {
      for (const client of clients) client.disconnect();
      await new Promise<void>((resolve) => ioServer.close(() => resolve()));
      await stopGame();
    },
  };
}

function nextRoomState(
  client: ClientSocket,
  predicate: (state: RoomState) => boolean,
  timeoutMs = 5000,
) {
  return new Promise<RoomState>((resolve, reject) => {
    const timeout = setTimeout(() => {
      client.off("room_state", listener);
      reject(new Error("Timed out waiting for room state"));
    }, timeoutMs);
    const listener = (state: RoomState) => {
      if (!predicate(state)) return;
      clearTimeout(timeout);
      client.off("room_state", listener);
      resolve(state);
    };
    client.on("room_state", listener);
  });
}

function nextRoomError(client: ClientSocket) {
  return new Promise<{ message: string }>((resolve, reject) => {
    const timeout = setTimeout(() => {
      client.off("room_error", listener);
      reject(new Error("Timed out waiting for room error"));
    }, 5000);
    const listener = (error: { message: string }) => {
      clearTimeout(timeout);
      client.off("room_error", listener);
      resolve(error);
    };
    client.on("room_error", listener);
  });
}

test("multiplayer rooms are isolated and restored after server restart", { timeout: 30_000 }, async () => {
  const store = new MemoryRoomStore();
  const firstServer = await startHarness(store);
  let secondServer: Awaited<ReturnType<typeof startHarness>> | undefined;

  try {
    const host = await firstServer.connect("host-one", "Host One");
    const firstRoomCreated = nextRoomState(host, (state) => state.players.length === 1);
    host.emit("room_create");
    const firstRoom = await firstRoomCreated;

    const guest = await firstServer.connect("guest-one", "Guest One");
    const invalidCode = nextRoomError(guest);
    guest.emit("room_join", { code: "NOTREAL" });
    assert.match((await invalidCode).message, /not found/i);

    const firstRoomJoined = nextRoomState(host, (state) => state.players.length === 2);
    guest.emit("room_join", { code: firstRoom.code });
    const joinedState = await firstRoomJoined;
    assert.equal(joinedState.players.length, 2);

    const deniedSettings = nextRoomError(guest);
    guest.emit("room_configure", { totalRounds: 9 });
    assert.match((await deniedSettings).message, /only the room host/i);

    const configured = nextRoomState(host, (state) =>
      state.settings.totalRounds === 4 &&
      state.settings.durationSeconds === 120 &&
      state.settings.hitsToEliminate === 2,
    );
    host.emit("room_configure", {
      totalRounds: 4,
      durationSeconds: 120,
      hitsToEliminate: 2,
    });
    await configured;

    const otherHost = await firstServer.connect("host-two", "Host Two");
    const secondRoomCreated = nextRoomState(otherHost, (state) => state.players.length === 1);
    otherHost.emit("room_create");
    const secondRoom = await secondRoomCreated;
    assert.notEqual(firstRoom.code, secondRoom.code);
    assert.equal(joinedState.players.some((player) => player.id === "host-two"), false);

    await firstServer.close();
    secondServer = await startHarness(store);

    const restoredHost = await secondServer.connect("host-one", "Host One");
    const restoredRoomWait = nextRoomState(restoredHost, (state) =>
      state.code === firstRoom.code && state.players.length === 2,
    );
    restoredHost.emit("room_join", { code: firstRoom.code });
    const restoredRoom = await restoredRoomWait;
    assert.equal(restoredRoom.hostUserId, "host-one");
    assert.deepEqual(restoredRoom.settings, {
      totalRounds: 4,
      durationSeconds: 120,
      hitsToEliminate: 2,
    });
    assert.equal(restoredRoom.players.find((player) => player.id === "guest-one")?.status, "disconnected");

    const restoredOtherHost = await secondServer.connect("host-two", "Host Two");
    const restoredOtherRoomWait = nextRoomState(restoredOtherHost, (state) => state.code === secondRoom.code);
    restoredOtherHost.emit("room_join", { code: secondRoom.code });
    const restoredOtherRoom = await restoredOtherRoomWait;
    assert.equal(restoredOtherRoom.players.length, 1);
    assert.equal(restoredOtherRoom.players[0].id, "host-two");
  } finally {
    if (secondServer) await secondServer.close();
    else await firstServer.close();
  }
});

test("multiplayer combat awards eliminations and final round results server-side", { timeout: 30_000 }, async () => {
  const store = new MemoryRoomStore();
  const server = await startHarness(store);
  let host: ClientSocket | undefined;
  let guest: ClientSocket | undefined;
  let movementTimer: ReturnType<typeof setInterval> | undefined;
  let firingTimer: ReturnType<typeof setInterval> | undefined;

  try {
    host = await server.connect("combat-host", "Combat Host");
    guest = await server.connect("combat-guest", "Combat Guest");
    let latestState: RoomState | undefined;
    host.on("room_state", (state: RoomState) => { latestState = state; });

    const created = nextRoomState(host, (state) => state.players.length === 1);
    host.emit("room_create");
    const room = await created;
    const joined = nextRoomState(host, (state) => state.players.length === 2);
    guest.emit("room_join", { code: room.code });
    await joined;

    const configured = nextRoomState(host, (state) =>
      state.settings.totalRounds === 1 && state.settings.hitsToEliminate === 1,
    );
    host.emit("room_configure", { totalRounds: 1, hitsToEliminate: 1 });
    await configured;

    const countdown = nextRoomState(host, (state) => state.phase === "countdown");
    host.emit("room_start");
    await countdown;
    await nextRoomState(host, (state) => state.phase === "running", 15_000);

    const targets = new Map([
      ["combat-host", { x: 200, y: 100 }],
      ["combat-guest", { x: 420, y: 100 }],
    ]);
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Players did not reach test positions")), 8000);
      movementTimer = setInterval(() => {
        if (!latestState) return;
        let arrived = true;
        for (const [userId, target] of targets) {
          const player = latestState.players.find((candidate) => candidate.id === userId);
          if (!player) {
            arrived = false;
            continue;
          }
          const dx = target.x - player.position.x;
          const dy = target.y - player.position.y;
          const length = Math.hypot(dx, dy);
          if (length <= 18) {
            (userId === "combat-host" ? host : guest)?.emit("move", { x: 0, y: 0 });
          } else {
            arrived = false;
            (userId === "combat-host" ? host : guest)?.emit("move", {
              x: dx / length,
              y: dy / length,
            });
          }
        }
        if (!arrived) return;
        clearTimeout(timeout);
        clearInterval(movementTimer);
        movementTimer = undefined;
        resolve();
      }, 60);
    });

    firingTimer = setInterval(() => {
      if (!latestState) return;
      const attacker = latestState.players.find((player) => player.id === "combat-host");
      const target = latestState.players.find((player) => player.id === "combat-guest");
      if (!attacker || !target) return;
      const dx = target.position.x - attacker.position.x;
      const dy = target.position.y - attacker.position.y;
      const length = Math.hypot(dx, dy) || 1;
      host?.emit("shoot", { x: dx / length, y: dy / length });
    }, 220);

    const finalState = await nextRoomState(host, (state) => state.phase === "finished");
    clearInterval(firingTimer);
    firingTimer = undefined;
    assert.equal(finalState.finalWinnerUserId, "combat-host");
    const attackerPersonal = await new Promise<{
      eliminations: number;
      roundsWon: number;
      score: number;
    }>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Personal result was not emitted")), 3000);
      host?.on("room_personal", function onPersonal(stats) {
        if (stats.userId !== "combat-host" || stats.eliminations !== 1) return;
        clearTimeout(timeout);
        host?.off("room_personal", onPersonal);
        resolve(stats);
      });
    });
    assert.equal(attackerPersonal.eliminations, 1);
    assert.equal(attackerPersonal.roundsWon, 1);
    assert.equal(attackerPersonal.score, 200);
  } finally {
    if (movementTimer) clearInterval(movementTimer);
    if (firingTimer) clearInterval(firingTimer);
    host?.disconnect();
    guest?.disconnect();
    await server.close();
  }
});