import { useEffect, useRef, useState } from "react";
import { hungerTiers } from "../data/hunger-tiers";
import { getDriveConfig } from "../game/drive";
import { rollInjurySeverity, upgradeSeverity } from "../game/ski";
import type { SegmentProps } from "../game/types";
import DriveRun from "./DriveRun";
import OverlayPanel from "./shared/OverlayPanel";
import ProgressStatusBar from "./shared/ProgressStatusBar";
import TravelScene from "./shared/TravelScene";
import WalterStop from "./shared/WalterStop";

const bgImg = "/images/progress-drive-bg.png";
const truckImg = "/images/progress-truck.png";
const cabinIconImg = "/images/progress-cabin-icon.png";

const WEATHER_FLAVOR = ["Sunny", "Light snow", "Bluebird", "Windy mountain pass"];

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
 * § 5.2's driving mini-game, finally implemented: a real-time 3-lane dodge
 * game standing in for the Denver -> Keystone drive, wrapped with the same
 * hour-ticking/landmark framing as FlightProgress. Walter's stop (formerly
 * the standalone `costco-stop` segment) is a scripted checkpoint ~1/3 of the
 * way in that pauses the drive rather than a segment of its own.
 */
function DriveProgress({ playthrough, onUpdate }: SegmentProps) {
  const config = getDriveConfig(playthrough.skiRentalLocation);
  const checkpointMs = config.runDurationMs / 3;

  const [elapsedMs, setElapsedMs] = useState(0);
  const [paused, setPaused] = useState(false);
  const [dodgeActive, setDodgeActive] = useState(true);
  const [crashed, setCrashed] = useState(false);
  const [crashMessage, setCrashMessage] = useState<string | null>(null);
  const [arrived, setArrived] = useState(false);

  const [weather] = useState(() => WEATHER_FLAVOR[Math.floor(Math.random() * WEATHER_FLAVOR.length)]);
  const lastHourTicked = useRef(0);
  const checkpointShown = useRef(false);
  const outcomeApplied = useRef(false);

  function processElapsed(ms: number) {
    const hoursNow = Math.min(3, Math.floor(ms / checkpointMs));
    if (hoursNow > lastHourTicked.current) {
      const newlyTicked = hoursNow - lastHourTicked.current;
      lastHourTicked.current = hoursNow;
      onUpdate((p) => ({ ...p, hungerLevel: Math.max(0, p.hungerLevel - 5 * newlyTicked) }));
    }
    if (ms >= checkpointMs && !checkpointShown.current) {
      checkpointShown.current = true;
      setPaused(true);
    }
  }

  function handleTick(ms: number) {
    setElapsedMs(ms);
  }

  function handleFinish() {
    if (outcomeApplied.current) return;
    outcomeApplied.current = true;
    onUpdate((prev) => ({ ...prev, vibePoints: prev.vibePoints + 10 }));
    setDodgeActive(false);
    setArrived(true);
  }

  function handleCrash(crashElapsedMs: number) {
    if (outcomeApplied.current) return;
    outcomeApplied.current = true;

    const rolled = rollInjurySeverity();
    const capped = rolled === "severe" ? "moderate" : rolled; // § 0.11: driving can't force the severe/early-exit branch
    const finalSeverity = upgradeSeverity(playthrough.injury?.severity ?? null, capped);
    const dailyPenalty = finalSeverity === "moderate" ? -3 : -1;
    const injuryLabel = INJURY_NAME[finalSeverity];

    onUpdate((prev) => ({
      ...prev,
      vibePoints: prev.vibePoints - 10,
      injury: { severity: finalSeverity, dailyPenalty, treated: false },
      eventLog: [...prev.eventLog, `Fender-bender on the drive to Keystone — ${injuryLabel} (${finalSeverity}).`],
    }));

    setElapsedMs(crashElapsedMs);
    setCrashMessage(
      `You clip a guardrail dodging traffic — ${injuryLabel[0].toUpperCase()}${injuryLabel.slice(1)} (${finalSeverity}). The truck's still driving, just a little worse for wear.`,
    );
    setCrashed(true);
    setDodgeActive(false);
  }

  // Reacts to `elapsedMs` rather than living inside a setState updater —
  // calling `onUpdate`/`setPaused` from inside another component's own
  // `setElapsedMs` updater trips React's "Cannot update a component while
  // rendering a different component" guard and silently stalls the timer.
  // `processElapsed` is idempotent (both its own ref guards gate on
  // "already ticked past this point"), so it's safe to run on every
  // `elapsedMs` change regardless of whether DriveRun's onTick or the
  // post-crash interval below produced it.
  useEffect(() => {
    processElapsed(elapsedMs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsedMs]);

  // Dodge gameplay ends on crash (or a clean finish), but the trip itself
  // keeps going — this picks the clock back up so the Walter's-stop
  // checkpoint and arrival still land at the right simulated hour.
  useEffect(() => {
    if (!crashed || arrived || paused) return;
    const interval = setInterval(() => {
      setElapsedMs((prev) => Math.min(config.runDurationMs, prev + 200));
    }, 200);
    return () => clearInterval(interval);
  }, [crashed, arrived, paused, config.runDurationMs]);

  // Arrival for the post-crash tail only — a clean finish already sets
  // `arrived` directly in `handleFinish`, so this must stay crash-only or a
  // clean run would double up (vibe bonus + a second segment transition).
  useEffect(() => {
    if (crashed && !arrived && elapsedMs >= config.runDurationMs) setArrived(true);
  }, [crashed, arrived, elapsedMs, config.runDurationMs]);

  useEffect(() => {
    if (!arrived) return;
    const timer = setTimeout(() => {
      onUpdate((prev) => ({ ...prev, currentSegment: "cabin-arrival" }));
    }, 900);
    return () => clearTimeout(timer);
  }, [arrived, onUpdate]);

  const hoursRemaining = Math.max(0, 3 - Math.floor(elapsedMs / checkpointMs));
  const statusBar = (
    <ProgressStatusBar
      day="Wednesday"
      weather={weather}
      health={getHealthLabel(playthrough.injury)}
      hunger={getHungerLabel(playthrough.hungerLevel)}
      nextLandmark={checkpointShown.current ? "The cabin" : "Walter's roadside stop"}
      progressLabel={arrived ? "Arriving..." : `${hoursRemaining} hr${hoursRemaining === 1 ? "" : "s"} to Keystone`}
    />
  );

  if (dodgeActive) {
    return (
      <div className="relative mx-auto aspect-square w-full max-w-xl select-none text-amber-950">
        <DriveRun
          durationMs={config.runDurationMs}
          startSpawnPerSec={config.startSpawnPerSec}
          endSpawnPerSec={config.endSpawnPerSec}
          paused={paused}
          onTick={handleTick}
          onCrash={handleCrash}
          onFinish={handleFinish}
        />
        {statusBar}
        {paused && <WalterStop playthrough={playthrough} onUpdate={onUpdate} onDone={() => setPaused(false)} />}
      </div>
    );
  }

  return (
    <TravelScene
      bgSrc={bgImg}
      bgAlt="Driving to Keystone"
      vehicleSrc={truckImg}
      vehicleAlt="Truck"
      progress={elapsedMs / config.runDurationMs}
      landmarkSrc={cabinIconImg}
      landmarkAlt="The cabin"
      vehicleTopPct={64}
      landmarkTopPct={64}
    >
      {statusBar}
      {crashMessage && (
        <OverlayPanel body={crashMessage} onDismiss={() => setCrashMessage(null)} />
      )}
      {!crashMessage && paused && (
        <WalterStop playthrough={playthrough} onUpdate={onUpdate} onDone={() => setPaused(false)} />
      )}
    </TravelScene>
  );
}

export default DriveProgress;
