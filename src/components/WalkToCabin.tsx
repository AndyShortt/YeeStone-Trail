import type { SegmentProps } from "../game/types";
import WalkProgress from "./shared/WalkProgress";

// § 11: Saturday evening skips the interactive cabin-evening menu entirely —
// after the last ski day, walking back goes straight to the redesigned final
// screen instead. The daily injury penalty (previously applied by
// cabin-evening's "Rest for the Night") has to move here for that case,
// since Saturday never reaches that button anymore.
function WalkToCabin({ playthrough, onUpdate }: SegmentProps) {
  function onArrive() {
    onUpdate((prev) => {
      if (prev.currentSkiDay !== "saturday") {
        return { ...prev, currentSegment: "cabin-evening" };
      }
      // § 18: dailyPenalty is stored negative, so `+` genuinely subtracts —
      // see the identical fix/note in CabinEvening.tsx's restForNight().
      const dailyPenalty = prev.injury ? prev.injury.dailyPenalty : 0;
      return { ...prev, vibePoints: prev.vibePoints + dailyPenalty, currentSegment: "journey-home" };
    });
  }

  return <WalkProgress playthrough={playthrough} caption="Trudging back to the cabin..." flip onArrive={onArrive} />;
}

export default WalkToCabin;
