import type { EndingTier } from "../game/types";

// § 12: these `line`s are now only a safety-net fallback for a tier with no
// matching entry in `data/ending-taglines.ts` (shouldn't happen in practice —
// every tier has coverage there) — kept upbeat for the same reason.
export const endingTiers: EndingTier[] = [
  { min: 90, name: "Legendary Trip", line: "The boys will be talking about this for years." },
  { min: 70, name: "Good Trip", line: "Worth every penny, no regrets." },
  { min: 50, name: "Mediocre Trip", line: "It was fine. We had fun, and that's what counts." },
  { min: 30, name: "Bad Trip", line: "Got memed, and that's a badge of honor — see you next year." },
  { min: 0, name: "Disaster", line: "Crazy fun, start to finish — now you've got a story for life." },
];
