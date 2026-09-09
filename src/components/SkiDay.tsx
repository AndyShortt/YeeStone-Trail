import { useState } from "react";
import { rollBroEvent } from "../game/rolls";
import {
  buildLeaderboard,
  computeInjuryRiskPercent,
  computeVerticalFeet,
  rollInjurySeverity,
  upgradeSeverity,
  type LeaderboardResult,
  type Route,
} from "../game/ski";
import type { SegmentProps } from "../game/types";
import { useOnEntry } from "../game/useOnEntry";
import OverlayPanel from "./shared/OverlayPanel";
import SkiRun, { type SkiRunResult } from "./SkiRun";

const skiDayImg = "/images/segment-6-first-day-slopes.png";

const DAY_LABEL: Record<string, string> = {
  thursday: "THURSDAY",
  friday: "FRIDAY",
  saturday: "SATURDAY",
};

// Puddle Britches: once a player has eaten at least this many meals (any
// food purchase, standard or risky — quantity is what matters, not choice),
// each ski day they actually run rolls this chance to trigger it, until it
// fires once. Eating almost nothing (0-1 meals across the whole trip) is the
// only way to stay under the threshold and never risk it; not skiing at all
// works too, since this only rolls on a completed run (below).
const MEALS_EATEN_THRESHOLD = 2;
const PUDDLE_BRITCHES_CHANCE = 0.8;
const PUDDLE_BRITCHES_VIBE_PENALTY = 15; // § 18: was -30 — softened now that this fires in most playthroughs
const INJURY_NAME: Record<"minor" | "moderate", string> = {
  minor: "twisted ankle",
  moderate: "banged-up knee",
};

// Folds the reward straight onto the player's own row instead of a separate
// summary line — the leaderboard always has 4 ranked rows (player + 3 random
// rivals, § 3.2), and a 5th summary line risks overflowing the Overlay
// Panel's ~5-6 line budget (§ 2).
function formatLeaderboardLines(board: LeaderboardResult): string[] {
  return board.entries.map((e, i) => {
    if (!e.isPlayer) return `${i + 1}. ${e.name} - ${e.verticalFeet} ft`;
    const tag = e.crashed ? "crashed, no reward" : `${board.vibeDelta >= 0 ? "+" : ""}${board.vibeDelta} vibe`;
    return `${i + 1}. ${e.name} (you) - ${e.verticalFeet} ft — ${tag}`;
  });
}

type ResultStage = "puddle" | "outcome" | "leaderboard" | null;

function SkiDay({ playthrough, onUpdate, onShowOverlay }: SegmentProps) {
  const [pickingRoute, setPickingRoute] = useState(false);
  const [entryMessage, setEntryMessage] = useState<string | null>(null);
  const [skipMessage, setSkipMessage] = useState<string | null>(null);

  const [activeRun, setActiveRun] = useState<{ route: Route; riskPercent: number } | null>(null);
  const [resultStage, setResultStage] = useState<ResultStage>(null);
  const [resultData, setResultData] = useState<{
    puddleLines: string[];
    outcomeLines: string[];
    leaderboardLines: string[];
  } | null>(null);

  useOnEntry(() => {
    const broEvent = rollBroEvent({ skiDay: true });
    onUpdate((prev) => ({
      ...prev,
      vibePoints: prev.vibePoints + (broEvent?.vibeDelta ?? 0),
      hungerLevel: Math.max(0, prev.hungerLevel - 20),
      eventLog: broEvent ? [...prev.eventLog, broEvent.message] : prev.eventLog,
    }));
    if (broEvent) setEntryMessage(broEvent.message);
  });

  function startRun(route: Route) {
    const riskPercent = computeInjuryRiskPercent(playthrough, route);
    setPickingRoute(false);
    if (playthrough.uncWinBonusPending) {
      onUpdate((prev) => ({ ...prev, uncWinBonusPending: false }));
    }
    setActiveRun({ route, riskPercent });
  }

  function finishToEvening() {
    onUpdate((prev) => ({ ...prev, currentSegment: "walk-to-cabin" }));
    setResultStage(null);
    setResultData(null);
  }

  // Shared by handleCrash's severe branch and handleRunComplete — mutually
  // exclusive call sites (a severe crash exits straight to ending-injured
  // and never reaches handleRunComplete), so there's no risk of this rolling
  // twice for the same run.
  function checkPuddleBritches() {
    const preName = playthrough.displayName ?? playthrough.playerName ?? "You";
    const triggersPuddle =
      !playthrough.puddleBritchesTriggered &&
      playthrough.mealsEaten >= MEALS_EATEN_THRESHOLD &&
      Math.random() < PUDDLE_BRITCHES_CHANCE;
    // The leaderboard shows the nickname once triggered — either just now, or
    // already on a prior day — but `playthrough.displayName` itself is never
    // overwritten (§ 0 item 20): it always holds the name the player actually
    // chose, so the status board can show it struck through under the nickname.
    const leaderboardName = playthrough.puddleBritchesTriggered || triggersPuddle ? "Puddle Britches" : preName;
    const puddleLines = triggersPuddle
      ? [
          `${preName} felt a rumbling in the gut on the way down...`,
          'Instantly rechristened "Puddle Britches." The group chat will never let this go.',
        ]
      : [];
    return { triggersPuddle, leaderboardName, puddleLines };
  }

  // § 0 item 22: a crash no longer ends the run outright — it now resumes,
  // mirroring Flight/Drive's collisions — so this fires once per crash
  // (there can be more than one in a run) rather than once at the very end.
  // The injury roll/escalation lives here, not in handleRunComplete, since
  // this is where the player's current (possibly already-injured-this-run)
  // state lives. Returns true if this crash was severe — SkiRun.tsx reads
  // that as "stop, don't resume," since this has already navigated the
  // whole game away to ending-injured by the time it returns.
  function handleCrash(elapsedMs: number): boolean {
    const route = activeRun!.route;
    const day = playthrough.currentSkiDay ?? "thursday";
    const skiStyle = playthrough.skiStyle ?? "balanced";
    const rolled = rollInjurySeverity();

    if (rolled === "severe") {
      const { triggersPuddle } = checkPuddleBritches();
      const verticalFeet = computeVerticalFeet(elapsedMs, route, skiStyle);
      onUpdate((prev) => ({
        ...prev,
        severeInjuryExit: true,
        currentSegment: "ending-injured",
        vibePoints: prev.vibePoints - (triggersPuddle ? PUDDLE_BRITCHES_VIBE_PENALTY : 0),
        puddleBritchesTriggered: prev.puddleBritchesTriggered || triggersPuddle,
        eventLog: [...prev.eventLog, `Wiped out hard on the ${route} run and had to be evacuated.`],
        completedSkiDays: [
          ...prev.completedSkiDays,
          { day, route, crashed: true, verticalFeet, leaderboardPlacement: "fourth" },
        ],
      }));
      return true;
    }

    const finalSeverity = upgradeSeverity(playthrough.injury?.severity ?? null, rolled);
    const dailyPenalty = finalSeverity === "moderate" ? -2 : -1; // § 18: was -3
    const injuryLabel = INJURY_NAME[finalSeverity];
    onUpdate((prev) => ({
      ...prev,
      injury: { severity: finalSeverity, dailyPenalty, treated: false },
      eventLog: [...prev.eventLog, `Crashed on the ${route} run — ${injuryLabel} (${finalSeverity}).`],
    }));
    return false;
  }

  function handleRunComplete(result: SkiRunResult) {
    const route = activeRun!.route;
    const day = playthrough.currentSkiDay ?? "thursday";
    const skiStyle = playthrough.skiStyle ?? "balanced";
    const { triggersPuddle, leaderboardName, puddleLines } = checkPuddleBritches();

    setActiveRun(null);

    // Any injury from a crash mid-run was already applied by handleCrash as
    // it happened — result.crashed here just means "crashed at least once
    // but still made it down" (a severe crash never reaches this function at
    // all). Crashing still forfeits the leaderboard reward, same as before —
    // buildLeaderboard already zeroes vibeDelta whenever playerCrashed is true.
    const board = buildLeaderboard(leaderboardName, result.verticalFeet, result.crashed, route, skiStyle);

    onUpdate((prev) => ({
      ...prev,
      vibePoints: prev.vibePoints + board.vibeDelta - (triggersPuddle ? PUDDLE_BRITCHES_VIBE_PENALTY : 0),
      puddleBritchesTriggered: prev.puddleBritchesTriggered || triggersPuddle,
      eventLog: [
        ...prev.eventLog,
        result.crashed
          ? `Crashed on the ${route} run but made it down — ${result.verticalFeet} ft.`
          : `${route[0].toUpperCase()}${route.slice(1)} run: ${result.verticalFeet} ft, placed ${board.placement}.`,
      ],
      completedSkiDays: [
        ...prev.completedSkiDays,
        { day, route, crashed: result.crashed, verticalFeet: result.verticalFeet, leaderboardPlacement: board.placement },
      ],
    }));

    setResultData({
      puddleLines,
      outcomeLines: result.crashed
        ? [`You crashed on the ${route} run, but made it down.`, `${result.verticalFeet} vertical feet.`]
        : [`You made it down the ${route} run clean!`, `${result.verticalFeet} vertical feet.`],
      leaderboardLines: formatLeaderboardLines(board),
    });
    setResultStage(triggersPuddle ? "puddle" : "outcome");
  }

  function hotTub() {
    onUpdate((prev) => ({ ...prev, vibePoints: prev.vibePoints - 1 })); // § 18: was -2
    setSkipMessage("You skip today's run and soak in the hot tub instead. Relaxing, but you can hear the guys bragging about the run you missed.");
  }

  function skipToday() {
    onUpdate((prev) => ({ ...prev, vibePoints: prev.vibePoints - 2 })); // § 18: was -4
    setSkipMessage("You decide to sit today out. The guys give you grief about it all day.");
  }

  function dismissSkipMessage() {
    setSkipMessage(null);
    onUpdate((prev) => ({ ...prev, currentSegment: "walk-to-cabin" }));
  }

  const dayLabel = playthrough.currentSkiDay ? DAY_LABEL[playthrough.currentSkiDay] : "SKI";

  if (activeRun) {
    return (
      <div className="relative mx-auto aspect-square w-full max-w-xl select-none text-amber-950">
        <SkiRun
          route={activeRun.route}
          skiStyle={playthrough.skiStyle ?? "balanced"}
          riskPercent={activeRun.riskPercent}
          onCrash={handleCrash}
          onComplete={handleRunComplete}
        />
      </div>
    );
  }

  return (
    <div className="relative mx-auto aspect-square w-full max-w-xl select-none text-amber-950">
      <img src={skiDayImg} alt="Ski day" className="h-full w-full" draggable={false} />

      <div className="absolute left-[15%] top-[35%] flex h-[31%] w-[73%] flex-col items-center justify-center gap-1 overflow-hidden px-2 text-center text-base leading-tight">
        <p className="text-xl">{dayLabel} MORNING</p>
        <p className="italic">Navigate down the slope!</p>
        <div className="grid w-full grid-cols-2 grid-rows-2 gap-x-2 gap-y-1 text-left">
          <button
            type="button"
            onClick={() => setPickingRoute(true)}
            className="cursor-pointer hover:text-amber-700"
          >
            1. Start Run
          </button>
          <button
            type="button"
            onClick={() => onShowOverlay?.("status")}
            className="cursor-pointer hover:text-amber-700"
          >
            2. Check Status
          </button>
          <button type="button" onClick={hotTub} className="cursor-pointer hover:text-amber-700">
            3. Hot Tub
          </button>
          <button type="button" onClick={skipToday} className="cursor-pointer hover:text-amber-700">
            4. Skip today
          </button>
        </div>
      </div>

      {entryMessage && (
        <OverlayPanel body={entryMessage} onDismiss={() => setEntryMessage(null)} />
      )}

      {!entryMessage && pickingRoute && (
        <OverlayPanel
          options={[
            { label: "Green — easy, safer", onSelect: () => startRun("green") },
            { label: "Blue — medium risk", onSelect: () => startRun("blue") },
            { label: "Black — high risk, high reward", onSelect: () => startRun("black") },
          ]}
        />
      )}

      {!entryMessage && !pickingRoute && skipMessage && (
        <OverlayPanel body={skipMessage} onDismiss={dismissSkipMessage} />
      )}

      {!entryMessage && !pickingRoute && !skipMessage && resultStage === "puddle" && resultData && (
        <OverlayPanel body={resultData.puddleLines} onDismiss={() => setResultStage("outcome")} />
      )}
      {!entryMessage && !pickingRoute && !skipMessage && resultStage === "outcome" && resultData && (
        <OverlayPanel body={resultData.outcomeLines} onDismiss={() => setResultStage("leaderboard")} />
      )}
      {!entryMessage && !pickingRoute && !skipMessage && resultStage === "leaderboard" && resultData && (
        <OverlayPanel
          body={resultData.leaderboardLines}
          options={[{ label: "Continue", onSelect: finishToEvening }]}
        />
      )}
    </div>
  );
}

export default SkiDay;
