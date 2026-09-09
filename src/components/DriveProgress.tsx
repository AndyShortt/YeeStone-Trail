import { useEffect, useRef, useState } from "react";
import { hungerTiers } from "../data/hunger-tiers";
import { getDriveConfig } from "../game/drive";
import { rollInjurySeverity, upgradeSeverity } from "../game/ski";
import type { SegmentProps } from "../game/types";
import DriveRun from "./DriveRun";
import OverlayPanel from "./shared/OverlayPanel";
import ProgressStatusBar from "./shared/ProgressStatusBar";
import WalterStop from "./shared/WalterStop";

const WEATHER_FLAVOR = ["Sunny", "Light snow", "Bluebird", "Windy mountain pass"];
// § 0 item 24: a collision used to silently roll an injury with no on-screen
// feedback at all — a QA pass found the player could arrive at the cabin
// already "moderately injured" purely from a rough drive, discoverable only
// by later opening Check Status. Now shows a brief non-blocking message
// (same pattern/duration as FlightProgress.tsx's collision message) without
// pausing the drive underneath it.
const COLLISION_MESSAGE_MS = 1800;

const INJURY_NAME: Record<"minor" | "moderate", string> = {
  minor: "twisted ankle",
  moderate: "banged-up knee",
};

function getHungerLabel(hunger: number): string {
  const tier = hungerTiers.find((t) => hunger >= t.min);
  return tier ? tier.label : hungerTiers[hungerTiers.length - 1].label;
}

function getHealthLabel(injury: { severity: "minor" | "moderate" } | null): string {
  if (!injury) return "No injuries";
  return injury.severity === "minor" ? "Minor injury" : "Moderate injury";
}

/**
 * § 5.2's driving mini-game: a real-time 3-lane dodge game standing in for
 * the Denver -> Keystone drive, wrapped with the same hour-ticking/landmark
 * framing as FlightProgress. § 11/§ 12: two independently-tuned legs (Denver
 * -> Costco/Walter's, then Costco -> cabin) instead of a single duration
 * split at a fixed 1/3 checkpoint — Walter's stop pauses the drive exactly
 * at the leg-1/leg-2 boundary.
 *
 * § 4: collisions no longer end the drive early — DriveRun resumes on its
 * own after each one (see its own comments), reporting every hit via
 * `onCollision`. This screen just stays in the dodge view for the entire
 * drive; there's no more "coasting to the destination" fallback view.
 */
function DriveProgress({ playthrough, onUpdate }: SegmentProps) {
  const config = getDriveConfig(playthrough.skiRentalLocation);
  const totalDurationMs = config.firstLegMs + config.secondLegMs;
  const hourMs = totalDurationMs / 3;
  // Both the eventLog line and the status bar used to say "to Keystone"
  // unconditionally, even on the Frisco route.
  const destinationLabel = playthrough.skiRentalLocation === "frisco" ? "Frisco" : "Keystone";

  const [elapsedMs, setElapsedMs] = useState(0);
  const [paused, setPaused] = useState(false);
  const [arrived, setArrived] = useState(false);
  const [collisionMessage, setCollisionMessage] = useState<string | null>(null);

  const [weather] = useState(() => WEATHER_FLAVOR[Math.floor(Math.random() * WEATHER_FLAVOR.length)]);
  const lastHourTicked = useRef(0);
  const checkpointShown = useRef(false);
  const hadCollision = useRef(false);
  const arrivalApplied = useRef(false);

  function processElapsed(ms: number) {
    const hoursNow = Math.min(3, Math.floor(ms / hourMs));
    if (hoursNow > lastHourTicked.current) {
      const newlyTicked = hoursNow - lastHourTicked.current;
      lastHourTicked.current = hoursNow;
      onUpdate((p) => ({ ...p, hungerLevel: Math.max(0, p.hungerLevel - 5 * newlyTicked) }));
    }
    if (ms >= config.firstLegMs && !checkpointShown.current) {
      checkpointShown.current = true;
      setPaused(true);
    }
  }

  // Reacts to `elapsedMs` rather than living inside a setState updater —
  // calling `onUpdate`/`setPaused` from inside another component's own
  // `setElapsedMs` updater trips React's "Cannot update a component while
  // rendering a different component" guard and silently stalls the timer.
  useEffect(() => {
    processElapsed(elapsedMs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsedMs]);

  function handleTick(ms: number) {
    setElapsedMs(ms);
  }

  // § 0 item 24: a busy run can collide more than once, so this stays
  // non-blocking (a brief message, not a dismiss-to-continue modal) rather
  // than fighting the "just keep driving" feel § 4 asks for — but it's no
  // longer silent either; each hit now shows what happened for a moment.
  // Each hit is its own independent -5 vibe + injury roll
  // (upgrade-only-if-already-injured, capped at moderate — same formula as
  // § 0.11 already used for the old single-crash case).
  function handleCollision() {
    hadCollision.current = true;
    const rolled = rollInjurySeverity();
    const capped = rolled === "severe" ? "moderate" : rolled;
    const finalSeverity = upgradeSeverity(playthrough.injury?.severity ?? null, capped);
    const dailyPenalty = finalSeverity === "moderate" ? -2 : -1; // § 18: was -3
    const injuryLabel = INJURY_NAME[finalSeverity];
    const message = `Fender-bender on the drive to ${destinationLabel} — ${injuryLabel} (${finalSeverity}).`;

    onUpdate((prev) => ({
      ...prev,
      vibePoints: prev.vibePoints - 5,
      injury: { severity: finalSeverity, dailyPenalty, treated: false },
      eventLog: [...prev.eventLog, message],
    }));
    setCollisionMessage(message);
  }

  function handleFinish() {
    if (arrivalApplied.current) return;
    arrivalApplied.current = true;
    if (!hadCollision.current) {
      onUpdate((prev) => ({ ...prev, vibePoints: prev.vibePoints + 12 }));
    }
    setArrived(true);
  }

  useEffect(() => {
    if (!arrived) return;
    const timer = setTimeout(() => {
      onUpdate((prev) => ({ ...prev, currentSegment: "cabin-arrival" }));
    }, 900);
    return () => clearTimeout(timer);
  }, [arrived, onUpdate]);

  useEffect(() => {
    if (!collisionMessage) return;
    const timer = setTimeout(() => setCollisionMessage(null), COLLISION_MESSAGE_MS);
    return () => clearTimeout(timer);
  }, [collisionMessage]);

  const hoursRemaining = Math.max(0, 3 - Math.floor(elapsedMs / hourMs));

  return (
    <div className="relative mx-auto aspect-square w-full max-w-xl select-none text-amber-950">
      <DriveRun
        firstLegMs={config.firstLegMs}
        secondLegMs={config.secondLegMs}
        startSpawnPerSec={config.startSpawnPerSec}
        endSpawnPerSec={config.endSpawnPerSec}
        paused={paused || arrived}
        onTick={handleTick}
        onCollision={handleCollision}
        onFinish={handleFinish}
      />
      <ProgressStatusBar
        day="Wednesday"
        weather={weather}
        health={getHealthLabel(playthrough.injury)}
        hunger={getHungerLabel(playthrough.hungerLevel)}
        nextLandmark={checkpointShown.current ? "The cabin" : "Costco"}
        progressLabel={arrived ? "Arriving..." : `${hoursRemaining} hr${hoursRemaining === 1 ? "" : "s"} to ${destinationLabel}`}
      />
      {paused && <WalterStop playthrough={playthrough} onUpdate={onUpdate} onDone={() => setPaused(false)} />}
      {!paused && collisionMessage && <OverlayPanel body={collisionMessage} />}
    </div>
  );
}

export default DriveProgress;
