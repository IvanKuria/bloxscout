// TODO(Phase 1): expand domain types as more endpoints land.

export type RobloxGameId = number;
export type RobloxUserId = number;

export interface Game {
  id: RobloxGameId;
  name: string;
  description?: string;
  creatorId: number;
  visits: number;
  playing: number;
  favorites: number;
  rating?: number;
  created: string;
  updated: string;
}
