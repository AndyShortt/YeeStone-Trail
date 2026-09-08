import { useEffect, useRef, useState } from "react";
import { applySpend } from "../game/economy";
import type { SegmentProps } from "../game/types";

const bgImg = "/images/segment-0c-flight-and-rental.png";

type FlightTime = "early" | "late";
type RentalLocation = "keystone" | "frisco";

function Radio({ selected }: { selected: boolean }) {
  return (
    <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-amber-950">
      {selected && <span className="h-2 w-2 rounded-full bg-amber-950" />}
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

      <div className="absolute left-[7%] top-[10%] flex h-[11%] w-[86%] items-center justify-center overflow-hidden text-center text-xl leading-tight">
        Book Your Flight
      </div>
      <button
        type="button"
        onClick={() => setFlightTime("early")}
        className="absolute left-[7%] top-[23%] flex h-[22%] w-[43%] cursor-pointer flex-col justify-center gap-1 overflow-hidden px-3 py-2 text-left leading-tight hover:bg-amber-900/10"
      >
        <span className="flex items-center gap-2">
          <Radio selected={flightTime === "early"} />
          <span className="text-base">Early Morning Flight</span>
        </span>
        <span className="pl-6 text-sm opacity-80">Get in early, load up on tacos</span>
      </button>
      <button
        type="button"
        onClick={() => setFlightTime("late")}
        className="absolute left-[53%] top-[23%] flex h-[22%] w-[40%] cursor-pointer flex-col justify-center gap-1 overflow-hidden px-3 py-2 text-left leading-tight hover:bg-amber-900/10"
      >
        <span className="flex items-center gap-2">
          <Radio selected={flightTime === "late"} />
          <span className="text-base">Late Evening Flight</span>
        </span>
        <span className="pl-6 text-sm opacity-80">Fashionably late</span>
      </button>

      <div className="absolute left-[7%] top-[48%] flex h-[7%] w-[86%] items-center justify-center overflow-hidden text-center text-xl leading-tight">
        Book Your Ski Rental
      </div>
      <button
        type="button"
        onClick={() => setRentalLocation("keystone")}
        className="absolute left-[7%] top-[57%] flex h-[21%] w-[43%] cursor-pointer flex-col justify-center gap-1 overflow-hidden px-3 py-2 text-left leading-tight hover:bg-amber-900/10"
      >
        <span className="flex items-center gap-2">
          <Radio selected={rentalLocation === "keystone"} />
          <span className="text-base">Keystone Resort</span>
        </span>
        <span className="pl-6 text-sm opacity-80">Cost: $100 — same day pickup</span>
      </button>
      <button
        type="button"
        onClick={() => setRentalLocation("frisco")}
        className="absolute left-[53%] top-[57%] flex h-[21%] w-[40%] cursor-pointer flex-col justify-center gap-1 overflow-hidden px-3 py-2 text-left leading-tight hover:bg-amber-900/10"
      >
        <span className="flex items-center gap-2">
          <Radio selected={rentalLocation === "frisco"} />
          <span className="text-base">Breeze In Frisco</span>
        </span>
        <span className="pl-6 text-sm opacity-80">Cost: $0 — saves $100!</span>
      </button>

      <div className="absolute left-[7%] top-[80%] flex h-[5%] w-[86%] items-center justify-center overflow-hidden text-center text-sm italic opacity-70">
        YeeStone is Calling
      </div>
    </div>
  );
}

export default FlightAndRentalSelect;
