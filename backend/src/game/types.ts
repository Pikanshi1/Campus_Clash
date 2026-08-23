export type GameStatus =
  | "waiting"
  | "running"
  | "finished";

export type EnemyType =
  | "chaser"
  | "tank"
  | "shooter";

export interface Vector {
  x: number;
  y: number;
}

export interface Player {
  id: string;
  username: string;
  position: Vector;
  velocity: Vector;
  health: number;
  maxHealth: number;
  score: number;
  kills: number;
  deaths: number;
  streak: number;
  color: string;
  lastShot: number;
  respawnAt: number | null;
  shieldUntil: number;
}

export interface Enemy {
  id: string;
  type: EnemyType;
  position: Vector;
  velocity: Vector;
  health: number;
  maxHealth: number;
  speed: number;
  damage: number;
  targetId: string | null;
  lastShot: number;
}

export interface Projectile {
  id: string;
  ownerId: string;
  position: Vector;
  velocity: Vector;
  damage: number;
  radius: number;
  life: number;
  color: string;
}

export interface Pickup {
  id: string;
  type: "energy" | "shield" | "health";
  position: Vector;
  radius: number;
  value: number;
}

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GameRoom {
  id: string;
  status: GameStatus;
  players: Map<string, Player>;
  enemies: Map<string, Enemy>;
  projectiles: Map<string, Projectile>;
  pickups: Map<string, Pickup>;
  obstacles: Obstacle[];
  startedAt: number;
  endsAt: number;
  wave: number;
  nextWaveAt: number;
}