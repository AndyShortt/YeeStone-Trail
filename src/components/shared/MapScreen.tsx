import type { GamePlaythrough } from "../../game/types";

const mapScreenImg = "/images/special-map-screen.png";

interface MapScreenProps {
  playthrough: GamePlaythrough;
  onClose: () => void;
}

function getTripInfo({ currentSegment, currentSkiDay }: GamePlaythrough): {
  day: string;
  location: string;
} {
  switch (currentSegment) {
    case "flight-progress":
    case "drive-progress":
      return { day: "Wednesday", location: "In transit" };
    case "denver-airport":
      return { day: "Wednesday", location: "Denver, CO" };
    case "cabin-arrival":
      return { day: "Wednesday", location: "Keystone, CO" };
    case "walk-to-resort":
    case "ski-day":
    case "walk-to-cabin":
    case "cabin-evening": {
      const day = currentSkiDay
        ? currentSkiDay.charAt(0).toUpperCase() + currentSkiDay.slice(1)
        : "Keystone";
      return { day, location: "Keystone, CO" };
    }
    case "journey-home":
    case "ending":
    case "ending-injured":
      return { day: "Sunday", location: "Keystone, CO" };
    default:
      return { day: "—", location: "—" };
  }
}

function MapScreen({ playthrough, onClose }: MapScreenProps) {
  const { day, location } = getTripInfo(playthrough);

  return (
    <div className="absolute inset-0 z-20 select-none">
      <img src={mapScreenImg} alt="Trip map" className="h-full w-full" draggable={false} />

      <div className="absolute left-[4%] top-[65%] flex h-[12%] w-[21%] flex-col justify-center gap-0.5 overflow-hidden px-1 text-xs leading-tight text-amber-950">
        <p>✈ Flight</p>
        <p>— Out</p>
        <p>- - Back</p>
      </div>

      <div className="absolute left-[58%] top-[65%] flex h-[12%] w-[39%] flex-col justify-center gap-0.5 overflow-hidden px-1 text-sm leading-tight text-amber-950">
        <p>Day: {day}</p>
        <p>{location}</p>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="absolute left-[2%] top-[82%] h-[14%] w-[96%] cursor-pointer text-lg text-amber-950 hover:text-amber-700"
      >
        1. Back / Return to game
      </button>
    </div>
  );
}

export default MapScreen;
