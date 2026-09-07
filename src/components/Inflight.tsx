import { useState } from "react";
import type { SegmentProps } from "../game/types";
import { useOnEntry } from "../game/useOnEntry";
import OverlayPanel from "./shared/OverlayPanel";

const inflightImg = "/images/segment-2-inflight.png";

function Inflight({ playthrough, onUpdate }: SegmentProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [turbulence, setTurbulence] = useState(false);

  useOnEntry(() => {
    if (Math.random() < 0.1) setTurbulence(true);
  });

  function readExamen() {
    if (!playthrough.reflectionCompleted) {
      onUpdate((prev) => ({ ...prev, vibePoints: prev.vibePoints + 5, reflectionCompleted: true }));
    }
    setMessage(
      "You spend some quiet time with the Great Annual Examen before the trip really kicks off.",
    );
  }

  function chatSkiTechnique() {
    if (!playthrough.skiChatCompleted) {
      onUpdate((prev) => ({ ...prev, vibePoints: prev.vibePoints + 1, skiChatCompleted: true }));
    }
    setMessage("You swap ski-technique tips with the guys — half of it is probably made up.");
  }

  function goToDenver() {
    onUpdate((prev) => ({ ...prev, currentSegment: "denver-airport" }));
  }

  return (
    <div className="relative mx-auto aspect-square w-full max-w-xl select-none text-amber-950">
      <img src={inflightImg} alt="In flight to Denver" className="h-full w-full" draggable={false} />

      <div className="absolute left-[2%] top-[55%] flex h-[13%] w-[96%] items-center justify-center overflow-hidden px-2 text-center text-xl">
        5 hours to Denver...
      </div>

      <div className="absolute left-[2%] top-[70%] flex h-[27%] w-[96%] flex-col justify-center gap-1 overflow-hidden px-2 text-lg leading-tight">
        <button
          type="button"
          onClick={readExamen}
          className="cursor-pointer text-left hover:text-amber-700"
        >
          1. Read the Great Annual Examen
        </button>
        <button
          type="button"
          onClick={chatSkiTechnique}
          className="cursor-pointer text-left hover:text-amber-700"
        >
          2. Chat about ski technique
        </button>
        <button
          type="button"
          onClick={() => setMessage("You close your eyes for a bit. Feels good.")}
          className="cursor-pointer text-left hover:text-amber-700"
        >
          3. Sleep for a bit
        </button>
        <button
          type="button"
          onClick={() => setMessage("Clouds roll by outside. Almost there.")}
          className="cursor-pointer text-left hover:text-amber-700"
        >
          4. Stare out the window
        </button>
        <button
          type="button"
          onClick={goToDenver}
          className="cursor-pointer text-left hover:text-amber-700"
        >
          5. Buckle up — we're landing
        </button>
      </div>

      {turbulence && (
        <OverlayPanel
          body="Turbulence! Overhead bin opens, luggage tumbles."
          onDismiss={() => setTurbulence(false)}
        />
      )}

      {!turbulence && message && (
        <OverlayPanel body={message} onDismiss={() => setMessage(null)} />
      )}
    </div>
  );
}

export default Inflight;
