import type { SegmentProps } from "../game/types";
import WalkProgress from "./shared/WalkProgress";

function WalkToResort({ playthrough, onUpdate }: SegmentProps) {
  return (
    <WalkProgress
      playthrough={playthrough}
      caption="Heading out to the slopes..."
      onArrive={() => onUpdate((prev) => ({ ...prev, currentSegment: "ski-day" }))}
    />
  );
}

export default WalkToResort;
