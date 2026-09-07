import type { ReactNode } from "react";

interface TravelSceneProps {
  bgSrc: string;
  bgAlt: string;
  vehicleSrc: string;
  vehicleAlt: string;
  /** 0-1, clamped. Position along the route. */
  progress: number;
  /** Reverses travel direction (right-to-left) and mirrors the vehicle sprite to face that way. */
  flip?: boolean;
  landmarkSrc?: string;
  landmarkAlt?: string;
  /** Vertical anchor for the vehicle sprite, as a % `top`. Each background's path/road sits at a different height, so this isn't one-size-fits-all — default suits the flight screen's open sky. */
  vehicleTopPct?: number;
  /** Same, for the landmark icon. */
  landmarkTopPct?: number;
  onClick?: () => void;
  children?: ReactNode;
}

const VEHICLE_LEFT_MIN = 8;
const VEHICLE_LEFT_MAX = 76;
const LANDMARK_LEFT = 84;
const LANDMARK_FADE_IN_AT = 0.75;
const DEFAULT_VEHICLE_TOP_PCT = 42;
const DEFAULT_LANDMARK_TOP_PCT = 38;

/**
 * Shared visual chassis for the 3 base progression screens (flight/drive/
 * walk): a vehicle/character icon sliding across a background plate toward
 * an optional destination landmark icon, Oregon-Trail-travel-screen style.
 * Keeps the 3 screens' art direction/behavior consistent by construction
 * rather than by convention.
 */
function TravelScene({
  bgSrc,
  bgAlt,
  vehicleSrc,
  vehicleAlt,
  progress,
  flip = false,
  landmarkSrc,
  landmarkAlt,
  vehicleTopPct = DEFAULT_VEHICLE_TOP_PCT,
  landmarkTopPct = DEFAULT_LANDMARK_TOP_PCT,
  onClick,
  children,
}: TravelSceneProps) {
  const t = Math.max(0, Math.min(1, progress));
  const span = VEHICLE_LEFT_MAX - VEHICLE_LEFT_MIN;
  const vehicleLeft = flip ? VEHICLE_LEFT_MAX - t * span : VEHICLE_LEFT_MIN + t * span;
  const landmarkVisible = Boolean(landmarkSrc) && t >= LANDMARK_FADE_IN_AT;
  const landmarkOpacity = landmarkVisible
    ? Math.min(1, (t - LANDMARK_FADE_IN_AT) / (1 - LANDMARK_FADE_IN_AT))
    : 0;

  return (
    <div
      className="relative mx-auto aspect-square w-full max-w-xl select-none overflow-hidden text-amber-950"
      onClick={onClick}
    >
      <img src={bgSrc} alt={bgAlt} className="absolute inset-0 h-full w-full object-cover" draggable={false} />

      {landmarkSrc && (
        <img
          src={landmarkSrc}
          alt={landmarkAlt}
          className="absolute w-[13%] transition-opacity duration-700"
          style={{ left: `${LANDMARK_LEFT}%`, top: `${landmarkTopPct}%`, opacity: landmarkOpacity }}
          draggable={false}
        />
      )}

      <img
        src={vehicleSrc}
        alt={vehicleAlt}
        className="absolute w-[15%] drop-shadow-md transition-[left] duration-200 ease-linear"
        style={{ left: `${vehicleLeft}%`, top: `${vehicleTopPct}%`, transform: flip ? "scaleX(-1)" : undefined }}
        draggable={false}
      />

      {children}
    </div>
  );
}

export default TravelScene;
