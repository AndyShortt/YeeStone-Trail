// § 10: "Talk to the crew" (Denver Airport option 4, renamed "Tips from the
// guys") used to always show the same static line. Now a rotating pool of 6,
// mixing genuine gameplay hints with pure jokes — a lighter-weight sibling to
// bro-events.ts (no template/vibeDelta needed here, just flavor text).
export const CREW_TIPS = [
  "Easy on the Spicy Tacos if you're hitting the slopes, bathrooms are hard to come by.",
  "Did anyone hear the news report about Bigfoot at Keystone?",
  "Word to the wise: don't skip too many runs, or the boys will never let you live it down.",
  "Full Send on Black is no joke — but if you pull it off clean, you're basically legend status.",
  "Heard someone brought enough thermal gear to survive a blizzard. Smart money, honestly.",
  "Somebody swore they saw a UFO buzzing the cabin last night. Nobody believed them.",
] as const;

export function pickCrewTip(): string {
  return CREW_TIPS[Math.floor(Math.random() * CREW_TIPS.length)];
}
