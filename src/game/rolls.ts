import { broEvents } from "../data/bro-events";
import { pickRandomBroName } from "../data/bro-names";
import type { BroEventLine } from "./types";

export function rollFlightDelay(flightTime: "early" | "late" | undefined): boolean {
  const base = 0.18;
  const delayChance = flightTime === "early" ? base - 0.05 : base;
  return Math.random() < delayChance;
}

export interface BroEventResult {
  message: string;
  vibeDelta: number;
}

export function rollBroEvent(options: { skiDay?: boolean } = {}): BroEventResult | null {
  if (Math.random() >= 0.15) return null;

  const name = pickRandomBroName();
  const isGood = Math.random() < 0.5;
  const pool = isGood ? broEvents.good : broEvents.bad;
  const eligible = options.skiDay ? pool : pool.filter((line) => !line.skiDayOnly);
  const line: BroEventLine = eligible[Math.floor(Math.random() * eligible.length)];

  return {
    message: line.template.replace("{name}", name),
    vibeDelta: line.vibeDelta,
  };
}

export type DoctorOutcome = "full-recovery" | "partial-recovery" | "no-change";

/** § 3.5 Doctor / First-Aid Mechanic. BALANCE-PATCH-2026-09-05: success rate was 50%. */
export function rollDoctorAttempt(): DoctorOutcome {
  if (Math.random() >= 0.65) return "no-change";
  return Math.random() < 0.7 ? "full-recovery" : "partial-recovery";
}
