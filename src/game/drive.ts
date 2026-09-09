import type { GamePlaythrough } from "./types";

/** § 5.2: 3-lane dodge mini-game that now backs the `drive-progress` screen. */
export const NUM_LANES = 3;
export const DRIVE_HOURS = 3;

export type RentalLocation = NonNullable<GamePlaythrough["skiRentalLocation"]>;

/**
 * § 11/§ 12: the drive is two legs — Denver to Walter's/Costco, then
 * Costco to the cabin — each independently tunable now instead of a single
 * `runDurationMs` split at a fixed 1/3 checkpoint. `firstLegMs + secondLegMs`
 * also drives the 3 simulated in-game hours (hunger ticks).
 *
 * § 0 item 23: both routes now take the same total drive time (Keystone's
 * already-tuned, shorter 18s split, reused for Frisco too) — Frisco used to
 * run nearly 3x longer (48s vs 18s) purely because it's the farther real-world
 * drive, but that meant the "free rental" choice cost the player a much
 * longer mini-game for no gameplay reason. Frisco keeps a slightly denser
 * spawn rate as its own distinguishing trait instead — same length, a bit
 * livelier.
 */
export const DRIVE_ROUTE_CONFIG: Record<
  RentalLocation,
  { firstLegMs: number; secondLegMs: number; startSpawnPerSec: number; endSpawnPerSec: number }
> = {
  keystone: { firstLegMs: 8_000, secondLegMs: 10_000, startSpawnPerSec: 1, endSpawnPerSec: 2 },
  frisco: { firstLegMs: 8_000, secondLegMs: 10_000, startSpawnPerSec: 1.5, endSpawnPerSec: 2.5 },
};

export function getDriveConfig(location: GamePlaythrough["skiRentalLocation"]) {
  return DRIVE_ROUTE_CONFIG[location === "frisco" ? "frisco" : "keystone"];
}

// § 11/§ 12: each leg gets its own themed addition on top of the shared pool
// — a cowboy on leg 1 (Denver -> Costco), an alien UFO on leg 2 (Costco -> cabin).
// § 0 item 23: wagon/train added to the shared pool itself (not leg-specific)
// purely for more variety on both legs — a covered wagon leans into the
// game's own Oregon Trail homage, a train is the same "why is this on the
// highway" joke the alien UFO already is.
export const OBSTACLE_TYPES = ["car", "truck", "wreck", "wagon", "train"] as const;
export type DriveObstacleType = (typeof OBSTACLE_TYPES)[number] | "cowboy" | "alien-ufo";

export function obstaclePoolForLeg(leg: 1 | 2): DriveObstacleType[] {
  return leg === 1 ? [...OBSTACLE_TYPES, "cowboy"] : [...OBSTACLE_TYPES, "alien-ufo"];
}
