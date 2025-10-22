export type Competition = {
  id: string; // stable slug
  name: string;
  country: string;
  leagueIdApiFootball?: number; // if needed elsewhere: EPL=39
};

export const COMPETITIONS: Competition[] = [
  { id: "premier-league", name: "Premier League", country: "England", leagueIdApiFootball: 39 },
];


