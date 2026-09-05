export type ProfessionId = "finance-bro" | "musician" | "pastor" | "tech-bro";

export interface Profession {
  id: ProfessionId;
  name: string;
  location: string;
  startingVibe: number;
  startingMoney: number;
  description: string;
}

export type Segment = "title" | "profession-select";

export interface GamePlaythrough {
  currentSegment: Segment;
  profession?: Profession;
  vibePoints: number;
  money: number;
}
