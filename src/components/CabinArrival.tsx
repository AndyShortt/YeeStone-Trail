import { useState } from "react";
import { rollBroEvent } from "../game/rolls";
import type { SegmentProps } from "../game/types";
import { useOnEntry } from "../game/useOnEntry";
import OverlayPanel from "./shared/OverlayPanel";
import Store from "./shared/Store";

const cabinArrivalImg = "/images/segment-5-cabin-arrival.png";
const dukeUncImg = "/images/special-duke-unc-game.png";

type View = "main" | "duke-unc" | "store";

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
  const [confirmingQuit, setConfirmingQuit] = useState(false);

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
    setMessage(
      "You catch up with the guys — same old stories, already feels like the trip's started.",
    );
  }

  function watchDukeUnc() {
    if (playthrough.dukeUncResolved) {
      setMessage("The game's over. UNC/Duke won, everyone's still talking about it.");
      return;
    }
    setView("duke-unc");
  }

  function resolveDukeUnc(choice: "unc" | "duke" | "neutral") {
    const uncWins = Math.random() < 0.5;
    let vibeDelta = 0;
    let line: string;
    let winBonus = false;

    if (choice === "unc") {
      if (uncWins) {
        vibeDelta = 5;
        winBonus = true;
        line = "UNC pulls it out! The cabin erupts.";
      } else {
        vibeDelta = -3;
        line = "Duke wins. Rough night for the UNC fans in the room.";
      }
    } else if (choice === "duke") {
      vibeDelta = uncWins ? -10 + 5 : -10;
      line = uncWins
        ? "UNC wins. You cheered for Duke anyway — respect, but the room won't let you forget it."
        : "Duke wins! Vindication, in a room full of UNC fans.";
    } else {
      line = uncWins ? "UNC wins. You really didn't care either way." : "Duke wins. You really didn't care either way.";
    }

    onUpdate((prev) => ({
      ...prev,
      vibePoints: prev.vibePoints + vibeDelta,
      dukeUncChoice: choice,
      dukeUncResolved: true,
      uncWinBonusPending: winBonus,
      eventLog: [...prev.eventLog, line],
    }));
    setView("main");
    setMessage(line);
  }

  function pickSkiStyle(style: "safety-first" | "balanced" | "full-send") {
    onUpdate((prev) => ({ ...prev, skiStyle: style }));
    setPickingSkiStyle(false);
  }

  function restForNow() {
    if (!playthrough.restUsedThisVisit) {
      onUpdate((prev) => ({
        ...prev,
        vibePoints: prev.vibePoints + 1,
        restUsedThisVisit: true,
      }));
    }
    setMessage("You kick back for a bit. Feels good to finally sit still.");
  }

  function headToSlopes() {
    if (!playthrough.skiStyle) {
      setMessage("Set your ski style first!");
      return;
    }
    onUpdate((prev) => ({
      ...prev,
      currentSegment: "ski-day",
      currentSkiDay: prev.lostSkiDay ? "friday" : "thursday",
    }));
  }

  function confirmQuit() {
    onUpdate((prev) => ({ ...prev, voluntaryQuit: true, currentSegment: "ending" }));
  }

  if (view === "store") {
    return <Store playthrough={playthrough} onUpdate={onUpdate} onLeave={() => setView("main")} />;
  }

  if (view === "duke-unc") {
    return (
      <div className="relative mx-auto aspect-square w-full max-w-xl select-none text-amber-950">
        <img src={dukeUncImg} alt="Duke vs. UNC" className="h-full w-full" draggable={false} />
        <div className="absolute left-[3%] top-[58%] flex h-[39%] w-[94%] flex-col justify-center gap-1 overflow-hidden px-2 text-lg leading-tight">
          <p>DUKE VS. UNC IS ON!</p>
          <p className="text-base italic">The guys gather around the TV. Most of them went to UNC.</p>
          <button type="button" onClick={() => resolveDukeUnc("unc")} className="mt-1 cursor-pointer text-left hover:text-amber-700">
            1. Cheer for UNC
          </button>
          <button type="button" onClick={() => resolveDukeUnc("duke")} className="cursor-pointer text-left hover:text-amber-700">
            2. Cheer for Duke
          </button>
          <button type="button" onClick={() => resolveDukeUnc("neutral")} className="cursor-pointer text-left hover:text-amber-700">
            3. Don't Care
          </button>
          <button type="button" onClick={() => resolveDukeUnc("neutral")} className="cursor-pointer text-left hover:text-amber-700">
            4. Back / Watch alone
          </button>
        </div>
      </div>
    );
  }

  const skiStyleLabel = playthrough.skiStyle
    ? `5. Style: ${SKI_STYLE_LABEL[playthrough.skiStyle]}`
    : "5. Ski Style Setting";

  return (
    <div className="relative mx-auto aspect-square w-full max-w-xl select-none text-amber-950">
      <img src={cabinArrivalImg} alt="Cabin arrival" className="h-full w-full" draggable={false} />

      <div className="absolute left-[3%] top-[58%] flex h-[6%] w-[94%] items-center justify-center overflow-hidden text-base leading-tight">
        Warm cabin, bros already settled in.
      </div>

      <div className="absolute left-[2%] top-[65%] grid h-[32%] w-[96%] grid-cols-2 grid-rows-4 gap-x-2 gap-y-1 overflow-hidden px-1 text-base leading-tight">
        <button type="button" onClick={() => onShowOverlay?.("status")} className="cursor-pointer text-left hover:text-amber-700">
          1. Check your status
        </button>
        <button type="button" onClick={() => setView("store")} className="cursor-pointer text-left hover:text-amber-700">
          2. Visit Walter's stash
        </button>
        <button type="button" onClick={talkToBros} className="cursor-pointer text-left hover:text-amber-700">
          3. Talk to the bros
        </button>
        <button type="button" onClick={watchDukeUnc} className="cursor-pointer text-left hover:text-amber-700">
          4. Watch TV
        </button>
        <button
          type="button"
          onClick={() => setPickingSkiStyle(true)}
          className="cursor-pointer text-left hover:text-amber-700"
        >
          {skiStyleLabel}
        </button>
        <button type="button" onClick={restForNow} className="cursor-pointer text-left hover:text-amber-700">
          6. Rest / sleep
        </button>
        <button type="button" onClick={headToSlopes} className="cursor-pointer text-left hover:text-amber-700">
          7. Head to the slopes
        </button>
        <button
          type="button"
          onClick={() => setConfirmingQuit(true)}
          className="cursor-pointer text-left hover:text-amber-700"
        >
          8. Quit early
        </button>
      </div>

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

      {!entryMessage && !pickingSkiStyle && confirmingQuit && (
        <OverlayPanel
          body="Are you sure? This ends your trip early."
          options={[
            { label: "Yes, go home", onSelect: confirmQuit },
            { label: "No, stay", onSelect: () => setConfirmingQuit(false) },
          ]}
        />
      )}

      {!entryMessage && !pickingSkiStyle && !confirmingQuit && message && (
        <OverlayPanel body={message} onDismiss={() => setMessage(null)} />
      )}
    </div>
  );
}

export default CabinArrival;
