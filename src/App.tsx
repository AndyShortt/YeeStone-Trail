import { useState } from "react";
import ProfessionSelect from "./components/ProfessionSelect";
import TitleScreen from "./components/TitleScreen";
import type { GamePlaythrough } from "./game/types";

const initialState: GamePlaythrough = {
  currentSegment: "title",
  vibePoints: 0,
  money: 0,
};

function App() {
  const [playthrough, setPlaythrough] = useState<GamePlaythrough>(initialState);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      {playthrough.currentSegment === "title" && (
        <TitleScreen
          onStart={() =>
            setPlaythrough((prev) => ({ ...prev, currentSegment: "profession-select" }))
          }
        />
      )}

      {playthrough.currentSegment === "profession-select" && (
        <ProfessionSelect
          onSelect={(profession) =>
            setPlaythrough((prev) => ({
              ...prev,
              profession,
              vibePoints: profession.startingVibe,
              money: profession.startingMoney,
            }))
          }
        />
      )}
    </div>
  );
}

export default App;
