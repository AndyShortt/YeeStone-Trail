import type { Profession } from "../game/types";

export const professions: Profession[] = [
  {
    id: "finance-bro",
    name: "Finance Bro From Charlotte",
    location: "Charlotte, NC",
    startingVibe: 45,
    startingMoney: 450, // BALANCE-PATCH-2026-09-05: was 800
  },
  {
    id: "musician",
    name: "Musician From Nashville",
    location: "Nashville, TN",
    startingVibe: 65,
    startingMoney: 250, // BALANCE-PATCH-2026-09-05: was 400
  },
  {
    id: "pastor",
    name: "Pastor From Alabama",
    location: "Alabama",
    startingVibe: 60,
    startingMoney: 300, // BALANCE-PATCH-2026-09-05: was 500
  },
  {
    id: "tech-bro",
    name: "Tech Bro From California",
    location: "California",
    startingVibe: 50,
    startingMoney: 350, // BALANCE-PATCH-2026-09-05: was 600
  },
];
