import type { ReactNode } from "react";
import { hungerTiers } from "../data/hunger-tiers";
import { vibeTiers } from "../data/vibe-tiers";
import type { GamePlaythrough, SegmentProps } from "../game/types";

const journeyHomeImg = "/images/segment-8-journey-home.png";

function getVibeLabel(vibe: number): string {
  const tier = vibeTiers.find((t) => vibe >= t.min);
  return tier ? tier.label : vibeTiers[vibeTiers.length - 1].label;
}

function getHungerLabel(hunger: number): string {
  const tier = hungerTiers.find((t) => hunger >= t.min);
  return tier ? tier.label : hungerTiers[hungerTiers.length - 1].label;
}

function getHealthLabel({ injury }: GamePlaythrough): string {
  if (!injury) return "No injuries";
  return injury.severity === "minor" ? "Minor injury" : "Moderate injury";
}

// Same struck-through-name-plus-nickname treatment as CheckStatus.tsx's
// status board (§ 0 item 20 from the prior round) — this screen is written
// to match "prior status screens" per § 19, so it gets the same identity
// treatment, not just the same stat fields.
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

/**
 * § 19: the final numbers reveal — "Denver Airport - Departures," rebuilt
 * around the regenerated single-panel art (§ 8's art fix applied here too).
 * Trip tier + tagline moved to `ending`, reached via Head Home — this screen
 * is just the raw status-board-style readout, topped with "Final Results"
 * instead of a tier name.
 */
function JourneyHome({ playthrough, onUpdate }: SegmentProps) {
  function headHome() {
    onUpdate((prev) => ({ ...prev, currentSegment: "ending" }));
  }

  return (
    <div className="relative mx-auto aspect-square w-full max-w-xl select-none text-amber-950">
      <img src={journeyHomeImg} alt="Denver Airport departures" className="h-full w-full" draggable={false} />

      <div className="absolute left-[3%] top-[3%] flex h-[10%] w-[94%] items-center justify-center overflow-hidden rounded bg-amber-100/85 text-center text-[2.25rem] leading-tight">
        Denver Airport - Departures
      </div>

      <div className="absolute left-[3%] top-[53%] flex h-[44%] w-[94%] flex-col justify-center gap-1 overflow-hidden px-4 text-lg leading-tight">
        <p className="mb-1 text-center text-2xl">Final Results</p>
        {getNameLines(playthrough).map((line, i) => (
          <p key={i}>{line}</p>
        ))}
        <p>Bragging Rights Level: {getVibeLabel(playthrough.vibePoints)}</p>
        <p>
          Money: ${playthrough.money} — Health: {getHealthLabel(playthrough)}
        </p>
        <p>Food: {getHungerLabel(playthrough.hungerLevel)}</p>
        <button
          type="button"
          onClick={headHome}
          className="mt-1 cursor-pointer self-center rounded border-2 border-amber-950 bg-amber-100/60 px-6 py-1 text-xl hover:bg-amber-100"
        >
          Head Home
        </button>
      </div>
    </div>
  );
}

export default JourneyHome;
