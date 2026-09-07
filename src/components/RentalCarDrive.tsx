import { useState } from "react";
import type { SegmentProps } from "../game/types";
import { useOnEntry } from "../game/useOnEntry";
import OverlayPanel from "./shared/OverlayPanel";

const rentalCarImg = "/images/segment-4-rental-car-drive.png";

const ABANDONED_CAR_FLAVOR = [
  "Puddle Britches Was Here - 2024",
  "One of the guys made it home but his ego didn't",
  "UNC FAN TERRITORY - Duke fans beware",
  "RIP my knees - 2023",
  "Walter's Wisdom: You shoulda bought the thermal wear",
  "First time's a charm... right?",
];

type Phase = "pre-drive" | "arrived";

function RentalCarDrive({ playthrough, onUpdate, onShowOverlay }: SegmentProps) {
  const [phase, setPhase] = useState<Phase>("pre-drive");
  const [encounter, setEncounter] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useOnEntry(() => {
    if (Math.random() < 0.2) setEncounter(true);
  });

  function pullOver() {
    const line = ABANDONED_CAR_FLAVOR[Math.floor(Math.random() * ABANDONED_CAR_FLAVOR.length)];
    onUpdate((prev) => ({ ...prev, vibePoints: prev.vibePoints + 2 }));
    setEncounter(false);
    setMessage(line);
  }

  function driveOn() {
    setEncounter(false);
  }

  function startDrive() {
    // Mini-game not implemented yet — passes straight through, no penalty.
    setPhase("arrived");
  }

  function rest() {
    if (playthrough.restBreakUsed) return;
    onUpdate((prev) => ({ ...prev, vibePoints: prev.vibePoints + 1, restBreakUsed: true }));
  }

  function continueToCabin() {
    onUpdate((prev) => ({ ...prev, currentSegment: "cabin-arrival" }));
  }

  return (
    <div className="relative mx-auto aspect-square w-full max-w-xl select-none text-amber-950">
      <img src={rentalCarImg} alt="Drive to Keystone" className="h-full w-full" draggable={false} />

      <div className="absolute left-[2%] top-[2%] flex h-[25%] w-[60%] flex-col items-center justify-center gap-1 overflow-hidden px-2 text-center">
        {phase === "pre-drive" ? (
          <>
            <p className="text-lg">NAVIGATE TO KEYSTONE</p>
            <p className="text-sm">Distance: 90 miles | Time: ~2 hours</p>
          </>
        ) : (
          <>
            <p className="text-lg">You arrive at Keystone!</p>
            <p className="text-sm leading-tight">
              The cabin is cozy and warm — everyone's already settled in.
            </p>
          </>
        )}
      </div>

      {phase === "pre-drive" ? (
        <div className="absolute left-[2%] top-[57%] flex h-[16%] w-[31%] flex-col justify-center gap-0.5 overflow-hidden px-1 text-sm leading-tight">
          <button
            type="button"
            onClick={startDrive}
            className="cursor-pointer text-left hover:text-amber-700"
          >
            1. Start Drive
          </button>
          <button
            type="button"
            onClick={() => onShowOverlay?.("map")}
            className="cursor-pointer text-left hover:text-amber-700"
          >
            2. Check Route
          </button>
          <button
            type="button"
            onClick={rest}
            disabled={playthrough.restBreakUsed}
            className="cursor-pointer text-left hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            3. Rest
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={continueToCabin}
          className="absolute left-[2%] top-[90%] h-[8%] w-[96%] cursor-pointer text-xl hover:text-amber-700"
        >
          Continue to the cabin
        </button>
      )}

      {encounter && (
        <OverlayPanel
          body="An abandoned car has a spray-painted message. Pull over?"
          options={[
            { label: "Yes", onSelect: pullOver },
            { label: "No", onSelect: driveOn },
          ]}
        />
      )}

      {!encounter && message && (
        <OverlayPanel body={message} onDismiss={() => setMessage(null)} />
      )}
    </div>
  );
}

export default RentalCarDrive;
