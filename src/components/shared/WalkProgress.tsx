import { useEffect, useRef, useState } from "react";
import { hungerTiers } from "../../data/hunger-tiers";
import type { GamePlaythrough } from "../../game/types";
import ProgressStatusBar from "./ProgressStatusBar";
import TravelScene from "./TravelScene";

const walkBgImg = "/images/progress-walk-bg.png";
const skierImg = "/images/minigame-ski-skier.png"; // reused from the ski mini-game — same character, same style, no new art needed

// § 6: 20% faster (same distance in 1/1.2 the time) — was 7000.
const WALK_DURATION_MS = 5833;
const TICK_INTERVAL_MS = 100;

const WEATHER_FLAVOR = ["Crisp air", "Fresh powder", "Bluebird", "Light snow"];

function getHungerLabel(hunger: number): string {
  const tier = hungerTiers.find((t) => hunger >= t.min);
  return tier ? tier.label : hungerTiers[hungerTiers.length - 1].label;
}

function getHealthLabel(injury: GamePlaythrough["injury"]): string {
  if (!injury) return "No injuries";
  return injury.severity === "minor" ? "Minor injury" : "Moderate injury";
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

interface WalkProgressProps {
  playthrough: GamePlaythrough;
  caption: string;
  /** true = resort -> cabin (reversed direction/mirrored sprite) */
  flip?: boolean;
  onArrive: () => void;
}

/**
 * Brief (~6s), non-interactive cabin<->resort connective screen. No resource
 * impact — hunger/vibe are already handled by the day-change logic in the
 * segments on either side of this one. Skippable (click or Enter) so repeat
 * playthroughs aren't forced to sit through it.
 */
function WalkProgress({ playthrough, caption, flip = false, onArrive }: WalkProgressProps) {
  const [progress, setProgress] = useState(0);
  const [weather] = useState(() => WEATHER_FLAVOR[Math.floor(Math.random() * WEATHER_FLAVOR.length)]);
  const arrivedRef = useRef(false);

  function arrive() {
    if (arrivedRef.current) return;
    arrivedRef.current = true;
    onArrive();
  }

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => Math.min(1, prev + TICK_INTERVAL_MS / WALK_DURATION_MS));
    }, TICK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  // Reacts to `progress` rather than calling `onArrive` (App's setState)
  // from inside `setProgress`'s own updater above — that nesting trips
  // React's "Cannot update a component while rendering a different
  // component" guard and silently stalls the timer.
  useEffect(() => {
    if (progress >= 1) arrive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        arrive();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dayLabel = playthrough.currentSkiDay ? capitalize(playthrough.currentSkiDay) : "Keystone";
  const nextLandmark = flip ? "The cabin" : "The slopes";
  const progressLabel = progress < 0.4 ? "Just setting out..." : progress < 0.8 ? "On the path..." : "Almost there...";

  return (
    <TravelScene
      bgSrc={walkBgImg}
      bgAlt="Walking path between the cabin and the resort"
      vehicleSrc={skierImg}
      vehicleAlt="Skier"
      progress={progress}
      flip={flip}
      vehicleTopPct={62}
      onClick={arrive}
    >
      <div
        className="absolute inset-x-0 bottom-[16%] px-[4%] text-center text-2xl italic text-amber-950"
        style={{ textShadow: "1px 1px 0 rgba(255,255,255,0.6)" }}
      >
        {caption}
      </div>
      <ProgressStatusBar
        day={dayLabel}
        weather={weather}
        health={getHealthLabel(playthrough.injury)}
        hunger={getHungerLabel(playthrough.hungerLevel)}
        nextLandmark={nextLandmark}
        progressLabel={progressLabel}
      />
    </TravelScene>
  );
}

export default WalkProgress;
