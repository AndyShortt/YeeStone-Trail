import type { BroEventPool } from "../game/types";

export const broEvents: BroEventPool = {
  good: [
    { template: "{name} tells the one about the moose again. Somehow still funny.", vibeDelta: 2 },
    { template: "{name} nailed an acoustic cover by the fire.", vibeDelta: 3 },
    { template: "{name} beat you down the slope — bragging rights secured.", vibeDelta: 5, skiDayOnly: true },
    { template: "{name} patched up a stranger's blister with the first-aid kit. Good guy.", vibeDelta: 2 },
    { template: "{name} leads an impromptu toast by the fire.", vibeDelta: 3 },
    { template: "{name}'s ski app says you're crushing it today.", vibeDelta: 2 },
  ],
  bad: [
    { template: "{name} won't stop talking about his knees.", vibeDelta: -2 },
    { template: "{name}'s phone died and now he's hunting for a charger.", vibeDelta: -1 },
    { template: "{name} won't stop talking about the conditions report.", vibeDelta: -2 },
    { template: "{name}'s on a work call mid-hangout, again.", vibeDelta: -2 },
    { template: "{name}'s dietary restrictions make dinner planning a whole thing.", vibeDelta: -1 },
    { template: "{name} lost his phone in the snow.", vibeDelta: -3 },
  ],
};
