import type { EndingTier } from "../game/types";

export const endingTiers: EndingTier[] = [
  { min: 90, name: "Legendary Trip", line: "The boys will be talking about this for years." },
  { min: 70, name: "Good Trip", line: "Worth the money, no regrets." },
  { min: 50, name: "Mediocre Trip", line: "It was fine. We had fun, but..." },
  { min: 30, name: "Bad Trip", line: "You got memed. You'll be hearing about this one." },
  { min: 0, name: "Disaster", line: "Early exit, full of regret. Better luck next year?" },
];
