import type { GamePlaythrough } from "./types";

/** § 5.2: 3-lane dodge mini-game that now backs the `drive-progress` screen. */
export const NUM_LANES = 3;
export const DRIVE_HOURS = 3;

export type RentalLocation = NonNullable<GamePlaythrough["skiRentalLocation"]>;

/**
 * § 11/§ 12: the drive is two legs — Denver to Walter's/Costco, then
 * Costco to the cabin — each independently tunable now instead of a single
 * `runDurationMs` split at a fixed 1/3 checkpoint. Keystone is the shorter/
 * easier route, Frisco the longer/more complex one; `firstLegMs + secondLegMs`
 * also drives the 3 simulated in-game hours (hunger ticks), so Frisco's drive
 * both takes longer AND is denser with traffic.
 */
export const DRIVE_ROUTE_CONFIG: Record<
  RentalLocation,
  { firstLegMs: number; secondLegMs: number; startSpawnPerSec: number; endSpawnPerSec: number }
> = {
  keystone: { firstLegMs: 8_000, secondLegMs: 10_000, startSpawnPerSec: 1, endSpawnPerSec: 2 },
  frisco: { firstLegMs: 18_000, secondLegMs: 30_000, startSpawnPerSec: 1.5, endSpawnPerSec: 2.5 },
};

export function getDriveConfig(location: GamePlaythrough["skiRentalLocation"]) {
  return DRIVE_ROUTE_CONFIG[location === "frisco" ? "frisco" : "keystone"];
}

// § 11/§ 12: each leg gets its own themed addition on top of the shared pool
// — a cowboy on leg 1 (Denver -> Costco), an alien UFO on leg 2 (Costco -> cabin).
export const OBSTACLE_TYPES = ["car", "truck", "wreck"] as const;
export type DriveObstacleType = (typeof OBSTACLE_TYPES)[number] | "cowboy" | "alien-ufo";

export function obstaclePoolForLeg(leg: 1 | 2): DriveObstacleType[] {
  return leg === 1 ? [...OBSTACLE_TYPES, "cowboy"] : [...OBSTACLE_TYPES, "alien-ufo"];
}
