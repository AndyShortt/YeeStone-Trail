// CabinArrival's "Talk to the bros" — a separate, similarly-static line that
// wasn't caught in the § 0 item 21 sweep that turned Denver Airport's "Talk
// to the crew" into a rotating pool (crew-tips.ts). Same idea, different
// moment: this is the just-arrived/settling-in catch-up, not pre-trip tips,
// so the lines lean toward "what's already happening at the cabin" rather
// than advice for the week ahead.
export const BRO_CATCHUP_LINES = [
  "The guys already have strong opinions about who's doing the Costco run tomorrow.",
  "Someone already called the top bunk. Fight amongst yourselves.",
  "The group chat's been blowing up since everyone landed — mostly arguing about dinner.",
  "Everybody's comparing gear like it's a runway show. No judgment. Okay, some judgment.",
  "Somebody's already retelling last year's stories like nobody's heard them. Nobody's heard them yet, actually.",
  "The guys are already taking bets on who crashes first this week.",
] as const;

export function pickBroCatchupLine(): string {
  return BRO_CATCHUP_LINES[Math.floor(Math.random() * BRO_CATCHUP_LINES.length)];
}
