import type { StoreFoodOption, StoreItem } from "../game/types";

export const foodOptions: StoreFoodOption[] = [
  {
    id: "standard",
    label: "Standard",
    cost: 20,
    vibeDelta: 10,
    foodRiskIncrement: 0,
    hungerRestore: 40, // BALANCE-PATCH-2026-09-05, new — § 3.10
  },
  {
    id: "risky",
    label: "Spicy/Risky",
    cost: 15,
    vibeDelta: 0,
    foodRiskIncrement: 1,
    hungerRestore: 40, // BALANCE-PATCH-2026-09-05, new — § 3.10
  },
];

export const storeItems: StoreItem[] = [
  { id: "drinks", label: "Drinks (Beer)", cost: 5, vibeDelta: 5 },
  { id: "snacks", label: "Snacks / Party Supplies", cost: 10, vibeDelta: 3 },
  { id: "gear", label: "Gear / Thermal Wear", cost: 30, vibeDelta: 0, oneTime: true },
];
