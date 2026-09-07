import { useState } from "react";
import type { SegmentProps } from "../game/types";
import Store from "./shared/Store";

const storeImg = "/images/special-store-walter.png";

function CostcoStop({ playthrough, onUpdate }: SegmentProps) {
  const [shopping, setShopping] = useState(false);

  function advance() {
    onUpdate((prev) => ({ ...prev, currentSegment: "rental-car-drive" }));
  }

  if (shopping) {
    return <Store playthrough={playthrough} onUpdate={onUpdate} onLeave={advance} />;
  }

  return (
    <div className="relative mx-auto aspect-square w-full max-w-xl select-none text-amber-950">
      <img src={storeImg} alt="Walter waves you over" className="h-full w-full" draggable={false} />

      <div className="absolute left-[3%] top-[58%] flex h-[39%] w-[94%] flex-col justify-center gap-2 overflow-hidden px-2 text-xl leading-tight">
        <p className="mb-1 italic">
          Walter W. waves you over. "Let's make sure you're all set."
        </p>
        <button
          type="button"
          onClick={() => setShopping(true)}
          className="cursor-pointer text-left hover:text-amber-700"
        >
          1. Shop with Walter
        </button>
        <button
          type="button"
          onClick={advance}
          className="cursor-pointer text-left hover:text-amber-700"
        >
          2. Skip - head straight to the car
        </button>
      </div>
    </div>
  );
}

export default CostcoStop;
