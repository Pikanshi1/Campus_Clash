import {
  COLORS,
  GAME_HEIGHT,
  GAME_WIDTH,
  MATCH_DURATION,
  MAX_ENEMIES,
  PLAYER_MAX_HEALTH,
  RESPAWN_TIME,
  STARTING_ENEMIES,
  WAVE_INTERVAL,
} from "./constants";

import {
  Enemy,
  EnemyType,
  GameRoom,
  Player,
} from "./types";

let enemyCounter = 0;

export function createGameRoom(
  id: string
): GameRoom {
  const now = Date.now();

  const room: GameRoom = {
    id,
    status: "waiting",
    players: new Map(),
    enemies: new Map(),
    projectiles: new Map(),
    pickups: new Map(),
    obstacles: [
      {
        x: 250,
        y: 180,
        width: 180,
        height: 40,
      },
      {
        x: 750,
        y: 180,
        width: 180,
        height: 40,
      },
      {
        x: 250,
        y: 480,
        width: 180,
        height: 40,
      },
      {
        x: 750,
        y: 480,
        width: 180,
        height: 40,
      },
      {
        x: 555,
        y: 300,
        width: 90,
        height: 100,
      },
    ],
    startedAt: now,
    endsAt: now + MATCH_DURATION * 1000,
    wave: 1,
    nextWaveAt:
      now + WAVE_INTERVAL,
  };

  for (
    let i = 0;
    i < STARTING_ENEMIES;
    i++
  ) {
    spawnEnemy(room);
  }

  return room;
}

export function resetGameRoom(room: GameRoom) {
  const now = Date.now();

  room.status = "waiting";
  room.players.clear();
  room.enemies.clear();
  room.projectiles.clear();
  room.pickups.clear();
  room.startedAt = now;
  room.endsAt = now + MATCH_DURATION * 1000;
  room.wave = 1;
  room.nextWaveAt = now + WAVE_INTERVAL;

  for (let i = 0; i < STARTING_ENEMIES; i++) {
    spawnEnemy(room);
  }
}

export function createPlayer(
  id: string,
  username: string,
  index: number
): Player {
  return {
    id,
    username,
    position: {
      x:
        100 +
        Math.random() *
          (GAME_WIDTH - 200),

      y:
        100 +
        Math.random() *
          (GAME_HEIGHT - 200),
    },
    velocity: {
      x: 0,
      y: 0,
    },
    health:
      PLAYER_MAX_HEALTH,
    maxHealth:
      PLAYER_MAX_HEALTH,
    score: 0,
    kills: 0,
    deaths: 0,
    streak: 0,
    color:
      COLORS[
        index % COLORS.length
      ],
    lastShot: 0,
    respawnAt: null,
    shieldUntil: 0,
  };
}

export function spawnEnemy(
  room: GameRoom
) {
  if (
    room.enemies.size >=
    MAX_ENEMIES
  ) {
    return;
  }

  const types: EnemyType[] = [
    "chaser",
    "chaser",
    "tank",
    "shooter",
  ];

  const type =
    types[
      Math.floor(
        Math.random() *
          types.length
      )
    ];

  const difficulty =
    1 +
    room.wave *
      0.08;

  let health = 60;
  let speed = 90;
  let damage = 12;

  if (type === "tank") {
    health = 180;
    speed = 55;
    damage = 25;
  }

  if (type === "shooter") {
    health = 80;
    speed = 70;
    damage = 15;
  }

  const enemy: Enemy = {
    id: `enemy-${++enemyCounter}`,
    type,
    position: {
      x:
        Math.random() *
          GAME_WIDTH,

      y:
        Math.random() *
          GAME_HEIGHT,
    },
    velocity: {
      x: 0,
      y: 0,
    },
    health:
      health * difficulty,
    maxHealth:
      health * difficulty,
    speed:
      speed * difficulty,
    damage:
      damage * difficulty,
    targetId: null,
    lastShot: 0,
  };

  room.enemies.set(
    enemy.id,
    enemy
  );
}