import { useEffect, useRef, useState } from "react";
import TravelScene from "./TravelScene";

const walkBgImg = "/images/progress-walk-bg.png";
const skierImg = "/images/minigame-ski-skier.png"; // reused from the ski mini-game — same character, same style, no new art needed

const WALK_DURATION_MS = 7000;
const TICK_INTERVAL_MS = 100;

interface WalkProgressProps {
  caption: string;
  /** true = resort -> cabin (reversed direction/mirrored sprite) */
  flip?: boolean;
  onArrive: () => void;
}

/**
 * Brief (7s), non-interactive cabin<->resort connective screen. No resource
 * impact — hunger/vibe are already handled by the day-change logic in the
 * segments on either side of this one. Skippable (click or Enter) so repeat
 * playthroughs aren't forced to sit through it.
 */
function WalkProgress({ caption, flip = false, onArrive }: WalkProgressProps) {
  const [progress, setProgress] = useState(0);
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
      <div className="absolute inset-x-0 bottom-[4%] px-[4%] text-center text-lg italic text-amber-950" style={{ textShadow: "1px 1px 0 rgba(255,255,255,0.6)" }}>
        {caption}
      </div>
    </TravelScene>
  );
}

export default WalkProgress;
