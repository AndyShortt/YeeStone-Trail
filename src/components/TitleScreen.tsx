const titleScreenImg = "/images/segment-0-title-screen.png";

interface TitleScreenProps {
  onStart: () => void;
}

function TitleScreen({ onStart }: TitleScreenProps) {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-xl select-none">
      <img
        src={titleScreenImg}
        alt="YeeStone Trail"
        className="h-full w-full"
        draggable={false}
      />
      <button
        type="button"
        onClick={onStart}
        className="absolute left-[4%] top-[74%] flex h-[23%] w-[92%] flex-col items-center justify-center gap-2 text-amber-100 cursor-pointer"
      >
        <span className="text-xl font-bold tracking-wide animate-pulse">
          Press Start
        </span>
        <span className="text-sm opacity-80">Click to begin your trip</span>
      </button>
    </div>
  );
}

export default TitleScreen;
