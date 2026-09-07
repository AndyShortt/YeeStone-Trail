import { useState } from "react";
import type { SegmentProps } from "../game/types";

const titleScreenImg = "/images/segment-0-title-screen.png";

function NameEntry({ onUpdate }: SegmentProps) {
  const [name, setName] = useState("");
  const trimmed = name.trim();

  function handleContinue() {
    if (!trimmed) return;
    onUpdate((prev) => ({
      ...prev,
      playerName: trimmed,
      displayName: trimmed,
      currentSegment: "profession-select",
    }));
  }

  return (
    <div className="relative mx-auto aspect-square w-full max-w-xl select-none">
      <img
        src={titleScreenImg}
        alt="YeeStone Trail"
        className="h-full w-full"
        draggable={false}
      />
      <div className="absolute left-[4%] top-[74%] flex h-[23%] w-[92%] flex-col items-center justify-center gap-2 px-[4%] text-amber-100">
        <label className="text-2xl" htmlFor="player-name">
          What's your name, bro?
        </label>
        <input
          id="player-name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value.slice(0, 20))}
          onKeyDown={(event) => {
            if (event.key === "Enter") handleContinue();
          }}
          maxLength={20}
          autoFocus
          className="w-full max-w-[280px] border border-amber-200/50 bg-black/40 px-2 py-1 text-center text-2xl text-amber-100 outline-none focus:border-amber-200"
        />
        <button
          type="button"
          onClick={handleContinue}
          disabled={!trimmed}
          className="cursor-pointer text-2xl text-amber-100 hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

export default NameEntry;
