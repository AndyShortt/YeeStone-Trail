import { useEffect, useRef, useState } from "react";
import { hungerTiers } from "../data/hunger-tiers";
import { rollFlightDelay } from "../game/rolls";
import { rollInjurySeverity, upgradeSeverity } from "../game/ski";
import type { SegmentProps } from "../game/types";
import { useOnEntry } from "../game/useOnEntry";
import FlightRun from "./FlightRun";
import OverlayPanel from "./shared/OverlayPanel";
import ProgressStatusBar from "./shared/ProgressStatusBar";

const FLIGHT_HOURS = 5;
const MS_PER_HOUR = 3600; // was 3000 (originally 4000, § 7) — +3s overall (15s -> 18s)
const FLIGHT_DURATION_MS = FLIGHT_HOURS * MS_PER_HOUR;
const START_SPAWN_PER_SEC = 0.8;
const END_SPAWN_PER_SEC = 1.6;
const ARRIVAL_PAUSE_MS = 900;
const COLLISION_MESSAGE_MS = 1800;

const WEATHER_FLAVOR = ["Clear skies", "Bumpy air", "Tailwind", "Smooth cruising"];
// Deliberately mild — a collision used to be framed as a "crash" both
// visually and in this message; neither should ever read that severely (the
// plane keeps flying, see FlightRun.tsx's tail-smoke instead of a burst).
const COLLISION_FLAVOR = ["Getting bumpy — hang on!", "Watch out for flying objects!"];
const INJURY_NAME: Record<"minor" | "moderate", string> = {
  minor: "twisted ankle",
  moderate: "banged-up knee",
};

function getHungerLabel(hunger: number): string {
  const tier = hungerTiers.find((t) => hunger >= t.min);
  return tier ? tier.label : hungerTiers[hungerTiers.length - 1].label;
}

function getHealthLabel({ injury }: { injury: { severity: "minor" | "moderate" } | null }): string {
  if (!injury) return "No injuries";
  return injury.severity === "minor" ? "Minor injury" : "Moderate injury";
}

type Overlay = "entry-events" | null;

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
  const [landed, setLanded] = useState(false);
  const [collisionMessage, setCollisionMessage] = useState<string | null>(null);
  const [weather] = useState(() => WEATHER_FLAVOR[Math.floor(Math.random() * WEATHER_FLAVOR.length)]);
  const lastHourTicked = useRef(0);
  const outcomeApplied = useRef(false);
  // A fresh instance mounts every time the player enters this segment, so
  // this naturally resets per flight — the first hit applies an injury, any
  // further hits in the same flight stay flavor-only (no compounding).
  const hasInjuredThisFlight = useRef(false);

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
  // landing) is guarded as one-shot. Unlike vibe, the injury itself doesn't
  // compound per hit — only the first collision in a given flight rolls one
  // (capped at moderate, same as the drive), same reasoning DriveProgress.tsx
  // uses for its own injury upgrade, just capped to once here instead of
  // stacking every hit.
  function handleCollision() {
    const flavor = COLLISION_FLAVOR[Math.floor(Math.random() * COLLISION_FLAVOR.length)];

    if (hasInjuredThisFlight.current) {
      onUpdate((prev) => ({
        ...prev,
        vibePoints: prev.vibePoints - 5,
        eventLog: [...prev.eventLog, flavor],
      }));
      setCollisionMessage(flavor);
      return;
    }

    hasInjuredThisFlight.current = true;
    const rolled = rollInjurySeverity();
    const capped = rolled === "severe" ? "moderate" : rolled;
    const finalSeverity = upgradeSeverity(playthrough.injury?.severity ?? null, capped);
    const dailyPenalty = finalSeverity === "moderate" ? -2 : -1;
    const message = `${flavor} ${INJURY_NAME[finalSeverity]} (${finalSeverity}).`;

    onUpdate((prev) => ({
      ...prev,
      vibePoints: prev.vibePoints - 5,
      injury: { severity: finalSeverity, dailyPenalty, treated: false },
      eventLog: [...prev.eventLog, message],
    }));
    setCollisionMessage(message);
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

      {overlay === null && collisionMessage && <OverlayPanel body={collisionMessage} />}
    </div>
  );
}

export default FlightProgress;
