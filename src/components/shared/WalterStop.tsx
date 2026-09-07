import { useState } from "react";
import type { GamePlaythrough } from "../../game/types";
import Store from "./Store";

const storeImg = "/images/special-store-walter.png";

interface WalterStopProps {
  playthrough: GamePlaythrough;
  onUpdate: (updater: (prev: GamePlaythrough) => GamePlaythrough) => void;
  onDone: () => void;
}

/**
 * Walter's roadside stop — a scripted checkpoint on the drive-progress screen
 * (formerly the standalone `costco-stop` segment between Denver Airport and
 * the drive). `onDone` resumes the drive rather than advancing a segment.
 */
function WalterStop({ playthrough, onUpdate, onDone }: WalterStopProps) {
  const [shopping, setShopping] = useState(false);

  // Absolutely-positioned wrapper, not `relative aspect-square w-full
  // max-w-xl` — unlike CostcoStop (which this was extracted from), this
  // renders NESTED inside another already-square screen (drive-progress),
  // not as a standalone top-level segment. A `relative` root here would sit
  // in normal document flow below the parent's content instead of
  // overlaying it — found by testing (the DOM had a "Shop with Walter"
  // button that was never visible on screen).
  return (
    <div className="absolute inset-0">
      {shopping ? (
        <Store playthrough={playthrough} onUpdate={onUpdate} onLeave={onDone} />
      ) : (
        <div className="relative h-full w-full select-none text-amber-950">
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
            <button type="button" onClick={onDone} className="cursor-pointer text-left hover:text-amber-700">
              2. Skip - back on the road
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default WalterStop;
