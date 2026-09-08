import { endingTiers } from "./ending-tiers";
import type { GamePlaythrough } from "../game/types";

/**
 * § 12: replaces each ending tier's single flat `line` with a small
 * hand-written pool, tagged by outcome, so the tagline reads warm/funny and
 * roughly matches how the trip actually went — always positive in delivery,
 * even for a rough outcome. There's no LLM call generating these live, so
 * this is a fixed pool rather than full coverage of every combination;
 * `null` on a tag means "matches either value" (used where a line doesn't
 * care about that particular axis).
 */
export interface EndingTagline {
  vibeTierName: string;
  moneyTier: "low" | "high" | null;
  injury: boolean | null;
  puddleBritches: boolean | null;
  line: string;
}

/** < $100 remaining reads as "low" for tagline-matching purposes. */
const LOW_MONEY_THRESHOLD = 100;

export const endingTaglines: EndingTagline[] = [
  // Legendary Trip (90+)
  {
    vibeTierName: "Legendary Trip",
    moneyTier: "high",
    injury: false,
    puddleBritches: false,
    line: "Big Kahuna energy: nobody got hurt, the wallet's still got some fight left in it, and the group chat is going to be replaying this one for years.",
  },
  {
    vibeTierName: "Legendary Trip",
    moneyTier: "low",
    injury: false,
    puddleBritches: false,
    line: "Broke and beautiful. You spent it all and it was worth every penny — the group chat agrees this was worth going into ski-shop debt for.",
  },
  {
    vibeTierName: "Legendary Trip",
    moneyTier: null,
    injury: true,
    puddleBritches: false,
    line: "A little banged up, sure, but you'll wear that story like a medal. Best trip in years, scars and all.",
  },
  {
    vibeTierName: "Legendary Trip",
    moneyTier: null,
    injury: null,
    puddleBritches: true,
    line: "Puddle Britches AND a legendary trip? Somehow both true. The nickname's forever, but so are the memories.",
  },

  // Good Trip (70-89)
  {
    vibeTierName: "Good Trip",
    moneyTier: "high",
    injury: false,
    puddleBritches: false,
    line: "Smooth trip, cash to spare, nobody limping to the car. Genuinely, solidly good — no notes.",
  },
  {
    vibeTierName: "Good Trip",
    moneyTier: "low",
    injury: false,
    puddleBritches: false,
    line: "You're a little light in the wallet, but you skied hard and came home in one piece. Worth it.",
  },
  {
    vibeTierName: "Good Trip",
    moneyTier: null,
    injury: true,
    puddleBritches: null,
    line: "Banged up but grinning. A good trip doesn't mean an easy one — the knee will heal, the stories won't fade.",
  },
  {
    vibeTierName: "Good Trip",
    moneyTier: null,
    injury: null,
    puddleBritches: true,
    line: "Puddle Britches rides again, but the trip itself? Genuinely good. The nickname's just a bonus feature.",
  },

  // Mediocre Trip (50-69)
  {
    vibeTierName: "Mediocre Trip",
    moneyTier: "low",
    injury: true,
    puddleBritches: true,
    line: "Crazy fun even on a tight budget and a little banged up — Puddle Britches made sure this was one nobody's forgetting. The group chat still loves you.",
  },
  {
    vibeTierName: "Mediocre Trip",
    moneyTier: "high",
    injury: false,
    puddleBritches: false,
    line: "Money in the bank, nobody hurt, good vibes the whole weekend — a genuinely solid trip, no drama needed.",
  },
  {
    vibeTierName: "Mediocre Trip",
    moneyTier: "low",
    injury: false,
    puddleBritches: null,
    line: "Wallet's empty, knees are great — call it a full send on the budget and a clean win everywhere else.",
  },
  {
    vibeTierName: "Mediocre Trip",
    moneyTier: null,
    injury: true,
    puddleBritches: false,
    line: "A little banged up, but the trip itself was a genuinely good time — worth every bruise.",
  },

  // Bad Trip (30-49)
  {
    vibeTierName: "Bad Trip",
    moneyTier: "low",
    injury: true,
    puddleBritches: null,
    line: "Broke and banged up, sure — but also the best story you'll tell for years. Worth every penny and every bruise.",
  },
  {
    vibeTierName: "Bad Trip",
    moneyTier: null,
    injury: null,
    puddleBritches: true,
    line: "You got memed and the nickname's sticking forever — honestly, that's a legendary trip in disguise. Happy trails, Puddle Britches.",
  },
  {
    vibeTierName: "Bad Trip",
    moneyTier: "high",
    injury: false,
    puddleBritches: false,
    line: "Kept the cash, kept the body intact — a weirdly efficient trip. You'll be laughing about this one soon enough.",
  },
  {
    vibeTierName: "Bad Trip",
    moneyTier: null,
    injury: false,
    puddleBritches: false,
    line: "Just a quirky trip — no injuries, no drama, the mountain just had its own plans. Already looking good for next year.",
  },

  // Disaster (<30)
  {
    vibeTierName: "Disaster",
    moneyTier: null,
    injury: true,
    puddleBritches: true,
    line: "Crazy fun — even with the injuries and getting beat on the slopes, Puddle Britches.",
  },
  {
    vibeTierName: "Disaster",
    moneyTier: "low",
    injury: true,
    puddleBritches: null,
    line: "Broke and banged up, but crazy fun anyway — sometimes the wildest trips make the best stories. See you next year.",
  },
  {
    vibeTierName: "Disaster",
    moneyTier: null,
    injury: null,
    puddleBritches: null,
    line: "However it went down, it was crazy fun — and you're already planning next year's redemption arc. That's the spirit.",
  },
  {
    vibeTierName: "Disaster",
    moneyTier: null,
    injury: false,
    puddleBritches: false,
    line: "No injuries, no incidents, somehow still a disaster on paper — technically unscathed and honestly still crazy fun.",
  },
];

function moneyTierOf(money: number): "low" | "high" {
  return money < LOW_MONEY_THRESHOLD ? "low" : "high";
}

/**
 * Scores every tagline tagged for this vibe tier by how many of its
 * non-wildcard tags match the actual outcome, returns a random pick among
 * the highest-scoring entries. Falls back to a rewritten (still positive)
 * version of the tier's own default line if nothing is tagged for it.
 */
export function selectTagline(playthrough: GamePlaythrough, tierName: string): string {
  const actualMoneyTier = moneyTierOf(playthrough.money);
  const actualInjury = playthrough.injury !== null;
  const actualPuddle = playthrough.puddleBritchesTriggered;

  const candidates = endingTaglines.filter((t) => t.vibeTierName === tierName);
  if (candidates.length === 0) {
    const tier = endingTiers.find((t) => t.name === tierName);
    return tier?.line ?? "Trip's in the books — already looking forward to next year.";
  }

  let bestScore = -1;
  let best: EndingTagline[] = [];
  for (const candidate of candidates) {
    let score = 0;
    if (candidate.moneyTier !== null) score += candidate.moneyTier === actualMoneyTier ? 1 : -1;
    if (candidate.injury !== null) score += candidate.injury === actualInjury ? 1 : -1;
    if (candidate.puddleBritches !== null) score += candidate.puddleBritches === actualPuddle ? 1 : -1;

    if (score > bestScore) {
      bestScore = score;
      best = [candidate];
    } else if (score === bestScore) {
      best.push(candidate);
    }
  }

  return best[Math.floor(Math.random() * best.length)].line;
}
