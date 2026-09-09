import { useEffect, useRef, useState } from "react";
import { applySpend } from "../game/economy";
import type { SegmentProps } from "../game/types";

// Reuses the pre-merge ski-rental laptop art (cityscape through the window,
// no baked-in decorative circles) instead of the merged screen's own
// generated background — that regeneration lost the cityscape and its baked
// circle graphic doubled up against this component's own Radio dot. Zones
// below are pixel-measured against the actual 3-box laptop-screen layout
// (box1 18.8%-41.2%, box2 43.3%-64.4%, box3/thin bar 66.8%-73.3% vertically;
// box interior 11.1%-88.8% horizontally), not the § 3 merge's own art.
const bgImg = "/images/segment-0c-ski-rental.png";
const benImg = "/images/npc-ben-guitar.png";

type FlightTime = "early" | "late";
type RentalLocation = "keystone" | "frisco";

function Radio({ selected }: { selected: boolean }) {
  return (
    <span className="mt-1 flex h-3 w-3 shrink-0 items-center justify-center rounded-full border-2 border-amber-950 sm:h-4 sm:w-4">
      {selected && <span className="h-1.5 w-1.5 rounded-full bg-amber-950 sm:h-2 sm:w-2" />}
    </span>
  );
}

/**
 * § 3: merges the old flight-time-select + ski-rental-select into one form —
 * both picks are independent radios, no numbered menu (this isn't a menu),
 * and the screen auto-advances the instant both are set. No back option:
 * "YeeStone is Calling" is decorative flavor text, not a control.
 */
function FlightAndRentalSelect({ onUpdate }: SegmentProps) {
  const [flightTime, setFlightTime] = useState<FlightTime | null>(null);
  const [rentalLocation, setRentalLocation] = useState<RentalLocation | null>(null);
  const advanced = useRef(false);

  useEffect(() => {
    if (!flightTime || !rentalLocation || advanced.current) return;
    advanced.current = true;
    onUpdate((prev) => {
      if (rentalLocation !== "keystone") {
        return { ...prev, flightTime, skiRentalLocation: rentalLocation, currentSegment: "flight-progress" };
      }
      const spend = applySpend(prev, 100);
      return {
        ...prev,
        flightTime,
        skiRentalLocation: rentalLocation,
        money: spend.money,
        vibePoints: prev.vibePoints + spend.vibeDelta,
        wentBrokeTriggered: spend.wentBrokeTriggered,
        eventLog: spend.eventLogAppend ? [...prev.eventLog, spend.eventLogAppend] : prev.eventLog,
        currentSegment: "flight-progress",
      };
    });
  }, [flightTime, rentalLocation, onUpdate]);

  return (
    <div className="relative mx-auto aspect-square w-full max-w-xl select-none text-amber-950">
      <img src={bgImg} alt="Book your flight and ski rental" className="h-full w-full" draggable={false} />

      <div className="absolute left-[11%] top-[19.3%] flex h-[3.5%] w-[78%] items-center justify-center overflow-hidden text-center text-lg leading-tight">
        Book Your Flight
      </div>
      <button
        type="button"
        onClick={() => setFlightTime("early")}
        className="absolute left-[11.5%] top-[23.5%] flex h-[17.5%] w-[37%] cursor-pointer flex-col justify-center gap-0.5 overflow-hidden px-1 py-1 text-left leading-tight hover:bg-amber-900/10 sm:gap-1 sm:px-2"
      >
        <span className="flex items-center gap-1 sm:gap-2">
          <Radio selected={flightTime === "early"} />
          <span className="whitespace-nowrap text-[0.6rem] sm:whitespace-normal sm:text-base">Early Morning Flight</span>
        </span>
        <span className="whitespace-nowrap pl-4 text-[0.55rem] opacity-80 sm:whitespace-normal sm:pl-6 sm:text-sm">
          Get in early, load up on tacos
        </span>
      </button>
      <button
        type="button"
        onClick={() => setFlightTime("late")}
        className="absolute left-[51.5%] top-[23.5%] flex h-[17.5%] w-[37%] cursor-pointer flex-col justify-center gap-0.5 overflow-hidden px-1 py-1 text-left leading-tight hover:bg-amber-900/10 sm:gap-1 sm:px-2"
      >
        <span className="flex items-center gap-1 sm:gap-2">
          <Radio selected={flightTime === "late"} />
          <span className="whitespace-nowrap text-[0.6rem] sm:whitespace-normal sm:text-base">Late Evening Flight</span>
        </span>
        <span className="whitespace-nowrap pl-4 text-[0.55rem] opacity-80 sm:whitespace-normal sm:pl-6 sm:text-sm">
          Fashionably late
        </span>
      </button>

      <div className="absolute left-[11%] top-[43.8%] flex h-[3.5%] w-[78%] items-center justify-center overflow-hidden text-center text-lg leading-tight">
        Book Your Ski Rental
      </div>
      <button
        type="button"
        onClick={() => setRentalLocation("keystone")}
        className="absolute left-[11.5%] top-[48%] flex h-[16%] w-[37%] cursor-pointer flex-col justify-center gap-0.5 overflow-hidden px-1 py-1 text-left leading-tight hover:bg-amber-900/10 sm:gap-1 sm:px-2"
      >
        <span className="flex items-center gap-1 sm:gap-2">
          <Radio selected={rentalLocation === "keystone"} />
          <span className="whitespace-nowrap text-[0.6rem] sm:whitespace-normal sm:text-base">Keystone Resort</span>
        </span>
        <span className="whitespace-nowrap pl-4 text-[0.55rem] opacity-80 sm:whitespace-normal sm:pl-6 sm:text-sm">
          Cost: $100 — same day pickup
        </span>
      </button>
      <button
        type="button"
        onClick={() => setRentalLocation("frisco")}
        className="absolute left-[51.5%] top-[48%] flex h-[16%] w-[37%] cursor-pointer flex-col justify-center gap-0.5 overflow-hidden px-1 py-1 text-left leading-tight hover:bg-amber-900/10 sm:gap-1 sm:px-2"
      >
        <span className="flex items-center gap-1 sm:gap-2">
          <Radio selected={rentalLocation === "frisco"} />
          <span className="whitespace-nowrap text-[0.6rem] sm:whitespace-normal sm:text-base">Breeze In Frisco</span>
        </span>
        <span className="whitespace-nowrap pl-4 text-[0.55rem] opacity-80 sm:whitespace-normal sm:pl-6 sm:text-sm">
          Cost: $0 — saves $100!
        </span>
      </button>

      <div className="absolute left-[11%] top-[67%] flex h-[6%] w-[78%] items-center justify-center overflow-hidden text-center text-sm italic opacity-70">
        YeeStone is Calling
      </div>

      <img
        src={benImg}
        alt="Ben, playing guitar"
        className="pointer-events-none absolute top-[-9%] right-[-3%] w-[24%] select-none"
        draggable={false}
      />
    </div>
  );
}

export default FlightAndRentalSelect;
