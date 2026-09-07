import { useEffect, useRef, useState } from "react";
import { hungerTiers } from "../data/hunger-tiers";
import { foodOptions } from "../data/store-items";
import { applySpend } from "../game/economy";
import { rollBroEvent, rollFlightDelay } from "../game/rolls";
import type { SegmentProps } from "../game/types";
import { useOnEntry } from "../game/useOnEntry";
import OverlayPanel from "./shared/OverlayPanel";
import ProgressStatusBar from "./shared/ProgressStatusBar";
import TravelScene from "./shared/TravelScene";

const bgImg = "/images/progress-flight-bg.png";
const planeImg = "/images/progress-plane.png";
const denverIconImg = "/images/progress-denver-airport-icon.png";

const FLIGHT_HOURS = 5;
const MS_PER_HOUR = 4000;
const FLIGHT_DURATION_MS = FLIGHT_HOURS * MS_PER_HOUR;
const TICK_INTERVAL_MS = 200;
const ARRIVAL_PAUSE_MS = 900;

const FOOD_PURCHASE_CAP = 2;

const WEATHER_FLAVOR = ["Clear skies", "Bumpy air", "Tailwind", "Smooth cruising"];

function getHungerLabel(hunger: number): string {
  const tier = hungerTiers.find((t) => hunger >= t.min);
  return tier ? tier.label : hungerTiers[hungerTiers.length - 1].label;
}

function getHealthLabel({ injury }: { injury: { severity: "minor" | "moderate" } | null }): string {
  if (!injury) return "No injuries";
  return injury.severity === "minor" ? "Minor injury" : "Moderate injury";
}

type Overlay = "entry-events" | "snack" | null;

function FlightProgress({ playthrough, onUpdate }: SegmentProps) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [entryMessages, setEntryMessages] = useState<string[]>([]);
  const [foodPurchases, setFoodPurchases] = useState(0);
  const [weather] = useState(() => WEATHER_FLAVOR[Math.floor(Math.random() * WEATHER_FLAVOR.length)]);
  const lastHourTicked = useRef(0);
  const landed = elapsedMs >= FLIGHT_DURATION_MS;

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

    onUpdate((prev) => ({
      ...prev,
      vibePoints: prev.vibePoints + vibeDelta,
      lostSkiDay,
      eventLog: messages.length > 0 ? [...prev.eventLog, ...messages] : prev.eventLog,
    }));

    if (messages.length > 0) {
      setEntryMessages(messages);
      setOverlay("entry-events");
    }
  });

  // Hour-by-hour progression: -5 hunger/hr (5 total = -25 flying to Denver),
  // paused while any overlay (entry events, snack menu) is open. Only ever
  // advances its own local clock — never touches `playthrough` state here;
  // see the effect below for why that has to be a separate step.
  useEffect(() => {
    if (overlay !== null || landed) return;
    const interval = setInterval(() => {
      setElapsedMs((prev) => Math.min(FLIGHT_DURATION_MS, prev + TICK_INTERVAL_MS));
    }, TICK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [overlay, landed]);

  // Reacts to the clock above rather than living inside its updater —
  // calling `onUpdate` (App's setState) from inside another component's own
  // `setElapsedMs` updater trips React's "Cannot update a component while
  // rendering a different component" guard and silently stalls the timer.
  useEffect(() => {
    const hoursNow = Math.min(FLIGHT_HOURS, Math.floor(elapsedMs / MS_PER_HOUR));
    if (hoursNow > lastHourTicked.current) {
      const newlyTicked = hoursNow - lastHourTicked.current;
      lastHourTicked.current = hoursNow;
      onUpdate((p) => ({ ...p, hungerLevel: Math.max(0, p.hungerLevel - 5 * newlyTicked) }));
    }
  }, [elapsedMs, onUpdate]);

  useEffect(() => {
    if (!landed) return;
    const timer = setTimeout(() => {
      onUpdate((prev) => ({ ...prev, currentSegment: "denver-airport" }));
    }, ARRIVAL_PAUSE_MS);
    return () => clearTimeout(timer);
  }, [landed, onUpdate]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.key === "Enter" || e.key === " ") && overlay === null && !landed) {
        e.preventDefault();
        setOverlay("snack");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [overlay, landed]);

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

  const hoursRemaining = Math.max(0, FLIGHT_HOURS - Math.floor(elapsedMs / MS_PER_HOUR));

  return (
    <TravelScene
      bgSrc={bgImg}
      bgAlt="Flying to Denver"
      vehicleSrc={planeImg}
      vehicleAlt="Plane"
      progress={elapsedMs / FLIGHT_DURATION_MS}
      landmarkSrc={denverIconImg}
      landmarkAlt="Denver Airport"
    >
      {overlay === null && !landed && (
        <div className="absolute inset-x-0 bottom-[16%] bg-amber-950/85 px-[3%] py-1 text-center text-amber-100">
          Press ENTER to grab a snack
        </div>
      )}

      <ProgressStatusBar
        day="Wednesday"
        weather={weather}
        health={getHealthLabel(playthrough)}
        hunger={getHungerLabel(playthrough.hungerLevel)}
        nextLandmark="Denver Airport"
        progressLabel={landed ? "Arriving..." : `${hoursRemaining} hr${hoursRemaining === 1 ? "" : "s"} to Denver`}
      />

      {overlay === "entry-events" && (
        <OverlayPanel body={entryMessages} onDismiss={() => setOverlay(null)} />
      )}

      {overlay === "snack" && (
        <OverlayPanel
          body="Grab a snack from the cart:"
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
    </TravelScene>
  );
}

export default FlightProgress;
