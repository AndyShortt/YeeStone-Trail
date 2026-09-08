import type { StoreFoodOption, StoreItem } from "../game/types";

export const foodOptions: StoreFoodOption[] = [
  {
    id: "standard",
    cost: 20,
    vibeDelta: 10,
    hungerRestore: 25, // § 16: was 40 — meals were restoring too much relative to decay
  },
  {
    id: "risky",
    cost: 15,
    vibeDelta: 0,
    hungerRestore: 25, // § 16: was 40
  },
];

// § 9: the "standard" option now cycles through a rotating list of plain
// foods instead of a static "Standard" label — re-rolled each time the food
// menu is opened. "Risky" is always "Spicy Tacos" — no rotation there.
export const STANDARD_FOOD_NAMES = ["Burgers", "Hot Dogs", "Fries"] as const;

export function pickStandardFoodName(): string {
  return STANDARD_FOOD_NAMES[Math.floor(Math.random() * STANDARD_FOOD_NAMES.length)];
}

export function getFoodLabel(optionId: "standard" | "risky"): string {
  return optionId === "standard" ? pickStandardFoodName() : "Spicy Tacos";
}

export const storeItems: StoreItem[] = [
  { id: "drinks", label: "Drinks (Beer)", cost: 5, vibeDelta: 5 },
  { id: "snacks", label: "Snacks / Party Supplies", cost: 10, vibeDelta: 3 },
  { id: "gear", label: "Gear / Thermal Wear", cost: 30, vibeDelta: 0, oneTime: true },
];
