import { useState } from "react";
import { pickCrewTip } from "../data/crew-tips";
import { foodOptions, getFoodLabel } from "../data/store-items";
import { applySpend } from "../game/economy";
import { rollBroEvent } from "../game/rolls";
import type { SegmentProps } from "../game/types";
import { useOnEntry } from "../game/useOnEntry";
import OverlayPanel from "./shared/OverlayPanel";

const denverAirportImg = "/images/segment-3-denver-airport.png";

const FOOD_PURCHASE_CAP = 2;

type Overlay = "entry-events" | "snack" | null;

function DenverAirport({ playthrough, onUpdate, onShowOverlay }: SegmentProps) {
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [entryMessage, setEntryMessage] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [foodPurchases, setFoodPurchases] = useState(0);

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

  function buyFood(optionId: "standard" | "risky") {
    if (foodPurchases >= FOOD_PURCHASE_CAP) return;
    const food = foodOptions.find((f) => f.id === optionId)!;
    if (playthrough.money < food.cost) return;
    onUpdate((prev) => {
      const spend = applySpend(prev, food.cost);
      return {
        ...prev,
        money: spend.money,
        vibePoints: prev.vibePoints + food.vibeDelta + spend.vibeDelta,
        hungerLevel: Math.min(100, prev.hungerLevel + food.hungerRestore),
        mealsEaten: prev.mealsEaten + 1,
        wentBrokeTriggered: spend.wentBrokeTriggered,
        eventLog: spend.eventLogAppend ? [...prev.eventLog, spend.eventLogAppend] : prev.eventLog,
      };
    });
    setFoodPurchases((prev) => prev + 1);
    setOverlay(null);
  }

  function headToParking() {
    onUpdate((prev) => ({ ...prev, currentSegment: "drive-progress" }));
  }

  // § 10: renamed "Tips from the guys" — rotating pool instead of one static line.
  function talkToCrew() {
    setMessage(pickCrewTip());
  }

  return (
    <div className="relative mx-auto aspect-square w-full max-w-xl select-none text-amber-950">
      <img src={denverAirportImg} alt="Denver airport" className="h-full w-full" draggable={false} />

      <div className="absolute left-[2%] top-[1%] flex h-[17%] w-[96%] flex-col items-center justify-center gap-0.5 overflow-hidden px-1 text-center leading-tight">
        <p className="text-2xl">Welcome to Denver!</p>
        <p className="text-sm">Grab Bags/Snacks Then Hit The Road</p>
      </div>

      {/* § 8: regenerated as one simple panel (took 3 attempts — the model
          kept reproducing the old square+3-strips grid until the prompt
          explicitly named and forbade that exact pattern). */}
      <div className="absolute left-[2%] top-[73%] flex h-[25%] w-[96%] flex-col justify-center gap-2 overflow-hidden px-2 text-xl leading-tight">
        <button type="button" onClick={() => setOverlay("snack")} className="cursor-pointer text-left hover:text-amber-700">
          1. Shop for snacks
        </button>
        <button type="button" onClick={headToParking} className="cursor-pointer text-left hover:text-amber-700">
          2. Hit the road
        </button>
        <button type="button" onClick={() => onShowOverlay?.("status")} className="cursor-pointer text-left hover:text-amber-700">
          3. Check status
        </button>
        <button type="button" onClick={talkToCrew} className="cursor-pointer text-left hover:text-amber-700">
          4. Tips from the guys
        </button>
      </div>

      {entryMessage && (
        <OverlayPanel body={entryMessage} onDismiss={() => setEntryMessage(null)} />
      )}

      {!entryMessage && overlay === "snack" && (
        <OverlayPanel
          body="Grab a snack before you hit the road:"
          options={[
            ...foodOptions.map((food) => ({
              label: `${getFoodLabel(food.id)} — $${food.cost}`,
              onSelect: () => buyFood(food.id),
              disabled: foodPurchases >= FOOD_PURCHASE_CAP || playthrough.money < food.cost,
            })),
            { label: "Back", onSelect: () => setOverlay(null) },
          ]}
        />
      )}

      {!entryMessage && overlay !== "snack" && message && (
        <OverlayPanel body={message} onDismiss={() => setMessage(null)} />
      )}
    </div>
  );
}

export default DenverAirport;
