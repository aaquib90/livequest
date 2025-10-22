import { normalizePlayerName, matchTeam, type PremierLeagueTeam } from "./teams";

export type PlayerRecord = {
  id: string; // normalized unique id: name__teamSlug
  name: string;
  teamNameRaw: string;
  team: PremierLeagueTeam | null;
};

export type PlayersIndex = {
  byId: Map<string, PlayerRecord>;
  byName: Map<string, PlayerRecord[]>; // normalized name -> possible matches
  byTeamSlug: Map<string, PlayerRecord[]>;
};

export function buildPlayersIndex(players: { name: string; team: string }[]): PlayersIndex {
  const byId = new Map<string, PlayerRecord>();
  const byName = new Map<string, PlayerRecord[]>();
  const byTeamSlug = new Map<string, PlayerRecord[]>();

  for (const row of players) {
    const team = matchTeam(row.team);
    const id = `${normalizePlayerName(row.name)}__${team?.slug ?? normalizePlayerName(row.team)}`;
    const rec: PlayerRecord = { id, name: row.name, teamNameRaw: row.team, team };
    byId.set(id, rec);

    const n = normalizePlayerName(row.name);
    const listByName = byName.get(n) ?? [];
    listByName.push(rec);
    byName.set(n, listByName);

    const teamKey = team?.slug ?? "unknown";
    const listByTeam = byTeamSlug.get(teamKey) ?? [];
    listByTeam.push(rec);
    byTeamSlug.set(teamKey, listByTeam);
  }

  return { byId, byName, byTeamSlug };
}

export function findPlayersByName(index: PlayersIndex, query: string): PlayerRecord[] {
  const key = normalizePlayerName(query);
  return index.byName.get(key) ?? [];
}

export function findPlayersByTeam(index: PlayersIndex, teamInput: string): PlayerRecord[] {
  const team = matchTeam(teamInput);
  const key = team?.slug ?? "unknown";
  return index.byTeamSlug.get(key) ?? [];
}


