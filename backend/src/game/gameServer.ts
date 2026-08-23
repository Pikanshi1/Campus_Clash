import {
  Server,
  Socket,
} from "socket.io";

import {
  GAME_HEIGHT,
  GAME_WIDTH,
  PLAYER_SPEED,
  WAVE_INTERVAL,
  MATCH_DURATION,
} from "./constants";

import {
  createGameRoom,
  createPlayer,
  resetGameRoom,
  spawnEnemy,
} from "./gameState";

import {
  updateEnemyAI,
} from "./enemyAI";

import {
  updateProjectiles,
  updateRespawns,
  shoot,
} from "./combat";

import {
  GameRoom,
  Player,
} from "./types";

const rooms =
  new Map<string, GameRoom>();

const ROOM_ID =
  "main-arena";

export function setupGameServer(
  io: Server
) {
  let room =
    rooms.get(ROOM_ID);

  if (!room) {
    room =
      createGameRoom(
        ROOM_ID
      );

    rooms.set(
      ROOM_ID,
      room
    );
  }

  io.on(
    "connection",
    (socket: Socket) => {
      socket.on(
        "join_game",
        ({
          username,
        }: {
          username: string;
        }) => {
          const currentRoom =
            rooms.get(
              ROOM_ID
            );

          if (!currentRoom) {
            return;
          }

          if (currentRoom.status === "finished") {
            resetGameRoom(currentRoom);
          }

          const player =
            createPlayer(
              socket.id,
              username ||
                `Player-${socket.id.slice(
                  0,
                  5
                )}`,
              currentRoom.players.size
            );

          currentRoom.players.set(
            socket.id,
            player
          );

          socket.join(
            ROOM_ID
          );

          currentRoom.status =
            "running";

          if (
            currentRoom.players.size ===
            1
          ) {
            const now =
              Date.now();

            currentRoom.startedAt =
              now;

            currentRoom.endsAt =
              now +
              MATCH_DURATION *
                1000;
          }

          socket.emit(
            "game_joined",
            serializeRoom(
              currentRoom
            )
          );

          io.to(
            ROOM_ID
          ).emit(
            "game_state",
            serializeRoom(
              currentRoom
            )
          );
        }
      );

      socket.on(
        "move",
        ({
          x,
          y,
        }: {
          x: number;
          y: number;
        }) => {
          const currentRoom =
            rooms.get(
              ROOM_ID
            );

          if (!currentRoom) {
            return;
          }

          const player =
            currentRoom.players.get(
              socket.id
            );

          if (!player) {
            return;
          }

          if (
            player.health <= 0 ||
            player.respawnAt !== null
          ) {
            return;
          }

          const length =
            Math.hypot(
              x,
              y
            );

          if (
            length > 1
          ) {
            x /= length;
            y /= length;
          }

          player.velocity.x =
            x;

          player.velocity.y =
            y;
        }
      );

      socket.on(
        "shoot",
        ({
          x,
          y,
        }: {
          x: number;
          y: number;
        }) => {
          const currentRoom =
            rooms.get(
              ROOM_ID
            );

          if (!currentRoom) {
            return;
          }

          const player =
            currentRoom.players.get(
              socket.id
            );

          if (!player) {
            return;
          }

          shoot(
            currentRoom,
            player,
            {
              x,
              y,
            }
          );
        }
      );

      socket.on(
        "disconnect",
        () => {
          const currentRoom =
            rooms.get(
              ROOM_ID
            );

          if (!currentRoom) {
            return;
          }

          currentRoom.players.delete(
            socket.id
          );

          io.to(
            ROOM_ID
          ).emit(
            "game_state",
            serializeRoom(
              currentRoom
            )
          );
        }
      );
    }
  );

  let previous =
    Date.now();

  setInterval(
    () => {
      const now =
        Date.now();

      const delta =
        Math.min(
          (now - previous) /
            1000,
          0.05
        );

      previous = now;

      updateRoom(
        io,
        room!,
        delta,
        now
      );
    },
    1000 / 30
  );
}

function updateRoom(
  io: Server,
  room: GameRoom,
  delta: number,
  now: number
) {
  if (
    room.status !==
    "running"
  ) {
    return;
  }

  if (
    now >=
    room.endsAt
  ) {
    finishGame(
      io,
      room
    );

    return;
  }

  for (const player of room.players.values()) {
    if (
      player.health <= 0 ||
      player.respawnAt !== null
    ) {
      continue;
    }

    player.position.x +=
      player.velocity.x *
      PLAYER_SPEED *
      delta;

    player.position.y +=
      player.velocity.y *
      PLAYER_SPEED *
      delta;

    player.position.x =
      Math.max(
        20,
        Math.min(
          GAME_WIDTH - 20,
          player.position.x
        )
      );

    player.position.y =
      Math.max(
        20,
        Math.min(
          GAME_HEIGHT - 20,
          player.position.y
        )
      );
  }

  for (const enemy of room.enemies.values()) {
    updateEnemyAI(
      enemy,
      room.players,
      delta
    );

    enemy.position.x =
      Math.max(
        20,
        Math.min(
          GAME_WIDTH - 20,
          enemy.position.x
        )
      );

    enemy.position.y =
      Math.max(
        20,
        Math.min(
          GAME_HEIGHT - 20,
          enemy.position.y
        )
      );
  }

  updateProjectiles(
    room,
    delta
  );

  updateRespawns(
    room
  );

  if (
    now >=
    room.nextWaveAt
  ) {
    room.wave += 1;

    const amount =
      Math.min(
        3 +
          room.wave,
        8
      );

    for (
      let i = 0;
      i < amount;
      i++
    ) {
      spawnEnemy(room);
    }

    room.nextWaveAt =
      now +
      WAVE_INTERVAL;
  }

  io.to(
    room.id
  ).emit(
    "game_state",
    serializeRoom(room)
  );
}

function finishGame(
  io: Server,
  room: GameRoom
) {
  room.status =
    "finished";

  const players =
    [...room.players.values()]
      .sort(
        (a, b) =>
          b.score -
          a.score
      );

  io.to(
    room.id
  ).emit(
    "game_finished",
    {
      winner:
        players[0] ?? null,
      leaderboard:
        players,
    }
  );
}

function serializeRoom(
  room: GameRoom
) {
  return {
    id: room.id,
    status: room.status,
    wave: room.wave,
    endsAt: room.endsAt,

    players:
      [...room.players.values()],

    enemies:
      [...room.enemies.values()],

    projectiles:
      [...room.projectiles.values()],

    pickups:
      [...room.pickups.values()],

    obstacles:
      room.obstacles,
  };
}