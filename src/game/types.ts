export type ProfessionId = "finance-bro" | "musician" | "pastor" | "tech-bro";

export interface Profession {
  id: ProfessionId;
  name: string;
  location: string;
  startingVibe: number;
  startingMoney: number;
}

export type SegmentId =
  | "title"
  | "name-entry"
  | "profession-select"
  | "flight-time-select"
  | "ski-rental-select"
  | "charlotte-airport"
  | "inflight"
  | "denver-airport"
  | "costco-stop"
  | "rental-car-drive"
  | "cabin-arrival"
  | "ski-day"
  | "cabin-evening"
  | "journey-home"
  | "ending"
  | "ending-injured";

export interface Injury {
  severity: "minor" | "moderate";
  dailyPenalty: number;
  treated: boolean;
}

export interface SkiDayResult {
  day: "thursday" | "friday" | "saturday";
  route: "green" | "blue" | "black";
  crashed: boolean;
  verticalFeet: number;
  leaderboardPlacement: "first" | "middle" | "last";
}

export interface GamePlaythrough {
  // Identity
  playerName?: string;
  displayName?: string;
  profession?: Profession;
  flightTime?: "early" | "late";
  skiRentalLocation?: "keystone" | "frisco";

  // Resources
  vibePoints: number;
  money: number;
  hungerLevel: number; // 0-100, clamped, starts at 100 — § 3.10 (BALANCE-PATCH-2026-09-05, new)

  // Injury
  injury: Injury | null;
  severeInjuryExit: boolean;

  // Puddle Britches
  foodRiskCounter: number;
  puddleBritchesTriggered: boolean;

  // Flight delay
  lostSkiDay: boolean;

  // Ski loop
  skiStyle: "safety-first" | "balanced" | "full-send" | null;
  currentSkiDay: "thursday" | "friday" | "saturday" | null;
  completedSkiDays: SkiDayResult[];

  // One-time flags
  reflectionCompleted: boolean;
  skiChatCompleted: boolean;
  restBreakUsed: boolean;
  dukeUncChoice: "unc" | "duke" | "neutral" | null;
  dukeUncResolved: boolean;
  thermalWearPurchased: boolean;
  restUsedThisVisit: boolean; // § 4.12 option 6 — resets each cabin-arrival/cabin-evening
  voluntaryQuit: boolean; // § 4.12 option 8 — forces Disaster tier at `ending` (§ 6.3)
  uncWinBonusPending: boolean; // § 3.8 — +1% injury risk on the very next ski day only
  wentBrokeTriggered: boolean; // § 3.11 — one-time vibe hit the first time money hits
                                // exactly $0 (BALANCE-PATCH-2026-09-05, new)

  // Progress / narrative
  currentSegment: SegmentId;
  eventLog: string[];

  startedAt: string;
}

export interface BroEventLine {
  template: string; // contains "{name}"
  vibeDelta: number;
  skiDayOnly?: boolean;
}

export interface BroEventPool {
  good: BroEventLine[];
  bad: BroEventLine[];
}

export interface StoreFoodOption {
  id: "standard" | "risky";
  label: string;
  cost: number;
  vibeDelta: number;
  foodRiskIncrement: number;
  hungerRestore: number; // BALANCE-PATCH-2026-09-05, new — § 3.10
}

export interface StoreItem {
  id: "drinks" | "snacks" | "gear";
  label: string;
  cost: number;
  vibeDelta: number;
  oneTime?: boolean;
}

export interface VibeTier {
  min: number;
  label: string;
}

export interface HungerTier {
  min: number;
  label: string;
} // BALANCE-PATCH-2026-09-05, new — § 3.10

export interface EndingTier {
  min: number;
  name: string;
  line: string;
}

export interface SegmentProps {
  playthrough: GamePlaythrough;
  onUpdate: (updater: (prev: GamePlaythrough) => GamePlaythrough) => void;
  /** Triggers the shared Map/Status overlay (§ 2) from within a segment's own menu. */
  onShowOverlay?: (overlay: "map" | "status") => void;
}
