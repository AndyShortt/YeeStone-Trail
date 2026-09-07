import type { SegmentProps } from "../game/types";

// Reuses the ski-rental laptop screen (per user request: flight booking should
// look like the same online-booking-on-a-laptop moment as ski rental, not a
// separate physical-airport departures-board scene). Same blank-zone geometry
// as SkiRentalSelect since it's literally the same background image.
const flightTimeImg = "/images/segment-0c-ski-rental.png";

function FlightTimeSelect({ onUpdate }: SegmentProps) {
  function choose(flightTime: "early" | "late") {
    onUpdate((prev) => ({ ...prev, flightTime, currentSegment: "ski-rental-select" }));
  }

  function back() {
    onUpdate((prev) => ({ ...prev, currentSegment: "profession-select" }));
  }

  return (
    <div className="relative mx-auto aspect-square w-full max-w-xl select-none text-amber-950">
      <img
        src={flightTimeImg}
        alt="Pick your flight time"
        className="h-full w-full"
        draggable={false}
      />

      <button
        type="button"
        onClick={() => choose("early")}
        className="absolute left-[10%] top-[17%] flex h-[23%] w-[80%] cursor-pointer flex-col items-center justify-center gap-0.5 overflow-hidden px-1 text-center leading-tight hover:bg-amber-900/10"
      >
        <span className="text-lg">1. EARLY MORNING FLIGHT</span>
        <span className="text-base">Get in early, load up on tacos</span>
      </button>

      <button
        type="button"
        onClick={() => choose("late")}
        className="absolute left-[10%] top-[42%] flex h-[22%] w-[80%] cursor-pointer flex-col items-center justify-center gap-0.5 overflow-hidden px-1 text-center leading-tight hover:bg-amber-900/10"
      >
        <span className="text-lg">2. LATE EVENING FLIGHT</span>
        <span className="text-base">Fashionably late</span>
      </button>

      <button
        type="button"
        onClick={back}
        className="absolute left-[10%] top-[66%] h-[7%] w-[80%] cursor-pointer text-xl hover:text-amber-700"
      >
        3. Back / Can't decide
      </button>
    </div>
  );
}

export default FlightTimeSelect;
