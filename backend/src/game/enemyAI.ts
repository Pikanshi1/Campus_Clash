import {
  Enemy,
  Player,
} from "./types";

import {
  distance,
  normalize,
} from "./physics";

export function findNearestPlayer(
  enemy: Enemy,
  players: Map<string, Player>
) {
  let nearest: Player | null = null;

  let nearestDistance =
    Infinity;

  for (const player of players.values()) {
    if (
      player.health <= 0 ||
      player.respawnAt !== null
    ) {
      continue;
    }

    const currentDistance =
      distance(
        enemy.position,
        player.position
      );

    if (
      currentDistance <
      nearestDistance
    ) {
      nearest = player;
      nearestDistance =
        currentDistance;
    }
  }

  return nearest;
}

export function updateEnemyAI(
  enemy: Enemy,
  players: Map<string, Player>,
  delta: number
) {
  const target =
    findNearestPlayer(
      enemy,
      players
    );

  if (!target) {
    enemy.velocity.x = 0;
    enemy.velocity.y = 0;
    enemy.targetId = null;
    return;
  }

  enemy.targetId =
    target.id;

  const direction =
    normalize({
      x:
        target.position.x -
        enemy.position.x,

      y:
        target.position.y -
        enemy.position.y,
    });

  if (enemy.type === "shooter") {
    const targetDistance =
      distance(
        enemy.position,
        target.position
      );

    if (targetDistance > 280) {
      enemy.velocity.x =
        direction.x *
        enemy.speed;

      enemy.velocity.y =
        direction.y *
        enemy.speed;
    } else if (
      targetDistance < 180
    ) {
      enemy.velocity.x =
        -direction.x *
        enemy.speed;

      enemy.velocity.y =
        -direction.y *
        enemy.speed;
    } else {
      enemy.velocity.x = 0;
      enemy.velocity.y = 0;
    }
  } else {
    enemy.velocity.x =
      direction.x *
      enemy.speed;

    enemy.velocity.y =
      direction.y *
      enemy.speed;
  }

  enemy.position.x +=
    enemy.velocity.x *
    delta;

  enemy.position.y +=
    enemy.velocity.y *
    delta;
}