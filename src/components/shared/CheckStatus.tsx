import type { ReactNode } from "react";
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

// § 0 item 20: the chosen name is otherwise almost never shown anywhere in
// the game — surfaced here so the status board always identifies who it's
// about. Once Puddle Britches triggers, `displayName` itself still holds the
// original name (it's never overwritten, see SkiDay.tsx) — struck through
// here with the nickname below it, rather than silently replaced.
function getNameLines({ displayName, playerName, puddleBritchesTriggered }: GamePlaythrough): ReactNode[] {
  const name = displayName ?? playerName ?? "You";
  if (!puddleBritchesTriggered) return [`Name: ${name}`];
  return [
    <>
      Name: <span className="line-through">{name}</span>
    </>,
    "a.k.a. Puddle Britches",
  ];
}

const PLACEMENT_LABEL: Record<"first" | "second" | "third" | "fourth", string> = {
  first: "1st",
  second: "2nd",
  third: "3rd",
  fourth: "last",
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
  const lines: ReactNode[] = [
    // § 0 item 20: adding the Name line(s) pushed the worst case (name struck
    // through + a.k.a. line, both conditional stats, still applies once
    // triggered) to 7 — one past the panel's proven-safe 6-line budget (found
    // by testing, text visibly clipped at the top edge). Health+Day merged
    // onto one line, same technique as Money+Hunger below, to claim it back.
    ...getNameLines(playthrough),
    `Bragging Rights Level: ${getVibeLabel(playthrough.vibePoints)}`,
    // BALANCE-PATCH-2026-09-05: Money+Hunger merged onto one line (explicit " — "
    // separator, never bare whitespace — see GAME_FLOW.md § 2) to keep the full
    // status readable within the panel's ~5-6 line capacity once the
    // conditional Incident-risk line below also applies.
    `Money: $${playthrough.money} — Hunger: ${getHungerLabel(playthrough.hungerLevel)}`,
    `Health: ${getHealthLabel(playthrough)} — Day: ${getDayLabel(playthrough)}`,
  ];

  const leaderboardLine = getLeaderboardLine(playthrough);
  if (leaderboardLine) lines.push(leaderboardLine);

  // Once it's already happened, a forward-looking risk warning no longer makes sense.
  if (playthrough.mealsEaten >= 2 && !playthrough.puddleBritchesTriggered) {
    lines.push("Incident risk: something's not sitting right...");
  }

  return <OverlayPanel body={lines} onDismiss={onClose} />;
}

export default CheckStatus;
