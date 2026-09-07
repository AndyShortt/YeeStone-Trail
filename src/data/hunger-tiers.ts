import type { HungerTier } from "../game/types";

// BALANCE-PATCH-2026-09-05, new — § 3.10
export const hungerTiers: HungerTier[] = [
  { min: 75, label: "Full" },
  { min: 50, label: "Fine" },
  { min: 25, label: "Hungry" },
  { min: 0, label: "Starving" },
];
