import { useState } from "react";
import { pickBroCatchupLine } from "../data/bro-catchup-lines";
import { rollBroEvent } from "../game/rolls";
import type { SegmentProps } from "../game/types";
import { useOnEntry } from "../game/useOnEntry";
import OverlayPanel from "./shared/OverlayPanel";
import Store from "./shared/Store";

const cabinArrivalImg = "/images/segment-5-cabin-arrival.png";

type View = "main" | "store";

const SKI_STYLE_LABEL: Record<string, string> = {
  "safety-first": "Safety-first",
  balanced: "Balanced",
  "full-send": "Full Send",
};

function CabinArrival({ playthrough, onUpdate, onShowOverlay }: SegmentProps) {
  const [view, setView] = useState<View>("main");
  const [message, setMessage] = useState<string | null>(null);
  const [entryMessage, setEntryMessage] = useState<string | null>(null);
  const [pickingSkiStyle, setPickingSkiStyle] = useState(false);

  useOnEntry(() => {
    const broEvent = rollBroEvent();
    if (broEvent) {
      onUpdate((prev) => ({
        ...prev,
        vibePoints: prev.vibePoints + broEvent.vibeDelta,
        eventLog: [...prev.eventLog, broEvent.message],
      }));
      setEntryMessage(broEvent.message);
    }
  });

  function talkToBros() {
    setMessage(pickBroCatchupLine());
  }

  function pickSkiStyle(style: "safety-first" | "balanced" | "full-send") {
    onUpdate((prev) => ({ ...prev, skiStyle: style }));
    setPickingSkiStyle(false);
  }

  function headToSlopes() {
    if (!playthrough.skiStyle) {
      setMessage("Set your ski style first!");
      return;
    }
    onUpdate((prev) => ({
      ...prev,
      currentSegment: "walk-to-resort",
      currentSkiDay: prev.lostSkiDay ? "friday" : "thursday",
    }));
  }

  if (view === "store") {
    return <Store playthrough={playthrough} onUpdate={onUpdate} onLeave={() => setView("main")} />;
  }

  const skiStyleLabel = playthrough.skiStyle
    ? `4. Style: ${SKI_STYLE_LABEL[playthrough.skiStyle]}`
    : "4. Ski Style Setting";

  return (
    <div className="relative mx-auto aspect-square w-full max-w-xl select-none text-amber-950">
      <img src={cabinArrivalImg} alt="Cabin arrival" className="h-full w-full" draggable={false} />

      {/* Hidden whenever an overlay below is showing — both boxes reach
          into the bottom 37.5% band every OverlayPanel occupies, so left
          always-rendered they'd visibly collide with it. */}
      {!entryMessage && !pickingSkiStyle && !message && (
        <>
          <div className="absolute left-[3%] top-[53.5%] flex h-[11.5%] w-[94%] items-center justify-center overflow-hidden text-center text-base leading-tight sm:text-[2rem] sm:leading-none">
            Get Checked In and Ready for The Slopes Tomorrow
          </div>

          <div className="absolute left-[2%] top-[65%] flex h-[32%] w-[96%] flex-col justify-center gap-1 overflow-hidden px-2 text-sm leading-tight sm:gap-2 sm:text-xl">
            <button type="button" onClick={() => onShowOverlay?.("status")} className="cursor-pointer text-left hover:text-amber-700">
              1. Check your status
            </button>
            <button type="button" onClick={() => setView("store")} className="cursor-pointer text-left hover:text-amber-700">
              2. Visit Walter's stash
            </button>
            <button type="button" onClick={talkToBros} className="cursor-pointer text-left hover:text-amber-700">
              3. Talk to the bros
            </button>
            <button
              type="button"
              onClick={() => setPickingSkiStyle(true)}
              className="cursor-pointer text-left hover:text-amber-700"
            >
              {skiStyleLabel}
            </button>
            <button type="button" onClick={headToSlopes} className="cursor-pointer text-left hover:text-amber-700">
              5. Rest and hit the slopes
            </button>
          </div>
        </>
      )}

      {entryMessage && <OverlayPanel body={entryMessage} onDismiss={() => setEntryMessage(null)} />}

      {!entryMessage && pickingSkiStyle && (
        <OverlayPanel
          options={[
            { label: "Safety-first — lower risk, standard payoff", onSelect: () => pickSkiStyle("safety-first") },
            { label: "Balanced — standard risk, standard payoff", onSelect: () => pickSkiStyle("balanced") },
            { label: "Full Send — higher risk, 1.5x payoff", onSelect: () => pickSkiStyle("full-send") },
          ]}
        />
      )}

      {!entryMessage && !pickingSkiStyle && message && (
        <OverlayPanel body={message} onDismiss={() => setMessage(null)} />
      )}
    </div>
  );
}

export default CabinArrival;
