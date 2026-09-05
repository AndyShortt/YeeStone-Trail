import { useState } from "react";
import { professions } from "../data/professions";
import type { Profession } from "../game/types";

const professionSelectImg = "/images/segment-0b-profession-select.png";

interface ProfessionSelectProps {
  onSelect: (profession: Profession) => void;
}

const ROW_TOP = ["6%", "29.5%", "53%", "76.5%"];

function ProfessionSelect({ onSelect }: ProfessionSelectProps) {
  const [hovered, setHovered] = useState<Profession | null>(null);

  return (
    <div className="relative mx-auto aspect-square w-full max-w-xl select-none">
      <img
        src={professionSelectImg}
        alt="Choose your profession"
        className="h-full w-full"
        draggable={false}
      />

      {professions.map((profession, i) => (
        <button
          key={profession.id}
          type="button"
          onClick={() => onSelect(profession)}
          onMouseEnter={() => setHovered(profession)}
          onMouseLeave={() => setHovered(null)}
          className="absolute left-[8%] flex h-[17%] w-[84%] items-center justify-end pr-[6%] text-right text-amber-950 font-bold cursor-pointer hover:bg-amber-900/10"
          style={{ top: ROW_TOP[i] }}
        >
          {profession.name}
        </button>
      ))}

      <div className="absolute left-[8%] top-[86%] flex h-[10%] w-[84%] items-center justify-center px-2 text-center text-xs text-amber-950">
        {hovered
          ? `${hovered.name} (${hovered.location}) — ${hovered.description}`
          : "Choose your profession"}
      </div>
    </div>
  );
}

export default ProfessionSelect;
