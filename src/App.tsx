import { useEffect, useState, type ComponentType } from "react";
import CabinArrival from "./components/CabinArrival";
import CabinEvening from "./components/CabinEvening";
import DenverAirport from "./components/DenverAirport";
import DriveProgress from "./components/DriveProgress";
import Ending from "./components/Ending";
import EndingInjured from "./components/EndingInjured";
import FlightProgress from "./components/FlightProgress";
import FlightTimeSelect from "./components/FlightTimeSelect";
import JourneyHome from "./components/JourneyHome";
import NameEntry from "./components/NameEntry";
import ProfessionSelect from "./components/ProfessionSelect";
import SkiDay from "./components/SkiDay";
import SkiRentalSelect from "./components/SkiRentalSelect";
import CheckStatus from "./components/shared/CheckStatus";
import MapScreen from "./components/shared/MapScreen";
import TitleScreen from "./components/TitleScreen";
import WalkToCabin from "./components/WalkToCabin";
import WalkToResort from "./components/WalkToResort";
import type { GamePlaythrough, SegmentId, SegmentProps } from "./game/types";

function createInitialState(): GamePlaythrough {
  return {
    currentSegment: "title",
    vibePoints: 0,
    money: 0,
    hungerLevel: 100,
    injury: null,
    severeInjuryExit: false,
    foodRiskCounter: 0,
    puddleBritchesTriggered: false,
    lostSkiDay: false,
    skiStyle: null,
    currentSkiDay: null,
    completedSkiDays: [],
    dukeUncChoice: null,
    dukeUncResolved: false,
    thermalWearPurchased: false,
    restUsedThisVisit: false,
    voluntaryQuit: false,
    uncWinBonusPending: false,
    wentBrokeTriggered: false,
    eventLog: [],
    startedAt: new Date().toISOString(),
  };
}

const segmentComponents: Record<SegmentId, ComponentType<SegmentProps>> = {
  title: TitleScreen,
  "name-entry": NameEntry,
  "profession-select": ProfessionSelect,
  "flight-time-select": FlightTimeSelect,
  "ski-rental-select": SkiRentalSelect,
  "flight-progress": FlightProgress,
  "denver-airport": DenverAirport,
  "drive-progress": DriveProgress,
  "cabin-arrival": CabinArrival,
  "walk-to-resort": WalkToResort,
  "ski-day": SkiDay,
  "walk-to-cabin": WalkToCabin,
  "cabin-evening": CabinEvening,
  "journey-home": JourneyHome,
  ending: Ending,
  "ending-injured": EndingInjured,
};

// § 2: Map/Status are available from any segment from flight-progress onward,
// not during Segment 0's setup screens. The two 7s walk screens skip chrome
// (same as ending/ending-injured skip it) — nothing to check mid-animation.
const SEGMENTS_WITH_CHROME = new Set<SegmentId>([
  "flight-progress",
  "denver-airport",
  "drive-progress",
  "cabin-arrival",
  "ski-day",
  "cabin-evening",
  "journey-home",
]);

function App() {
  const [playthrough, setPlaythrough] = useState<GamePlaythrough>(createInitialState);
  const [globalOverlay, setGlobalOverlay] = useState<"map" | "status" | null>(null);
  const SegmentComponent = segmentComponents[playthrough.currentSegment];
  const showChrome = SEGMENTS_WITH_CHROME.has(playthrough.currentSegment);

  // The base progression screens (flight/drive) can auto-advance to the next
  // segment on their own timer while Map/Status is open — close it on every
  // segment change so it doesn't linger on top of a screen the player never
  // asked to see it over (found by testing: it stayed open across the
  // flight-progress -> denver-airport landing).
  useEffect(() => {
    setGlobalOverlay(null);
  }, [playthrough.currentSegment]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <div className="relative mx-auto aspect-square w-full max-w-xl">
        <SegmentComponent
          playthrough={playthrough}
          onUpdate={setPlaythrough}
          onShowOverlay={setGlobalOverlay}
        />

        {showChrome && globalOverlay === null && (
          <div className="absolute right-[2%] top-[2%] z-10 flex gap-1">
            <button
              type="button"
              onClick={() => setGlobalOverlay("map")}
              className="cursor-pointer rounded border border-black/40 bg-amber-100/90 px-2 py-1 text-xs font-bold text-amber-950 hover:bg-amber-100"
            >
              Map
            </button>
            <button
              type="button"
              onClick={() => setGlobalOverlay("status")}
              className="cursor-pointer rounded border border-black/40 bg-amber-100/90 px-2 py-1 text-xs font-bold text-amber-950 hover:bg-amber-100"
            >
              Status
            </button>
          </div>
        )}

        {globalOverlay === "map" && (
          <MapScreen playthrough={playthrough} onClose={() => setGlobalOverlay(null)} />
        )}
        {globalOverlay === "status" && (
          <CheckStatus playthrough={playthrough} onClose={() => setGlobalOverlay(null)} />
        )}
      </div>
    </div>
  );
}

export default App;
