import { z } from "zod";

// TODO(Phase 1): Zod schemas for tool inputs/outputs

export const SearchGamesInput = z.object({
  keyword: z.string().min(1),
  limit: z.number().int().positive().max(100).default(20),
});

export type SearchGamesInput = z.infer<typeof SearchGamesInput>;
