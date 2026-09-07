interface ProgressStatusBarProps {
  day: string;
  weather: string;
  health: string;
  hunger: string;
  nextLandmark: string;
  progressLabel: string;
}

/**
 * Oregon-Trail-style status readout pinned along the bottom of the flight/
 * drive progression screens — deliberately slim (not the full-height shared
 * OverlayPanel) so the scene above it (the plane, or the 3-lane dodge game)
 * keeps most of the frame.
 */
function ProgressStatusBar({ day, weather, health, hunger, nextLandmark, progressLabel }: ProgressStatusBarProps) {
  return (
    <div className="absolute inset-x-0 bottom-0 border-t-4 border-amber-950 bg-amber-100/95 px-[3%] py-[1.2%]">
      <div className="grid grid-cols-2 gap-x-4 gap-y-0 text-sm leading-tight sm:text-base">
        <p>Day: {day}</p>
        <p>Weather: {weather}</p>
        <p>Health: {health}</p>
        <p>Food: {hunger}</p>
        <p>Next landmark: {nextLandmark}</p>
        <p>{progressLabel}</p>
      </div>
    </div>
  );
}

export default ProgressStatusBar;
