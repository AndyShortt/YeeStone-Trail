import { applySpend } from "../game/economy";
import type { SegmentProps } from "../game/types";

const skiRentalImg = "/images/segment-0c-ski-rental.png";

function SkiRentalSelect({ onUpdate }: SegmentProps) {
  function choose(skiRentalLocation: "keystone" | "frisco") {
    onUpdate((prev) => {
      if (skiRentalLocation !== "keystone") {
        return { ...prev, skiRentalLocation, currentSegment: "flight-progress" };
      }
      const spend = applySpend(prev, 100);
      return {
        ...prev,
        skiRentalLocation,
        money: spend.money,
        vibePoints: prev.vibePoints + spend.vibeDelta,
        wentBrokeTriggered: spend.wentBrokeTriggered,
        eventLog: spend.eventLogAppend ? [...prev.eventLog, spend.eventLogAppend] : prev.eventLog,
        currentSegment: "flight-progress",
      };
    });
  }

  function back() {
    onUpdate((prev) => ({ ...prev, currentSegment: "flight-time-select" }));
  }

  return (
    <div className="relative mx-auto aspect-square w-full max-w-xl select-none text-amber-950">
      <img
        src={skiRentalImg}
        alt="Choose your ski rental"
        className="h-full w-full"
        draggable={false}
      />

      <button
        type="button"
        onClick={() => choose("keystone")}
        className="absolute left-[10%] top-[17%] flex h-[23%] w-[80%] cursor-pointer flex-col items-center justify-center gap-0.5 overflow-hidden px-1 text-center leading-tight hover:bg-amber-900/10"
      >
        <span className="text-lg">1. RENT AT KEYSTONE RESORT</span>
        <span className="text-base">Cost: $100</span>
        <span className="text-base">Pickup: Same day at Keystone</span>
      </button>

      <button
        type="button"
        onClick={() => choose("frisco")}
        className="absolute left-[10%] top-[42%] flex h-[22%] w-[80%] cursor-pointer flex-col items-center justify-center gap-0.5 overflow-hidden px-1 text-center leading-tight hover:bg-amber-900/10"
      >
        <span className="text-lg">2. BREEZE IN FRISCO (Budget Option)</span>
        <span className="text-base">Cost: $0 (saves $100!)</span>
        <span className="text-base">Pickup: Frisco... or not Frisco</span>
      </button>

      <button
        type="button"
        onClick={back}
        className="absolute left-[10%] top-[66%] h-[7%] w-[80%] cursor-pointer text-xl hover:text-amber-700"
      >
        3. Back / Change Mind
      </button>
    </div>
  );
}

export default SkiRentalSelect;
