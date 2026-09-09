import { useEffect, useState, type ComponentType } from "react";
import CabinArrival from "./components/CabinArrival";
import CabinEvening from "./components/CabinEvening";
import DenverAirport from "./components/DenverAirport";
import DriveProgress from "./components/DriveProgress";
import Ending from "./components/Ending";
import EndingInjured from "./components/EndingInjured";
import FlightAndRentalSelect from "./components/FlightAndRentalSelect";
import FlightProgress from "./components/FlightProgress";
import JourneyHome from "./components/JourneyHome";
import NameEntry from "./components/NameEntry";
import ProfessionSelect from "./components/ProfessionSelect";
import SkiDay from "./components/SkiDay";
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
    mealsEaten: 0,
    puddleBritchesTriggered: false,
    lostSkiDay: false,
    skiStyle: null,
    currentSkiDay: null,
    completedSkiDays: [],
    dukeUncChoice: null,
    dukeUncResolved: false,
    thermalWearPurchased: false,
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
  "flight-and-rental-select": FlightAndRentalSelect,
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

function App() {
  const [playthrough, setPlaythrough] = useState<GamePlaythrough>(createInitialState);
  // § 0 item 24: the persistent top-right Map/Status buttons were removed —
  // they didn't pause the real-time mini-games underneath them (a collision
  // could happen invisibly behind the Status panel) and could sit on top of
  // a segment's own title text without fully covering it. `globalOverlay`
  // itself stays: several segments still open Check Status as their own
  // numbered menu option (CabinArrival, DenverAirport, SkiDay, CabinEvening)
  // via `onShowOverlay`, which is unaffected by removing the floating
  // buttons. Map has no such in-menu entry point anymore and is only
  // reachable pre-game from the title screen now — an accepted tradeoff of
  // removing the buttons outright rather than trying to fix their layering.
  const [globalOverlay, setGlobalOverlay] = useState<"map" | "status" | null>(null);
  const SegmentComponent = segmentComponents[playthrough.currentSegment];

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
