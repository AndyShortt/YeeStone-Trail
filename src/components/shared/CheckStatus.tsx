import { hungerTiers } from "../../data/hunger-tiers";
import { vibeTiers } from "../../data/vibe-tiers";
import type { GamePlaythrough } from "../../game/types";
import OverlayPanel from "./OverlayPanel";

interface CheckStatusProps {
  playthrough: GamePlaythrough;
  onClose: () => void;
}

function getVibeLabel(vibe: number): string {
  const tier = vibeTiers.find((t) => vibe >= t.min);
  return tier ? tier.label : vibeTiers[vibeTiers.length - 1].label;
}

// BALANCE-PATCH-2026-09-05, new — § 3.10
function getHungerLabel(hunger: number): string {
  const tier = hungerTiers.find((t) => hunger >= t.min);
  return tier ? tier.label : hungerTiers[hungerTiers.length - 1].label;
}

function getHealthLabel({ injury }: GamePlaythrough): string {
  if (!injury) return "No injuries";
  const name = injury.severity === "minor" ? "twisted ankle" : "banged-up knee";
  const label = injury.severity === "minor" ? "Minor" : "Moderate";
  return `${label} injury: ${name}`;
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

const PLACEMENT_LABEL: Record<"first" | "middle" | "last", string> = {
  first: "1st",
  middle: "middle",
  last: "last",
};

// § 2: "Leaderboard: [only shown once at least one ski day has been completed]".
// Back on its own line now that Party (below) is gone — with Party removed,
// the worst case (5 base fields + this + the conditional Incident-risk line)
// is back to 6 total, the same budget already proven to fit cleanly. Shows
// the most recent day only — matches this panel's "current snapshot"
// convention (Health/Vibe show current state, not a running history; the
// full day-by-day recap already lives in the Ending screen's eventLog).
function getLeaderboardLine({ completedSkiDays }: GamePlaythrough): string | null {
  if (completedSkiDays.length === 0) return null;
  const latest = completedSkiDays[completedSkiDays.length - 1];
  const dayLabel = capitalize(latest.day);
  const result = latest.crashed ? "crashed, no ranking" : PLACEMENT_LABEL[latest.leaderboardPlacement];
  return `Leaderboard: ${dayLabel} - ${result} (${latest.verticalFeet} ft)`;
}

function getDayLabel({ currentSegment, currentSkiDay }: GamePlaythrough): string {
  switch (currentSegment) {
    case "flight-progress":
    case "denver-airport":
    case "drive-progress":
    case "cabin-arrival":
      return "Wednesday";
    case "walk-to-resort":
    case "ski-day":
    case "walk-to-cabin":
    case "cabin-evening":
      return currentSkiDay ? capitalize(currentSkiDay) : "Keystone";
    case "journey-home":
    case "ending":
    case "ending-injured":
      return "Sunday";
    default:
      return "—";
  }
}

function CheckStatus({ playthrough, onClose }: CheckStatusProps) {
  const lines = [
    `Vibe: ${getVibeLabel(playthrough.vibePoints)}`,
    // BALANCE-PATCH-2026-09-05: Money+Hunger merged onto one line (explicit " — "
    // separator, never bare whitespace — see GAME_FLOW.md § 2) to keep the full
    // status readable within the panel's ~5-6 line capacity once the
    // conditional Incident-risk line below also applies.
    `Money: $${playthrough.money} — Hunger: ${getHungerLabel(playthrough.hungerLevel)}`,
    `Health: ${getHealthLabel(playthrough)}`,
    `Day: ${getDayLabel(playthrough)}`,
  ];

  const leaderboardLine = getLeaderboardLine(playthrough);
  if (leaderboardLine) lines.push(leaderboardLine);

  if (playthrough.foodRiskCounter >= 2) {
    lines.push("Incident risk: eating recklessly...");
  }

  return <OverlayPanel body={lines} onDismiss={onClose} />;
}

export default CheckStatus;
