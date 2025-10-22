export type PremierLeagueTeam = {
  slug: string;
  name: string;
  shortName: string;
  synonyms: string[];
};

function normalize(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export const PREMIER_LEAGUE_TEAMS: PremierLeagueTeam[] = [
  {
    slug: "arsenal",
    name: "Arsenal",
    shortName: "Arsenal",
    synonyms: ["Arsenal"],
  },
  {
    slug: "manchester-city",
    name: "Manchester City",
    shortName: "Man City",
    synonyms: ["Man City", "Manchester City", "City"],
  },
  {
    slug: "manchester-united",
    name: "Manchester United",
    shortName: "Man Utd",
    synonyms: ["Man Utd", "Manchester United", "United"],
  },
  {
    slug: "liverpool",
    name: "Liverpool",
    shortName: "Liverpool",
    synonyms: ["Liverpool"],
  },
  {
    slug: "tottenham-hotspur",
    name: "Tottenham Hotspur",
    shortName: "Spurs",
    synonyms: ["Spurs", "Tottenham", "Tottenham Hotspur"],
  },
  {
    slug: "newcastle-united",
    name: "Newcastle United",
    shortName: "Newcastle",
    synonyms: ["Newcastle", "Newcastle Utd", "Newcastle United"],
  },
  {
    slug: "aston-villa",
    name: "Aston Villa",
    shortName: "Aston Villa",
    synonyms: ["Aston Villa", "Villa"],
  },
  {
    slug: "everton",
    name: "Everton",
    shortName: "Everton",
    synonyms: ["Everton"],
  },
  {
    slug: "chelsea",
    name: "Chelsea",
    shortName: "Chelsea",
    synonyms: ["Chelsea"],
  },
  {
    slug: "brighton-and-hove-albion",
    name: "Brighton & Hove Albion",
    shortName: "Brighton",
    synonyms: ["Brighton", "Brighton and Hove", "Brighton & Hove Albion"],
  },
  {
    slug: "crystal-palace",
    name: "Crystal Palace",
    shortName: "Crystal Palace",
    synonyms: ["Crystal Palace", "Palace"],
  },
  {
    slug: "fulham",
    name: "Fulham",
    shortName: "Fulham",
    synonyms: ["Fulham"],
  },
  {
    slug: "west-ham-united",
    name: "West Ham United",
    shortName: "West Ham",
    synonyms: ["West Ham", "West Ham United"],
  },
  {
    slug: "wolverhampton-wanderers",
    name: "Wolverhampton Wanderers",
    shortName: "Wolves",
    synonyms: ["Wolves", "Wolverhampton", "Wolverhampton Wanderers"],
  },
  {
    slug: "brentford",
    name: "Brentford",
    shortName: "Brentford",
    synonyms: ["Brentford"],
  },
  {
    slug: "bournemouth",
    name: "AFC Bournemouth",
    shortName: "Bournemouth",
    synonyms: ["Bournemouth", "AFC Bournemouth"],
  },
  {
    slug: "burnley",
    name: "Burnley",
    shortName: "Burnley",
    synonyms: ["Burnley"],
  },
  {
    slug: "nottingham-forest",
    name: "Nottingham Forest",
    shortName: "Nott'm Forest",
    synonyms: ["Nott'm Forest", "Nottingham Forest", "Forest"],
  },
  {
    slug: "leeds-united",
    name: "Leeds United",
    shortName: "Leeds",
    synonyms: ["Leeds", "Leeds United"],
  },
  {
    slug: "sunderland",
    name: "Sunderland",
    shortName: "Sunderland",
    synonyms: ["Sunderland"],
  },
  {
    slug: "sheffield-united",
    name: "Sheffield United",
    shortName: "Sheff Utd",
    synonyms: ["Sheffield United", "Sheff Utd", "Sheffield Utd"],
  },
];

const synonymToTeamMap: Map<string, PremierLeagueTeam> = (() => {
  const m = new Map<string, PremierLeagueTeam>();
  for (const team of PREMIER_LEAGUE_TEAMS) {
    m.set(normalize(team.name), team);
    m.set(normalize(team.shortName), team);
    for (const s of team.synonyms) m.set(normalize(s), team);
  }
  return m;
})();

export function matchTeam(input: string): PremierLeagueTeam | null {
  const key = normalize(input);
  return synonymToTeamMap.get(key) ?? null;
}

export function normalizePlayerName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}


