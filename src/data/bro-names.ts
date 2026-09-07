// Fixed pool of first names for random flavor events and the ski-day
// leaderboard (§ 3.2, § 5.3 in GAME_FLOW.md) — sourced from the real YeeStone
// trip roster (research/YeeStone-themes.md § 9), first names only, per user
// request. Walter and Glen are deliberately excluded: they're already the
// game's fixed store-merchant NPCs, so reusing their names here would read as
// a confusing coincidence rather than a real person showing up twice.
export const BRO_NAMES = ["Jonathan", "Ben", "Mark", "Matt", "Austin", "Ryan", "Brad", "Jordan"] as const;

export function pickRandomBroName(): string {
  return BRO_NAMES[Math.floor(Math.random() * BRO_NAMES.length)];
}

/** Picks `count` distinct names from the pool (order not guaranteed). */
export function pickRandomBroNames(count: number): string[] {
  const pool = [...BRO_NAMES];
  const picked: string[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    picked.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return picked;
}
