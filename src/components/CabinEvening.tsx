import { useState } from "react";
import { foodOptions, getFoodLabel } from "../data/store-items";
import { applySpend } from "../game/economy";
import { rollBroEvent, rollDoctorAttempt } from "../game/rolls";
import type { SegmentProps } from "../game/types";
import { useOnEntry } from "../game/useOnEntry";
import OverlayPanel from "./shared/OverlayPanel";

const cabinEveningImg = "/images/segment-7-cabin-evening.png";
const dukeUncImg = "/images/special-duke-unc-game.png";

// § 10: dinner is once-per-visit (was 2). § 15: "Hang Out by the Fire" (and
// its once-per-visit cap, and its own separate bro-event roll below) is
// removed entirely, replaced by Check Status — the on-entry roll here is
// unaffected, still fires exactly like every other segment's.
const FOOD_PURCHASE_CAP = 1;

type Overlay = "dinner" | "injury" | null;
type View = "main" | "duke-unc";

function CabinEvening({ playthrough, onUpdate, onShowOverlay }: SegmentProps) {
  const [view, setView] = useState<View>("main");
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [entryMessage, setEntryMessage] = useState<string | null>(null);
  const [foodPurchases, setFoodPurchases] = useState(0);
  const [injuryCheckUsed, setInjuryCheckUsed] = useState(false);

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
        mealsEaten: prev.mealsEaten + 1,
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
      if (!prev.injury) return { ...prev, vibePoints: prev.vibePoints - 2 };
      if (outcome === "full-recovery") {
        return { ...prev, vibePoints: prev.vibePoints - 2, injury: null };
      }
      if (outcome === "partial-recovery") {
        return {
          ...prev,
          vibePoints: prev.vibePoints - 2,
          injury: { ...prev.injury, dailyPenalty: Math.max(1, Math.floor(prev.injury.dailyPenalty / 2)) },
        };
      }
      return { ...prev, vibePoints: prev.vibePoints - 2 };
    });
    const text =
      outcome === "full-recovery"
        ? "The first-aid kit earns its keep. You're back to normal."
        : outcome === "partial-recovery"
          ? "Not a full fix, but it helps some."
          : "No luck this time. Still hurting.";
    setOverlay(null);
    setInjuryCheckUsed(true);
    setMessage(text);
  }

  function restItOff() {
    setOverlay(null);
    setInjuryCheckUsed(true);
    setMessage("You decide to tough it out.");
  }

  // § 15/§ 17: moved here from cabin-arrival. Same dukeUncResolved-gated,
  // once-per-game behavior as before, now also gated to Friday specifically
  // (§ 17) — the button itself is disabled otherwise, so this is only ever
  // called while still available.
  function watchDukeUnc() {
    setView("duke-unc");
  }

  // § 18: redesigned, not just rescaled — cheering the underdog (Duke) and
  // being RIGHT used to cost more (-10) than being wrong (-5), which read as
  // backwards. Now correctly calling the upset pays off, and every penalty
  // is softer across the board.
  function resolveDukeUnc(choice: "unc" | "duke" | "neutral") {
    const uncWins = Math.random() < 0.5;
    let vibeDelta = 0;
    let line: string;
    let winBonus = false;

    if (choice === "unc") {
      if (uncWins) {
        vibeDelta = 5;
        winBonus = true;
        line = "UNC pulls it out! The cabin erupts. Parker, put your shirt back on!";
      } else {
        vibeDelta = -2;
        line = "Duke wins. Rough night for the UNC fans in the room.";
      }
    } else if (choice === "duke") {
      vibeDelta = uncWins ? -3 : 8;
      line = uncWins
        ? "UNC wins. You cheered for Duke anyway — respect, but the room won't let you forget it. Parker, put your shirt back on!"
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

  // § 10: renamed from "Rest for the Night" — always advances to the next
  // ski day now. Saturday evening never reaches this screen at all (§ 11
  // routes straight from walk-to-cabin to the new final screen instead), so
  // the old isLastEvening -> journey-home branch is gone.
  function restForNight() {
    onUpdate((prev) => {
      // § 18: dailyPenalty is stored as a negative number (see SkiDay.tsx/
      // DriveProgress.tsx), so this needs to ADD it to genuinely subtract —
      // `vibePoints - dailyPenalty` was silently granting vibe back every
      // evening instead of costing any.
      const dailyPenalty = prev.injury ? prev.injury.dailyPenalty : 0;
      const nextDay = prev.currentSkiDay === "thursday" ? "friday" : "saturday";
      return {
        ...prev,
        vibePoints: prev.vibePoints + dailyPenalty,
        currentSegment: "walk-to-resort",
        currentSkiDay: nextDay,
      };
    });
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

  return (
    <div className="relative mx-auto aspect-square w-full max-w-xl select-none text-amber-950">
      <img src={cabinEveningImg} alt="Cabin evening" className="h-full w-full" draggable={false} />

      <div className="absolute left-[3%] top-[58%] flex h-[39%] w-[94%] flex-col justify-center gap-1 overflow-hidden px-2 text-lg leading-tight">
        <p>EVENING AT THE CABIN</p>
        <p className="text-base italic">Sore in odd places</p>
        <button
          type="button"
          onClick={() => setOverlay("dinner")}
          disabled={foodPurchases >= FOOD_PURCHASE_CAP}
          className="mt-0.5 cursor-pointer text-left hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          1. Have Dinner with the Crew
        </button>
        <button type="button" onClick={() => onShowOverlay?.("status")} className="cursor-pointer text-left hover:text-amber-700">
          2. Check Status
        </button>
        <button
          type="button"
          onClick={() => setOverlay("injury")}
          disabled={!playthrough.injury || injuryCheckUsed}
          className="cursor-pointer text-left hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          3. Check on Injuries
        </button>
        <button
          type="button"
          onClick={watchDukeUnc}
          disabled={playthrough.dukeUncResolved || playthrough.currentSkiDay !== "friday"}
          className="cursor-pointer text-left hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          4. Watch UNC vs DUKE
        </button>
        <button type="button" onClick={restForNight} className="cursor-pointer text-left hover:text-amber-700">
          5. Rest and hit the slopes
        </button>
      </div>

      {entryMessage && (
        <OverlayPanel body={entryMessage} onDismiss={() => setEntryMessage(null)} />
      )}

      {!entryMessage && overlay === "dinner" && (
        <OverlayPanel
          options={[
            {
              label: `${getFoodLabel("standard")} — $20/meal`,
              onSelect: () => buyDinner("standard"),
              disabled: playthrough.money < 20 || foodPurchases >= FOOD_PURCHASE_CAP,
            },
            {
              label: `${getFoodLabel("risky")} — $15/meal`,
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
            { label: "See the doctor (-2 vibe)", onSelect: seeDoctor },
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
