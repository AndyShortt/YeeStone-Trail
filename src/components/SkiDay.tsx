import { useState } from "react";
import { rollBroEvent } from "../game/rolls";
import {
  buildLeaderboard,
  computeInjuryRiskPercent,
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

const PUDDLE_BRITCHES_THRESHOLD = 4;
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
    onUpdate((prev) => ({ ...prev, currentSegment: "cabin-evening" }));
    setResultStage(null);
    setResultData(null);
  }

  function handleRunComplete(result: SkiRunResult) {
    const route = activeRun!.route;
    const day = playthrough.currentSkiDay ?? "thursday";
    const preName = playthrough.displayName ?? playthrough.playerName ?? "You";
    const skiStyle = playthrough.skiStyle ?? "balanced";
    const triggersPuddle =
      !playthrough.puddleBritchesTriggered && playthrough.foodRiskCounter >= PUDDLE_BRITCHES_THRESHOLD;
    // Renamed immediately (not just once the state update re-renders) so the
    // leaderboard/eventLog built below already reflect it on this same run.
    const displayName = triggersPuddle ? "Puddle Britches" : preName;
    const puddleLines = triggersPuddle
      ? [
          `${preName} felt a rumbling in the gut on the way down...`,
          'Instantly rechristened "Puddle Britches." The group chat will never let this go.',
        ]
      : [];

    setActiveRun(null);

    if (result.crashed) {
      const rolled = rollInjurySeverity();

      if (rolled === "severe") {
        onUpdate((prev) => ({
          ...prev,
          severeInjuryExit: true,
          currentSegment: "ending-injured",
          displayName: triggersPuddle ? "Puddle Britches" : prev.displayName,
          vibePoints: prev.vibePoints - (triggersPuddle ? 30 : 0),
          puddleBritchesTriggered: prev.puddleBritchesTriggered || triggersPuddle,
          eventLog: [...prev.eventLog, `Wiped out hard on the ${route} run and had to be evacuated.`],
          completedSkiDays: [
            ...prev.completedSkiDays,
            { day, route, crashed: true, verticalFeet: result.verticalFeet, leaderboardPlacement: "last" },
          ],
        }));
        return;
      }

      const finalSeverity = upgradeSeverity(playthrough.injury?.severity ?? null, rolled);
      const dailyPenalty = finalSeverity === "moderate" ? -3 : -1;
      const injuryLabel = INJURY_NAME[finalSeverity];
      const board = buildLeaderboard(displayName, result.verticalFeet, true, route, skiStyle);

      onUpdate((prev) => ({
        ...prev,
        injury: { severity: finalSeverity, dailyPenalty, treated: false },
        displayName: triggersPuddle ? "Puddle Britches" : prev.displayName,
        vibePoints: prev.vibePoints - (triggersPuddle ? 30 : 0),
        puddleBritchesTriggered: prev.puddleBritchesTriggered || triggersPuddle,
        eventLog: [...prev.eventLog, `Crashed on the ${route} run — ${injuryLabel} (${finalSeverity}).`],
        completedSkiDays: [
          ...prev.completedSkiDays,
          { day, route, crashed: true, verticalFeet: result.verticalFeet, leaderboardPlacement: board.placement },
        ],
      }));

      setResultData({
        puddleLines,
        outcomeLines: [
          `You wipe out on the ${route} run.`,
          `${injuryLabel[0].toUpperCase()}${injuryLabel.slice(1)} — ${finalSeverity} injury.`,
        ],
        leaderboardLines: formatLeaderboardLines(board),
      });
      setResultStage(triggersPuddle ? "puddle" : "outcome");
      return;
    }

    const board = buildLeaderboard(displayName, result.verticalFeet, false, route, skiStyle);

    onUpdate((prev) => ({
      ...prev,
      vibePoints: prev.vibePoints + board.vibeDelta - (triggersPuddle ? 30 : 0),
      displayName: triggersPuddle ? "Puddle Britches" : prev.displayName,
      puddleBritchesTriggered: prev.puddleBritchesTriggered || triggersPuddle,
      eventLog: [
        ...prev.eventLog,
        `${route[0].toUpperCase()}${route.slice(1)} run: ${result.verticalFeet} ft, placed ${board.placement}.`,
      ],
      completedSkiDays: [
        ...prev.completedSkiDays,
        { day, route, crashed: false, verticalFeet: result.verticalFeet, leaderboardPlacement: board.placement },
      ],
    }));

    setResultData({
      puddleLines,
      outcomeLines: [`You made it down the ${route} run clean!`, `${result.verticalFeet} vertical feet.`],
      leaderboardLines: formatLeaderboardLines(board),
    });
    setResultStage(triggersPuddle ? "puddle" : "outcome");
  }

  function hotTub() {
    onUpdate((prev) => ({ ...prev, vibePoints: prev.vibePoints + 1 }));
    setSkipMessage("You skip today's run and soak in the hot tub instead. Not a bad trade.");
  }

  function skipToday() {
    onUpdate((prev) => ({ ...prev, vibePoints: prev.vibePoints + 1 }));
    setSkipMessage("You decide to sit today out.");
  }

  function dismissSkipMessage() {
    setSkipMessage(null);
    onUpdate((prev) => ({ ...prev, currentSegment: "cabin-evening" }));
  }

  const dayLabel = playthrough.currentSkiDay ? DAY_LABEL[playthrough.currentSkiDay] : "SKI";

  if (activeRun) {
    return (
      <div className="relative mx-auto aspect-square w-full max-w-xl select-none text-amber-950">
        <SkiRun route={activeRun.route} skiStyle={playthrough.skiStyle ?? "balanced"} riskPercent={activeRun.riskPercent} onComplete={handleRunComplete} />
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
