import { useEffect } from "react";
import { professions } from "../data/professions";
import type { Profession, SegmentProps } from "../game/types";

const professionSelectImg = "/images/segment-0b-profession-select.png";
const jonathanImg = "/images/npc-jonathan-cowboy.png";

// Pixel-measured against the actual PNG (scanned for the card border lines),
// not eyeballed — each card's real interior runs ~17-19% tall, and the tops
// are ~4% / 24.5% / 45.3% / 66% (evenly spaced ~20.7% apart), not the
// previous 23.5%-apart guess, which drifted far enough by row 4 to visibly
// clip. Small inset from each card's own top border.
const ROW_TOP = ["5%", "25.5%", "46%", "67%"];
// Icon art ends at ~22.5%. Text box starts a bit before that (right-aligned
// content only reaches as far left as it needs, so this is just headroom) —
// widened from an earlier 25%-90% box after measuring that "Finance Bro From
// Charlotte" needs ~65% of the square's width unwrapped at this font size,
// which didn't fit in that box's ~62% effective width net of padding.
const TEXT_LEFT = "20%";
const TEXT_WIDTH = "70%"; // 20% -> 90%, safely inside each card's own border

function ProfessionSelect({ onUpdate }: SegmentProps) {
  function handleSelect(profession: Profession) {
    onUpdate((prev) => ({
      ...prev,
      profession,
      vibePoints: profession.startingVibe,
      money: profession.startingMoney,
      currentSegment: "flight-and-rental-select",
    }));
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const index = Number(event.key) - 1;
      if (index >= 0 && index < professions.length) {
        handleSelect(professions[index]);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative mx-auto aspect-square w-full max-w-xl select-none">
      <img
        src={professionSelectImg}
        alt="Choose your profession"
        className="h-full w-full"
        draggable={false}
      />

      {professions.map((profession, i) => (
        <div key={profession.id} className="absolute left-0 h-[17.5%] w-full" style={{ top: ROW_TOP[i] }}>
          <span className="absolute left-[4%] top-[1%] text-2xl leading-none text-amber-950 opacity-70">
            {i + 1}.
          </span>
          <button
            type="button"
            onClick={() => handleSelect(profession)}
            className="absolute flex h-full cursor-pointer flex-col items-end justify-start overflow-hidden pt-[1%] pr-[1.5%] text-right text-amber-950 hover:bg-amber-900/10"
            style={{ left: TEXT_LEFT, width: TEXT_WIDTH }}
          >
            <span className="whitespace-nowrap text-base leading-none sm:text-4xl">{profession.name}</span>
            <span className="whitespace-nowrap text-[0.6rem] leading-tight opacity-80 sm:whitespace-normal sm:text-2xl sm:leading-none">
              Cash: ${profession.startingMoney} — Starting Bragging Rights Level: {profession.startingVibe}
            </span>
          </button>
        </div>
      ))}

      <div className="absolute left-[8%] top-[86%] flex h-[10%] w-[84%] items-center justify-center overflow-hidden px-2 text-center text-sm leading-tight text-amber-950 sm:text-2xl">
        Where you coming from YeeDaddy?
      </div>

      <img
        src={jonathanImg}
        alt="Jonathan, the trip organizer, dressed as a cowboy"
        className="pointer-events-none absolute bottom-0 right-[-18%] w-[26%] select-none"
        draggable={false}
      />
    </div>
  );
}

export default ProfessionSelect;
