import type { SegmentProps } from "../game/types";

const journeyHomeImg = "/images/segment-8-journey-home.png";

function JourneyHome({ onUpdate }: SegmentProps) {
  function continueToResults() {
    onUpdate((prev) => ({ ...prev, currentSegment: "ending" }));
  }

  return (
    <div className="relative mx-auto aspect-square w-full max-w-xl select-none text-amber-950">
      <img src={journeyHomeImg} alt="Journey home" className="h-full w-full" draggable={false} />

      <div className="absolute left-[19%] top-[2%] flex h-[12%] w-[36%] items-center justify-center overflow-hidden px-1 text-center text-lg leading-tight">
        SUNDAY AFTERNOON
      </div>

      <button
        type="button"
        onClick={continueToResults}
        className="absolute left-[2%] top-[73%] flex h-[25%] w-[26%] cursor-pointer items-center justify-center overflow-hidden px-1 text-center text-base leading-tight hover:bg-amber-900/10"
      >
        1. Continue to final results
      </button>
    </div>
  );
}

export default JourneyHome;
