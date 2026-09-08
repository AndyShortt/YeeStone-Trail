import type { SegmentProps } from "../game/types";
import OverlayPanel from "./shared/OverlayPanel";

const endingInjuredImg = "/images/special-ending-screen-injured.png";

function EndingInjured({ playthrough }: SegmentProps) {
  const finalVibe = Math.max(0, playthrough.vibePoints - 50);

  function playAgain() {
    window.location.reload();
  }

  return (
    <div className="relative mx-auto aspect-square w-full max-w-xl select-none">
      <img src={endingInjuredImg} alt="Evacuation" className="h-full w-full" draggable={false} />

      <div className="absolute left-[68%] top-[2%] flex h-[12%] w-[30%] flex-col items-center justify-center gap-0.5 overflow-hidden px-1 text-center text-sm leading-tight text-amber-950">
        <p>EVACUATION</p>
        <p>Final Bragging Rights Level: {finalVibe}/100</p>
      </div>

      <OverlayPanel
        body={["A serious injury forced you to leave early.", "\"That was rough. Better luck next year.\""]}
        options={[{ label: "Play again", onSelect: playAgain }]}
      />
    </div>
  );
}

export default EndingInjured;
