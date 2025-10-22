import data from "@/data/players-epl.json" assert { type: "json" };
import { buildPlayersIndex, type PlayersIndex } from "./players";

let cached: PlayersIndex | null = null;

export function getPremierLeaguePlayersIndex(): PlayersIndex {
  if (cached) return cached;
  // data is { name, team }[]
  cached = buildPlayersIndex(data as { name: string; team: string }[]);
  return cached;
}


