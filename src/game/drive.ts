import type { GamePlaythrough } from "./types";

/** § 5.2: 3-lane dodge mini-game that now backs the `drive-progress` screen. */
export const NUM_LANES = 3;
export const DRIVE_HOURS = 3;

export type RentalLocation = NonNullable<GamePlaythrough["skiRentalLocation"]>;

/**
 * § 5.2's already-specified (previously unimplemented) duration/spawn-rate
 * split: Keystone is the shorter/easier route, Frisco the longer/more
 * complex one. `runDurationMs` also drives the 3 simulated in-game hours
 * (hunger ticks + the Walter's-stop checkpoint), so Frisco's drive both
 * takes longer AND is denser with traffic.
 */
export const DRIVE_ROUTE_CONFIG: Record<
  RentalLocation,
  { runDurationMs: number; startSpawnPerSec: number; endSpawnPerSec: number }
> = {
  keystone: { runDurationMs: 30_000, startSpawnPerSec: 1, endSpawnPerSec: 2 },
  frisco: { runDurationMs: 60_000, startSpawnPerSec: 1.5, endSpawnPerSec: 2.5 },
};

export function getDriveConfig(location: GamePlaythrough["skiRentalLocation"]) {
  return DRIVE_ROUTE_CONFIG[location === "frisco" ? "frisco" : "keystone"];
}

export const OBSTACLE_TYPES = ["car", "truck", "wreck"] as const;
export type DriveObstacleType = (typeof OBSTACLE_TYPES)[number];
