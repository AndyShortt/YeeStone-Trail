import type { SegmentProps } from "../game/types";
import WalkProgress from "./shared/WalkProgress";

function WalkToCabin({ onUpdate }: SegmentProps) {
  return (
    <WalkProgress
      caption="Trudging back to the cabin..."
      flip
      onArrive={() => onUpdate((prev) => ({ ...prev, currentSegment: "cabin-evening" }))}
    />
  );
}

export default WalkToCabin;
