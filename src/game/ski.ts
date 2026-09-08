import { pickRandomBroNames } from "../data/bro-names";
import type { GamePlaythrough } from "./types";

/** § 4.13 leaderboard: how many phantom rivals fill out the board each ski day. */
const LEADERBOARD_RIVAL_COUNT = 3;

export type Route = "green" | "blue" | "black";
export type SkiStyle = NonNullable<GamePlaythrough["skiStyle"]>;
export type InjurySeverity = "minor" | "moderate" | "severe";

export const RUN_DURATION_MS = 30_000;

export const ROUTE_CONFIG: Record<
  Route,
  { spawnMultiplier: number; speedMultiplier: number; injuryRisk: number; rewardMultiplier: number }
> = {
  green: { spawnMultiplier: 1.4, speedMultiplier: 1.0, injuryRisk: 0, rewardMultiplier: 1 },
  blue: { spawnMultiplier: 1.0, speedMultiplier: 1.12, injuryRisk: 1, rewardMultiplier: 1.5 },
  black: { spawnMultiplier: 0.7, speedMultiplier: 1.25, injuryRisk: 3, rewardMultiplier: 2 },
};

export const STYLE_CONFIG: Record<
  SkiStyle,
  { speedMultiplier: number; injuryRisk: number; rewardMultiplier: number }
> = {
  "safety-first": { speedMultiplier: 0.82, injuryRisk: -2, rewardMultiplier: 1 },
  balanced: { speedMultiplier: 1.0, injuryRisk: 0, rewardMultiplier: 1 },
  "full-send": { speedMultiplier: 1.22, injuryRisk: 4, rewardMultiplier: 1.5 },
};

/**
 * § 3.4 injury-risk formula. Unlike a hidden pass/fail dice roll, this feeds
 * mini-game DIFFICULTY (obstacle density/speed, see SkiRun.tsx) — whether the
 * player actually crashes is decided by real dodging, not this number. Only
 * the post-crash severity roll below still uses percentages directly.
 */
export function computeInjuryRiskPercent(playthrough: GamePlaythrough, route: Route): number {
  let risk = 2;
  risk += playthrough.skiStyle ? STYLE_CONFIG[playthrough.skiStyle].injuryRisk : 0;
  risk += ROUTE_CONFIG[route].injuryRisk;
  risk += playthrough.injury !== null ? 2 : 0;
  risk += !playthrough.thermalWearPurchased ? 1 : 0;
  risk += playthrough.uncWinBonusPending ? 1 : 0;
  risk += playthrough.hungerLevel <= 25 ? 3 : playthrough.hungerLevel <= 50 ? 1 : 0;
  return Math.min(15, Math.max(0, risk));
}

/** § 3.4 severity roll: 60% minor / 30% moderate / 10% severe. */
export function rollInjurySeverity(): InjurySeverity {
  const roll = Math.random();
  if (roll < 0.6) return "minor";
  if (roll < 0.9) return "moderate";
  return "severe";
}

const SEVERITY_RANK: Record<Exclude<InjurySeverity, "severe">, number> = { minor: 1, moderate: 2 };

/** § 3.4: "take the worse of the two severities (upgrade only, never downgrade)". */
export function upgradeSeverity(
  existing: Exclude<InjurySeverity, "severe"> | null,
  rolled: Exclude<InjurySeverity, "severe">,
): Exclude<InjurySeverity, "severe"> {
  if (!existing) return rolled;
  return SEVERITY_RANK[rolled] > SEVERITY_RANK[existing] ? rolled : existing;
}

export interface LeaderboardEntry {
  name: string;
  verticalFeet: number;
  isPlayer: boolean;
  crashed: boolean;
}

export type LeaderboardPlacement = "first" | "second" | "third" | "fourth";

export interface LeaderboardResult {
  entries: LeaderboardEntry[];
  placement: LeaderboardPlacement;
  vibeDelta: number;
}

/**
 * § 4.13 leaderboard: rank the player against a few randomly-named "other
 * skiers" pulled fresh from the fixed name pool (§ 3.2) each time — there's no
 * persistent party/roster to rank against anymore, so this samples
 * independently per call rather than reusing the same names across a trip.
 */
export function buildLeaderboard(
  playerName: string,
  playerVerticalFeet: number,
  playerCrashed: boolean,
  route: Route,
  skiStyle: SkiStyle,
): LeaderboardResult {
  const rivalNames = pickRandomBroNames(LEADERBOARD_RIVAL_COUNT);
  const broEntries: LeaderboardEntry[] = rivalNames.map((name) => ({
    name,
    verticalFeet: Math.floor(1400 + Math.random() * 2600),
    isPlayer: false,
    crashed: false,
  }));

  const playerEntry: LeaderboardEntry = {
    name: playerName,
    verticalFeet: playerVerticalFeet,
    isPlayer: true,
    crashed: playerCrashed,
  };

  const entries = [...broEntries, playerEntry].sort((a, b) => b.verticalFeet - a.verticalFeet);
  const playerIndex = entries.findIndex((e) => e.isPlayer);
  const PLACEMENT_BY_INDEX: LeaderboardPlacement[] = ["first", "second", "third", "fourth"];
  const placement = PLACEMENT_BY_INDEX[playerIndex];

  // § 5.3: crashing forfeits any leaderboard reward regardless of distance covered.
  // The route x style multiplier only ever scales the positive 1st/2nd-place
  // bonuses, never the flat last-place penalty (matches the doc's own example,
  // which never scales a penalty). 2nd place is a smaller reward than 1st (half
  // the base, same multiplier); 3rd is neutral; 4th (last) is unchanged.
  // § 18: base rewards bumped (10->12, 5->6) and the last-place penalty
  // softened (-5->-3), part of the game-wide "less penalty, easier reward" pass.
  const rewardMultiplier = ROUTE_CONFIG[route].rewardMultiplier * STYLE_CONFIG[skiStyle].rewardMultiplier;
  const vibeDelta = playerCrashed
    ? 0
    : placement === "first"
      ? Math.round(12 * rewardMultiplier)
      : placement === "second"
        ? Math.round(6 * rewardMultiplier)
        : placement === "fourth"
          ? -3
          : 0;

  return { entries, placement, vibeDelta };
}
