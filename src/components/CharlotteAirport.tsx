import { useState } from "react";
import { foodOptions } from "../data/store-items";
import { applySpend } from "../game/economy";
import { rollBroEvent, rollFlightDelay } from "../game/rolls";
import type { SegmentProps } from "../game/types";
import { useOnEntry } from "../game/useOnEntry";
import OverlayPanel from "./shared/OverlayPanel";

const charlotteAirportImg = "/images/segment-1-charlotte-airport.png";

// BALANCE-PATCH-2026-09-05, new — § 3.3 purchase cap, 2 meals per visit.
const FOOD_PURCHASE_CAP = 2;

type Overlay = "entry-events" | "food" | "talk" | null;

function CharlotteAirport({ playthrough, onUpdate, onShowOverlay }: SegmentProps) {
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [entryMessages, setEntryMessages] = useState<string[]>([]);
  const [foodPurchases, setFoodPurchases] = useState(0);

  useOnEntry(() => {
    const messages: string[] = [];
    let vibeDelta = 0;
    let lostSkiDay = playthrough.lostSkiDay;

    if (rollFlightDelay(playthrough.flightTime)) {
      messages.push("Your flight's delayed — you won't land in Denver until tomorrow.");
      vibeDelta -= 15;
      lostSkiDay = true;
    }

    const broEvent = rollBroEvent();
    if (broEvent) {
      messages.push(broEvent.message);
      vibeDelta += broEvent.vibeDelta;
    }

    // BALANCE-PATCH-2026-09-05, new: § 3.10 hunger decay, -20 on entry.
    onUpdate((prev) => ({
      ...prev,
      vibePoints: prev.vibePoints + vibeDelta,
      hungerLevel: Math.max(0, prev.hungerLevel - 20),
      lostSkiDay,
      eventLog: messages.length > 0 ? [...prev.eventLog, ...messages] : prev.eventLog,
    }));

    if (messages.length > 0) {
      setEntryMessages(messages);
      setOverlay("entry-events");
    }
  });

  function buyFood(optionId: "standard" | "risky") {
    if (foodPurchases >= FOOD_PURCHASE_CAP) return;
    const food = foodOptions.find((f) => f.id === optionId)!;
    onUpdate((prev) => {
      const spend = applySpend(prev, food.cost);
      return {
        ...prev,
        money: spend.money,
        vibePoints: prev.vibePoints + food.vibeDelta + spend.vibeDelta,
        hungerLevel: Math.min(100, prev.hungerLevel + food.hungerRestore),
        foodRiskCounter: prev.foodRiskCounter + food.foodRiskIncrement,
        wentBrokeTriggered: spend.wentBrokeTriggered,
        eventLog: spend.eventLogAppend ? [...prev.eventLog, spend.eventLogAppend] : prev.eventLog,
      };
    });
    setFoodPurchases((prev) => prev + 1);
    setOverlay(null);
  }

  function headToGate() {
    onUpdate((prev) => ({ ...prev, currentSegment: "inflight" }));
  }

  return (
    <div className="relative mx-auto aspect-square w-full max-w-xl select-none text-amber-950">
      <img
        src={charlotteAirportImg}
        alt="Charlotte airport"
        className="h-full w-full"
        draggable={false}
      />

      <div className="absolute left-[2%] top-[62%] flex h-[9%] w-[96%] items-center justify-center overflow-hidden px-2 text-center text-base leading-tight">
        You meet up with the crew at Charlotte airport. Time to head to Denver.
      </div>

      <button
        type="button"
        onClick={headToGate}
        className="absolute left-[2%] top-[73%] flex h-[25%] w-[25%] cursor-pointer items-center justify-center px-1 text-center text-base leading-tight hover:bg-amber-900/10"
      >
        1. Head to gate
      </button>
      <button
        type="button"
        onClick={() => setOverlay("food")}
        className="absolute left-[29%] top-[73%] h-[6.25%] w-[69%] cursor-pointer text-left text-lg hover:bg-amber-900/10"
      >
        2. Grab some grub
      </button>
      <button
        type="button"
        onClick={() => onShowOverlay?.("map")}
        className="absolute left-[29%] top-[79.25%] h-[6.25%] w-[69%] cursor-pointer text-left text-lg hover:bg-amber-900/10"
      >
        3. Look at map
      </button>
      <button
        type="button"
        onClick={() => setOverlay("talk")}
        className="absolute left-[29%] top-[85.5%] h-[6.25%] w-[69%] cursor-pointer text-left text-lg hover:bg-amber-900/10"
      >
        4. Talk to the bros
      </button>

      {overlay === "entry-events" && (
        <OverlayPanel body={entryMessages} onDismiss={() => setOverlay(null)} />
      )}

      {overlay === "food" && (
        <OverlayPanel
          body="Grab some grub before the flight:"
          options={[
            ...foodOptions.map((food) => ({
              label: `${food.label} — $${food.cost}`,
              onSelect: () => buyFood(food.id),
              disabled: foodPurchases >= FOOD_PURCHASE_CAP,
            })),
            { label: "Back", onSelect: () => setOverlay(null) },
          ]}
        />
      )}

      {overlay === "talk" && (
        <OverlayPanel
          body="You catch up with the guys — same old stories, already feels like the trip's started."
          onDismiss={() => setOverlay(null)}
        />
      )}
    </div>
  );
}

export default CharlotteAirport;
