import { useState } from "react";
import { applySpend } from "../game/economy";
import { rollBroEvent, rollLuggageSkip, type LuggageSkipResult } from "../game/rolls";
import type { SegmentProps } from "../game/types";
import { useOnEntry } from "../game/useOnEntry";
import OverlayPanel from "./shared/OverlayPanel";

const denverAirportImg = "/images/segment-3-denver-airport.png";

type Phase = "pre-luggage" | "post-luggage";

function DenverAirport({ playthrough, onUpdate, onShowOverlay }: SegmentProps) {
  const [phase, setPhase] = useState<Phase>("pre-luggage");
  const [entryMessage, setEntryMessage] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  // BALANCE-PATCH-2026-09-05, new — § 5.1 lost-luggage buyback.
  const [pendingLuggageLoss, setPendingLuggageLoss] = useState<LuggageSkipResult | null>(null);

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

  function startLuggageMinigame() {
    // Mini-game not implemented yet — passes straight through, no penalty.
    setPhase("post-luggage");
  }

  function skipLuggage() {
    const result = rollLuggageSkip();
    if (result) {
      setPendingLuggageLoss(result);
    } else {
      setPhase("post-luggage");
    }
  }

  // BALANCE-PATCH-2026-09-05, new — § 5.1: pay to cancel this run's item-loss penalty.
  function payLuggageBuyback() {
    onUpdate((prev) => {
      const spend = applySpend(prev, 100);
      return {
        ...prev,
        money: spend.money,
        vibePoints: prev.vibePoints + spend.vibeDelta,
        wentBrokeTriggered: spend.wentBrokeTriggered,
        eventLog: spend.eventLogAppend ? [...prev.eventLog, spend.eventLogAppend] : prev.eventLog,
      };
    });
    setPendingLuggageLoss(null);
    setPhase("post-luggage");
  }

  function dealWithLuggageLoss() {
    const result = pendingLuggageLoss;
    if (result) {
      onUpdate((prev) => ({
        ...prev,
        vibePoints: prev.vibePoints + result.vibeDelta,
        money: prev.money + result.moneyDelta,
        eventLog: [...prev.eventLog, result.message],
      }));
      setMessage(result.message);
    }
    setPendingLuggageLoss(null);
    setPhase("post-luggage");
  }

  function headToParking() {
    onUpdate((prev) => ({ ...prev, currentSegment: "drive-progress" }));
  }

  function talkToCrew() {
    setMessage(
      "You catch up with the guys — same old stories, already feels like the trip's started.",
    );
  }

  return (
    <div className="relative mx-auto aspect-square w-full max-w-xl select-none text-amber-950">
      <img src={denverAirportImg} alt="Denver airport" className="h-full w-full" draggable={false} />

      <div className="absolute left-[19%] top-[2%] flex h-[11%] w-[36%] items-center justify-center overflow-hidden px-1 text-center text-sm leading-tight">
        {phase === "pre-luggage" ? "Grab your bags!" : "Head to Keystone."}
      </div>

      {phase === "pre-luggage" ? (
        <>
          <button
            type="button"
            onClick={startLuggageMinigame}
            className="absolute left-[2%] top-[73%] flex h-[25%] w-[26%] cursor-pointer items-center justify-center overflow-hidden px-1 text-center text-base leading-tight hover:bg-amber-900/10"
          >
            1. Start luggage minigame!
          </button>
          <button
            type="button"
            onClick={skipLuggage}
            className="absolute left-[30%] top-[73%] h-[8.33%] w-[68%] cursor-pointer overflow-hidden text-left text-base leading-tight hover:bg-amber-900/10"
          >
            2. Skip minigame
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={headToParking}
            className="absolute left-[2%] top-[73%] flex h-[25%] w-[26%] cursor-pointer items-center justify-center overflow-hidden px-1 text-center text-base leading-tight hover:bg-amber-900/10"
          >
            1. Head out to parking
          </button>
          <button
            type="button"
            onClick={() => onShowOverlay?.("status")}
            className="absolute left-[30%] top-[73%] h-[6.25%] w-[68%] cursor-pointer overflow-hidden text-left text-base leading-tight hover:bg-amber-900/10"
          >
            2. Check your status
          </button>
          <button
            type="button"
            onClick={talkToCrew}
            className="absolute left-[30%] top-[79.25%] h-[6.25%] w-[68%] cursor-pointer overflow-hidden text-left text-base leading-tight hover:bg-amber-900/10"
          >
            3. Talk to the crew
          </button>
        </>
      )}

      {entryMessage && (
        <OverlayPanel body={entryMessage} onDismiss={() => setEntryMessage(null)} />
      )}
      {!entryMessage && pendingLuggageLoss && (
        <OverlayPanel
          body="You're missing a bag."
          options={[
            {
              label: "Pay $100 to rush it to the cabin tonight",
              onSelect: payLuggageBuyback,
              disabled: playthrough.money < 100,
            },
            { label: "Deal with it", onSelect: dealWithLuggageLoss },
          ]}
        />
      )}
      {!entryMessage && !pendingLuggageLoss && message && (
        <OverlayPanel body={message} onDismiss={() => setMessage(null)} />
      )}
    </div>
  );
}

export default DenverAirport;
