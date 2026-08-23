import {
  PLAYER_FIRE_COOLDOWN,
  PLAYER_PROJECTILE_DAMAGE,
  PLAYER_PROJECTILE_SPEED,
  PROJECTILE_LIFETIME,
  RESPAWN_TIME,
  SCORE_ENEMY,
  SCORE_PLAYER,
} from "./constants";

import {
  distance,
  normalize,
} from "./physics";

import {
  GameRoom,
  Player,
  Projectile,
} from "./types";

let projectileCounter = 0;

export function shoot(
  room: GameRoom,
  player: Player,
  target: {
    x: number;
    y: number;
  }
) {
  const now = Date.now();

  if (
    now - player.lastShot <
    PLAYER_FIRE_COOLDOWN
  ) {
    return;
  }

  if (
    player.health <= 0 ||
    player.respawnAt !== null
  ) {
    return;
  }

  const direction = normalize({
    x:
      target.x -
      player.position.x,
    y:
      target.y -
      player.position.y,
  });

  const projectile: Projectile = {
    id: `projectile-${++projectileCounter}`,
    ownerId: player.id,
    position: {
      x: player.position.x,
      y: player.position.y,
    },
    velocity: {
      x:
        direction.x *
        PLAYER_PROJECTILE_SPEED,
      y:
        direction.y *
        PLAYER_PROJECTILE_SPEED,
    },
    damage:
      PLAYER_PROJECTILE_DAMAGE,
    radius: 6,
    life: PROJECTILE_LIFETIME,
    color: player.color,
  };

  room.projectiles.set(
    projectile.id,
    projectile
  );

  player.lastShot = now;
}

export function updateProjectiles(
  room: GameRoom,
  delta: number
) {
  for (const [
    projectileId,
    projectile,
  ] of room.projectiles) {
    projectile.position.x +=
      projectile.velocity.x *
      delta;

    projectile.position.y +=
      projectile.velocity.y *
      delta;

    projectile.life -= delta;

    if (
      projectile.life <= 0 ||
      projectile.position.x < 0 ||
      projectile.position.x > 1200 ||
      projectile.position.y < 0 ||
      projectile.position.y > 700
    ) {
      room.projectiles.delete(
        projectileId
      );

      continue;
    }

    if (
      hitEnemy(
        room,
        projectile
      )
    ) {
      room.projectiles.delete(
        projectileId
      );

      continue;
    }

    hitPlayer(
      room,
      projectile
    );
  }
}

function hitEnemy(
  room: GameRoom,
  projectile: Projectile
) {
  for (const enemy of room.enemies.values()) {
    const hitDistance =
      distance(
        projectile.position,
        enemy.position
      );

    if (
      hitDistance >
      projectile.radius + 20
    ) {
      continue;
    }

    enemy.health -=
      projectile.damage;

    if (enemy.health <= 0) {
      const owner =
        room.players.get(
          projectile.ownerId
        );

      if (owner) {
        owner.score +=
          SCORE_ENEMY;

        owner.kills += 1;

        owner.streak += 1;
      }

      room.enemies.delete(
        enemy.id
      );
    }

    return true;
  }

  return false;
}

function hitPlayer(
  room: GameRoom,
  projectile: Projectile
) {
  const shooter =
    room.players.get(
      projectile.ownerId
    );

  for (const player of room.players.values()) {
    if (
      player.id ===
      projectile.ownerId
    ) {
      continue;
    }

    if (
      player.health <= 0 ||
      player.respawnAt !== null
    ) {
      continue;
    }

    const hitDistance =
      distance(
        projectile.position,
        player.position
      );

    if (
      hitDistance >
      projectile.radius + 18
    ) {
      continue;
    }

    if (
      player.shieldUntil >
      Date.now()
    ) {
      return true;
    }

    player.health -=
      projectile.damage;

    if (player.health <= 0) {
      player.health = 0;

      player.deaths += 1;

      player.streak = 0;

      player.respawnAt =
        Date.now() +
        RESPAWN_TIME;

      if (shooter) {
        shooter.score +=
          SCORE_PLAYER;

        shooter.kills += 1;

        shooter.streak += 1;
      }
    }

    return true;
  }

  return false;
}

export function updateRespawns(
  room: GameRoom
) {
  const now = Date.now();

  for (const player of room.players.values()) {
    if (
      player.respawnAt === null
    ) {
      continue;
    }

    if (
      now <
      player.respawnAt
    ) {
      continue;
    }

    player.position = {
      x:
        100 +
        Math.random() * 1000,
      y:
        100 +
        Math.random() * 500,
    };

    player.health =
      player.maxHealth;

    player.respawnAt =
      null;
  }
}