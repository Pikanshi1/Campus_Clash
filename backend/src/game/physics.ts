import {
  GAME_HEIGHT,
  GAME_WIDTH,
  PLAYER_RADIUS,
} from "./constants";

import {
  Obstacle,
  Vector,
} from "./types";

export function distance(
  a: Vector,
  b: Vector
) {
  return Math.hypot(
    a.x - b.x,
    a.y - b.y
  );
}

export function normalize(
  vector: Vector
): Vector {
  const length = Math.hypot(
    vector.x,
    vector.y
  );

  if (length === 0) {
    return {
      x: 0,
      y: 0,
    };
  }

  return {
    x: vector.x / length,
    y: vector.y / length,
  };
}

export function clampPlayer(
  position: Vector
) {
  position.x = Math.max(
    PLAYER_RADIUS,
    Math.min(
      GAME_WIDTH - PLAYER_RADIUS,
      position.x
    )
  );

  position.y = Math.max(
    PLAYER_RADIUS,
    Math.min(
      GAME_HEIGHT - PLAYER_RADIUS,
      position.y
    )
  );
}

export function circleIntersectsRect(
  circle: Vector,
  radius: number,
  rect: Obstacle
) {
  const closestX = Math.max(
    rect.x,
    Math.min(
      circle.x,
      rect.x + rect.width
    )
  );

  const closestY = Math.max(
    rect.y,
    Math.min(
      circle.y,
      rect.y + rect.height
    )
  );

  const dx =
    circle.x - closestX;

  const dy =
    circle.y - closestY;

  return (
    dx * dx +
      dy * dy <=
    radius * radius
  );
}