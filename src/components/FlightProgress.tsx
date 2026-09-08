import { useEffect, useRef, useState } from "react";
import { hungerTiers } from "../data/hunger-tiers";
import { foodOptions, getFoodLabel } from "../data/store-items";
import { applySpend } from "../game/economy";
import { rollFlightDelay } from "../game/rolls";
import type { SegmentProps } from "../game/types";
import { useOnEntry } from "../game/useOnEntry";
import FlightRun from "./FlightRun";
import OverlayPanel from "./shared/OverlayPanel";
import ProgressStatusBar from "./shared/ProgressStatusBar";

const FLIGHT_HOURS = 5;
const MS_PER_HOUR = 3000; // § 7: was 4000 — 5s shorter overall (20s -> 15s)
const FLIGHT_DURATION_MS = FLIGHT_HOURS * MS_PER_HOUR;
const START_SPAWN_PER_SEC = 0.8;
const END_SPAWN_PER_SEC = 1.6;
const ARRIVAL_PAUSE_MS = 900;
const COLLISION_MESSAGE_MS = 1800;

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

/**
 * § 1: the flight is a real dodge mini-game (FlightRun), mirroring how the
 * drive wraps DriveRun. § 5: a collision is no longer terminal — FlightRun
 * resumes on its own after each hit (mirroring the drive), so this component
 * just reports every hit via `onCollision` and only ever transitions segments
 * on a genuine landing (`onFinish`).
 */
function FlightProgress({ playthrough, onUpdate }: SegmentProps) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [entryMessages, setEntryMessages] = useState<string[]>([]);
  const [foodPurchases, setFoodPurchases] = useState(0);
  const [landed, setLanded] = useState(false);
  const [collisionMessage, setCollisionMessage] = useState<string | null>(null);
  const [weather] = useState(() => WEATHER_FLAVOR[Math.floor(Math.random() * WEATHER_FLAVOR.length)]);
  const lastHourTicked = useRef(0);
  const outcomeApplied = useRef(false);

  // § 4: only the flight-delay roll lives here now — the random bro-event
  // popup is dropped for this screen (the delay message is the only popup
  // this segment should ever show on entry).
  useOnEntry(() => {
    if (!rollFlightDelay(playthrough.flightTime)) return;
    const message = "Your flight's delayed — you won't land in Denver until tomorrow.";
    onUpdate((prev) => ({
      ...prev,
      vibePoints: prev.vibePoints - 8,
      lostSkiDay: true,
      eventLog: [...prev.eventLog, message],
    }));
    setEntryMessages([message]);
    setOverlay("entry-events");
  });

  function handleTick(ms: number) {
    setElapsedMs(ms);
  }

  // Reacts to `elapsedMs` rather than living inside a setState updater —
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

  function handleFinish() {
    if (outcomeApplied.current) return;
    outcomeApplied.current = true;
    setLanded(true);
  }

  // § 5: repeatable now — every hit applies a small vibe penalty and shows a
  // brief non-blocking message, but the flight just keeps going (FlightRun
  // resumes on its own after the smoke clears). Only `handleFinish` (a real
  // landing) is guarded as one-shot.
  function handleCollision() {
    onUpdate((prev) => ({
      ...prev,
      vibePoints: prev.vibePoints - 5,
      eventLog: [...prev.eventLog, "Heavy Air Traffic, Going To Be A Late Landing"],
    }));
    setCollisionMessage("Heavy Air Traffic, Going To Be A Late Landing");
  }

  useEffect(() => {
    if (!landed) return;
    const timer = setTimeout(() => {
      onUpdate((prev) => ({ ...prev, currentSegment: "denver-airport" }));
    }, ARRIVAL_PAUSE_MS);
    return () => clearTimeout(timer);
  }, [landed, onUpdate]);

  useEffect(() => {
    if (!collisionMessage) return;
    const timer = setTimeout(() => setCollisionMessage(null), COLLISION_MESSAGE_MS);
    return () => clearTimeout(timer);
  }, [collisionMessage]);

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

  const hoursRemaining = Math.max(0, FLIGHT_HOURS - Math.floor(elapsedMs / MS_PER_HOUR));

  return (
    <div className="relative mx-auto aspect-square w-full max-w-xl select-none text-amber-950">
      <FlightRun
        durationMs={FLIGHT_DURATION_MS}
        startSpawnPerSec={START_SPAWN_PER_SEC}
        endSpawnPerSec={END_SPAWN_PER_SEC}
        paused={overlay !== null}
        onTick={handleTick}
        onCollision={handleCollision}
        onFinish={handleFinish}
      />

      {overlay === null && !landed && !collisionMessage && (
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
              label: `${getFoodLabel(food.id)} — $${food.cost}`,
              onSelect: () => buyFood(food.id),
              disabled: foodPurchases >= FOOD_PURCHASE_CAP || playthrough.money < food.cost,
            })),
            { label: "Back", onSelect: () => setOverlay(null) },
          ]}
        />
      )}

      {overlay === null && collisionMessage && <OverlayPanel body={collisionMessage} />}
    </div>
  );
}

export default FlightProgress;
