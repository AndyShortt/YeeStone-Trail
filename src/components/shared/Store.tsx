import { useState } from "react";
import { foodOptions, getFoodLabel, storeItems } from "../../data/store-items";
import { applySpend } from "../../game/economy";
import type { GamePlaythrough } from "../../game/types";

const storeImg = "/images/special-store-walter.png";

// BALANCE-PATCH-2026-09-05, new — § 3.3 purchase cap, 2 per category per store visit.
const PURCHASE_CAP = 2;

interface StoreProps {
  playthrough: GamePlaythrough;
  onUpdate: (updater: (prev: GamePlaythrough) => GamePlaythrough) => void;
  onLeave: () => void;
}

function Store({ playthrough, onUpdate, onLeave }: StoreProps) {
  const [showFood, setShowFood] = useState(false);
  const [purchaseCounts, setPurchaseCounts] = useState({ food: 0, drinks: 0, snacks: 0 });

  function buyFood(optionId: "standard" | "risky") {
    if (purchaseCounts.food >= PURCHASE_CAP) return;
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
    setPurchaseCounts((prev) => ({ ...prev, food: prev.food + 1 }));
    setShowFood(false);
  }

  function buyItem(itemId: "drinks" | "snacks" | "gear") {
    if (itemId !== "gear" && purchaseCounts[itemId] >= PURCHASE_CAP) return;
    const item = storeItems.find((i) => i.id === itemId)!;
    if (playthrough.money < item.cost) return;
    if (item.oneTime && playthrough.thermalWearPurchased) return;
    onUpdate((prev) => {
      const spend = applySpend(prev, item.cost);
      return {
        ...prev,
        money: spend.money,
        vibePoints: prev.vibePoints + item.vibeDelta + spend.vibeDelta,
        thermalWearPurchased: item.id === "gear" ? true : prev.thermalWearPurchased,
        wentBrokeTriggered: spend.wentBrokeTriggered,
        eventLog: spend.eventLogAppend ? [...prev.eventLog, spend.eventLogAppend] : prev.eventLog,
      };
    });
    if (itemId !== "gear") {
      setPurchaseCounts((prev) => ({ ...prev, [itemId]: prev[itemId] + 1 }));
    }
  }

  return (
    <div className="relative mx-auto aspect-square w-full max-w-xl select-none text-amber-950">
      <img src={storeImg} alt="Walter's supply stash" className="h-full w-full" draggable={false} />

      <div className="absolute left-[3%] top-[58%] flex h-[39%] w-[94%] flex-col justify-center gap-1 overflow-hidden px-2 text-lg leading-tight">
        {!showFood ? (
          <>
            <p className="mb-0.5 italic">"Let's get you all set up."</p>
            <button
              type="button"
              onClick={() => setShowFood(true)}
              disabled={purchaseCounts.food >= PURCHASE_CAP}
              className="cursor-pointer text-left hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              1. Food
            </button>
            <button
              type="button"
              onClick={() => buyItem("drinks")}
              disabled={playthrough.money < 5 || purchaseCounts.drinks >= PURCHASE_CAP}
              className="cursor-pointer text-left hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              2. Drinks (Beer) — $5
            </button>
            <button
              type="button"
              onClick={() => buyItem("snacks")}
              disabled={playthrough.money < 10 || purchaseCounts.snacks >= PURCHASE_CAP}
              className="cursor-pointer text-left hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              3. Snacks — $10
            </button>
            <button
              type="button"
              onClick={() => buyItem("gear")}
              disabled={playthrough.thermalWearPurchased || playthrough.money < 30}
              className="cursor-pointer text-left hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              4. Gear (Thermal Wear) — $30{playthrough.thermalWearPurchased ? " (owned)" : ""}
            </button>
            <button
              type="button"
              onClick={onLeave}
              className="cursor-pointer text-left hover:text-amber-700"
            >
              5. Leave
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => buyFood("standard")}
              disabled={playthrough.money < 20}
              className="cursor-pointer text-left hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              a. {getFoodLabel("standard")} — $20/meal
            </button>
            <button
              type="button"
              onClick={() => buyFood("risky")}
              disabled={playthrough.money < 15}
              className="cursor-pointer text-left hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              b. {getFoodLabel("risky")} — $15/meal
            </button>
            <button
              type="button"
              onClick={() => setShowFood(false)}
              className="cursor-pointer text-left hover:text-amber-700"
            >
              Back
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default Store;
