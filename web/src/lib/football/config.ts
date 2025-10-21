export const TOP_LEAGUE_IDS = [39, 140, 135, 78, 61, 2];

export function currentSeasonUtc(): number {
  const now = new Date();
  const year = now.getUTCFullYear();
  // Most European leagues span Aug-May; season named by start year
  const month = now.getUTCMonth() + 1; // 1-12
  return month >= 7 ? year : year - 1;
}


