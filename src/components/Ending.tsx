import { useState } from "react";
import { endingTiers } from "../data/ending-tiers";
import type { SegmentProps } from "../game/types";
import { useOnEntry } from "../game/useOnEntry";
import OverlayPanel from "./shared/OverlayPanel";

const endingImg = "/images/special-ending-screen.png";

type Stage = "tagline" | "summary" | "recap";

function getTier(vibePoints: number) {
  return endingTiers.find((t) => vibePoints >= t.min) ?? endingTiers[endingTiers.length - 1];
}

function Ending({ playthrough, onUpdate }: SegmentProps) {
  const [stage, setStage] = useState<Stage>("tagline");

  useOnEntry(() => {
    if (playthrough.puddleBritchesTriggered && playthrough.vibePoints > 60) {
      onUpdate((prev) => ({
        ...prev,
        vibePoints: prev.vibePoints + 20,
        eventLog: [...prev.eventLog, "Redemption arc — you turned it around after Puddle Britches."],
      }));
    }
  });

  const tier = playthrough.voluntaryQuit ? endingTiers[endingTiers.length - 1] : getTier(playthrough.vibePoints);
  const tagline = playthrough.voluntaryQuit
    ? "You packed it in early. The boys will never let you live it down."
    : tier.line;

  const injuryLine = playthrough.injury ? `Injury: ${playthrough.injury.severity}` : "No injuries";
  const recapHighlights = playthrough.eventLog.slice(-2);
  const recapBody = recapHighlights.length > 0 ? recapHighlights : ["A quiet trip — no big moments logged."];

  function playAgain() {
    window.location.reload();
  }

  return (
    <div className="relative mx-auto aspect-square w-full max-w-xl select-none">
      <img src={endingImg} alt="Trip complete" className="h-full w-full" draggable={false} />

      <div className="absolute left-[68%] top-[2%] flex h-[16%] w-[30%] flex-col items-center justify-center gap-0.5 overflow-hidden px-1 text-center text-sm leading-tight text-amber-950">
        <p>{tier.name}</p>
        <p>Vibe: {playthrough.vibePoints}/100</p>
      </div>

      {stage === "tagline" && (
        <OverlayPanel body={tagline} onDismiss={() => setStage("summary")} />
      )}

      {stage === "summary" && (
        <OverlayPanel
          body={[`Money: $${playthrough.money}`, injuryLine]}
          onDismiss={() => setStage("recap")}
        />
      )}

      {stage === "recap" && (
        <OverlayPanel body={recapBody} options={[{ label: "Play again", onSelect: playAgain }]} />
      )}
    </div>
  );
}

export default Ending;
