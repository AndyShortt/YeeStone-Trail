import { useEffect, useState } from "react";
import type { SegmentProps } from "../game/types";
import MapScreen from "./shared/MapScreen";
import OverlayPanel from "./shared/OverlayPanel";

const titleScreenImg = "/images/segment-0-title-screen.png";

type Overlay = "how-to-play" | "map" | "quit" | null;

function TitleScreen({ playthrough, onUpdate }: SegmentProps) {
  const [overlay, setOverlay] = useState<Overlay>(null);

  function start() {
    onUpdate((prev) => ({ ...prev, currentSegment: "name-entry" }));
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (overlay) return; // the open overlay owns the keyboard while it's up
      if (event.key === "1") start();
      else if (event.key === "2") setOverlay("how-to-play");
      else if (event.key === "3") setOverlay("map");
      else if (event.key === "4") setOverlay("quit");
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlay]);

  return (
    <div className="relative mx-auto aspect-square w-full max-w-xl select-none">
      <img
        src={titleScreenImg}
        alt="YeeStone Trail"
        className="h-full w-full"
        draggable={false}
      />

      <div className="absolute left-[4%] top-[76%] flex h-[19%] w-[92%] flex-col items-center justify-center gap-1 px-2 text-amber-100">
        <button
          type="button"
          onClick={start}
          className="cursor-pointer text-center text-2xl hover:text-amber-300"
        >
          1. Start YeeStone
        </button>
        <button
          type="button"
          onClick={() => setOverlay("how-to-play")}
          className="cursor-pointer text-center text-2xl hover:text-amber-300"
        >
          2. How to Play
        </button>
        <button
          type="button"
          onClick={() => setOverlay("map")}
          className="cursor-pointer text-center text-2xl hover:text-amber-300"
        >
          3. Map
        </button>
        <button
          type="button"
          onClick={() => setOverlay("quit")}
          className="cursor-pointer text-center text-2xl hover:text-amber-300"
        >
          4. Quit
        </button>
      </div>

      {overlay === "how-to-play" && (
        <OverlayPanel
          body={[
            "It's an annual ski trip with the guys.",
            "Make choices, keep your Vibe up, don't go broke.",
            "Ski hard, but a bad wipeout can end your trip early.",
          ]}
          onDismiss={() => setOverlay(null)}
        />
      )}

      {overlay === "map" && (
        <MapScreen playthrough={playthrough} onClose={() => setOverlay(null)} />
      )}

      {overlay === "quit" && (
        <OverlayPanel
          body={["Can't quit now — the mountain's calling.", "See you on the slopes."]}
          onDismiss={() => setOverlay(null)}
        />
      )}
    </div>
  );
}

export default TitleScreen;
