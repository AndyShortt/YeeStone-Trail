import type { GamePlaythrough } from "./types";

export interface SpendResult {
  money: number;
  vibeDelta: number; // going-broke penalty only; callers add their own purchase vibeDelta on top
  wentBrokeTriggered: boolean;
  eventLogAppend?: string;
}

/**
 * § 3.11 Going Broke (BALANCE-PATCH-2026-09-05, new). Call at every point `money` is
 * spent; the purchase that brings it to exactly $0 costs a one-time flat vibe hit.
 */
export function applySpend(prev: GamePlaythrough, cost: number): SpendResult {
  const money = Math.max(0, prev.money - cost);
  if (money > 0 || prev.wentBrokeTriggered) {
    return { money, vibeDelta: 0, wentBrokeTriggered: prev.wentBrokeTriggered };
  }
  const name = prev.displayName ?? prev.playerName ?? "You";
  return {
    money,
    vibeDelta: -15,
    wentBrokeTriggered: true,
    eventLogAppend: `Down to your last dollar. ${name}'s covering the rest of the trip on credit and everyone knows it.`,
  };
}
