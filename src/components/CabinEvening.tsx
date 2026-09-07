import { useState } from "react";
import { foodOptions } from "../data/store-items";
import { applySpend } from "../game/economy";
import { rollBroEvent, rollDoctorAttempt } from "../game/rolls";
import type { SegmentProps } from "../game/types";
import { useOnEntry } from "../game/useOnEntry";
import OverlayPanel from "./shared/OverlayPanel";

const cabinEveningImg = "/images/segment-7-cabin-evening.png";

// BALANCE-PATCH-2026-09-05, new — § 3.3 purchase cap, 2 meals per visit.
const FOOD_PURCHASE_CAP = 2;

type Overlay = "dinner" | "injury" | null;

function CabinEvening({ playthrough, onUpdate }: SegmentProps) {
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [entryMessage, setEntryMessage] = useState<string | null>(null);
  const [foodPurchases, setFoodPurchases] = useState(0);

  useOnEntry(() => {
    onUpdate((prev) => ({ ...prev, restUsedThisVisit: false }));

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

  function hangOutByFire() {
    const broEvent = rollBroEvent();
    if (broEvent) {
      onUpdate((prev) => ({
        ...prev,
        vibePoints: prev.vibePoints + broEvent.vibeDelta,
        eventLog: [...prev.eventLog, broEvent.message],
      }));
      setMessage(broEvent.message);
    } else {
      setMessage(
        "You catch up with the guys — same old stories, already feels like the trip's started.",
      );
    }
  }

  function buyDinner(optionId: "standard" | "risky") {
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
        foodRiskCounter: prev.foodRiskCounter + food.foodRiskIncrement,
        wentBrokeTriggered: spend.wentBrokeTriggered,
        eventLog: spend.eventLogAppend ? [...prev.eventLog, spend.eventLogAppend] : prev.eventLog,
      };
    });
    setFoodPurchases((prev) => prev + 1);
    setOverlay(null);
  }

  // BALANCE-PATCH-2026-09-05: cost was -5 vibe, see § 3.5.
  function seeDoctor() {
    const outcome = rollDoctorAttempt();
    onUpdate((prev) => {
      if (!prev.injury) return { ...prev, vibePoints: prev.vibePoints - 3 };
      if (outcome === "full-recovery") {
        return { ...prev, vibePoints: prev.vibePoints - 3, injury: null };
      }
      if (outcome === "partial-recovery") {
        return {
          ...prev,
          vibePoints: prev.vibePoints - 3,
          injury: { ...prev.injury, dailyPenalty: Math.max(1, Math.floor(prev.injury.dailyPenalty / 2)) },
        };
      }
      return { ...prev, vibePoints: prev.vibePoints - 3 };
    });
    const text =
      outcome === "full-recovery"
        ? "The first-aid kit earns its keep. You're back to normal."
        : outcome === "partial-recovery"
          ? "Not a full fix, but it helps some."
          : "No luck this time. Still hurting.";
    setOverlay(null);
    setMessage(text);
  }

  function restItOff() {
    setOverlay(null);
    setMessage("You decide to tough it out.");
  }

  function restForNight() {
    onUpdate((prev) => {
      const dailyPenalty = prev.injury ? prev.injury.dailyPenalty : 0;
      const isLastEvening = prev.currentSkiDay === "saturday";
      const nextDay = prev.currentSkiDay === "thursday" ? "friday" : "saturday";
      return {
        ...prev,
        vibePoints: prev.vibePoints - dailyPenalty,
        currentSegment: isLastEvening ? "journey-home" : "walk-to-resort",
        currentSkiDay: isLastEvening ? prev.currentSkiDay : nextDay,
      };
    });
  }

  return (
    <div className="relative mx-auto aspect-square w-full max-w-xl select-none text-amber-950">
      <img src={cabinEveningImg} alt="Cabin evening" className="h-full w-full" draggable={false} />

      <div className="absolute left-[3%] top-[58%] flex h-[39%] w-[94%] flex-col justify-center gap-1 overflow-hidden px-2 text-lg leading-tight">
        <p>EVENING AT THE CABIN</p>
        <p className="text-base italic">Sore in odd places</p>
        <button
          type="button"
          onClick={() => setOverlay("dinner")}
          className="mt-0.5 cursor-pointer text-left hover:text-amber-700"
        >
          1. Have Dinner with the Crew
        </button>
        <button type="button" onClick={hangOutByFire} className="cursor-pointer text-left hover:text-amber-700">
          2. Hang Out by the Fire
        </button>
        <button
          type="button"
          onClick={() => setOverlay("injury")}
          disabled={!playthrough.injury}
          className="cursor-pointer text-left hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          3. Check on Injuries
        </button>
        <button type="button" onClick={restForNight} className="cursor-pointer text-left hover:text-amber-700">
          4. Rest for the Night
        </button>
      </div>

      {entryMessage && (
        <OverlayPanel body={entryMessage} onDismiss={() => setEntryMessage(null)} />
      )}

      {!entryMessage && overlay === "dinner" && (
        <OverlayPanel
          options={[
            {
              label: "Standard — $20/meal",
              onSelect: () => buyDinner("standard"),
              disabled: playthrough.money < 20 || foodPurchases >= FOOD_PURCHASE_CAP,
            },
            {
              label: "Spicy/Risky — $15/meal",
              onSelect: () => buyDinner("risky"),
              disabled: playthrough.money < 15 || foodPurchases >= FOOD_PURCHASE_CAP,
            },
            { label: "Back", onSelect: () => setOverlay(null) },
          ]}
        />
      )}

      {!entryMessage && overlay === "injury" && (
        <OverlayPanel
          options={[
            { label: "See the doctor (-3 vibe)", onSelect: seeDoctor },
            { label: "Rest it off (tough it out)", onSelect: restItOff },
          ]}
        />
      )}

      {!entryMessage && !overlay && message && (
        <OverlayPanel body={message} onDismiss={() => setMessage(null)} />
      )}
    </div>
  );
}

export default CabinEvening;
