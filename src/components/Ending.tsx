import { endingTiers } from "../data/ending-tiers";
import { selectTagline } from "../data/ending-taglines";
import type { SegmentProps } from "../game/types";
import { useOnEntry } from "../game/useOnEntry";
import OverlayPanel from "./shared/OverlayPanel";

const endingImg = "/images/special-ending-screen.png";

function getTier(vibePoints: number) {
  return endingTiers.find((t) => vibePoints >= t.min) ?? endingTiers[endingTiers.length - 1];
}

/**
 * § 20: collapsed from a 3-stage reveal (tagline -> money/injury summary ->
 * last-2-eventLog recap) down to one — the summary is now redundant with
 * `journey-home`'s "Final Results" screen (§ 19) the player just came from,
 * and the recap (Duke/UNC winner, ski placement, etc.) was already seen live
 * as it happened. Just the tagline, plus a big centered Play Again.
 */
function Ending({ playthrough, onUpdate }: SegmentProps) {
  useOnEntry(() => {
    if (playthrough.puddleBritchesTriggered && playthrough.vibePoints > 60) {
      onUpdate((prev) => ({
        ...prev,
        vibePoints: prev.vibePoints + 20,
        eventLog: [...prev.eventLog, "Redemption arc — you turned it around after Puddle Britches."],
      }));
    }
  });

  const tier = getTier(playthrough.vibePoints);
  const tagline = selectTagline(playthrough, tier.name);

  function playAgain() {
    window.location.reload();
  }

  return (
    <div className="relative mx-auto aspect-square w-full max-w-xl select-none">
      <img src={endingImg} alt="Trip complete" className="h-full w-full" draggable={false} />

      <div className="absolute left-[68%] top-[2%] flex h-[16%] w-[30%] flex-col items-center justify-center gap-0.5 overflow-hidden px-1 text-center text-sm leading-tight text-amber-950">
        <p>{tier.name}</p>
        <p>Bragging Rights Level: {playthrough.vibePoints}/100</p>
      </div>

      <OverlayPanel body={tagline} />

      <button
        type="button"
        onClick={playAgain}
        className="absolute left-1/2 top-[45%] -translate-x-1/2 -translate-y-1/2 cursor-pointer whitespace-nowrap rounded border-2 border-amber-950 bg-amber-100/90 px-6 py-3 text-3xl text-amber-950 hover:bg-amber-100"
      >
        Play again
      </button>
    </div>
  );
}

export default Ending;
