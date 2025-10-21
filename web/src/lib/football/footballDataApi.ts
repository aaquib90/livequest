const BASE = 'https://api.football-data.org/v4';

export type FootballDataMatch = {
  id: number;
  utcDate: string;
  status: string;
  venue?: string | null;
  competition: { id: number; name: string };
  area?: { name?: string | null };
  season?: { startDate?: string | null };
  homeTeam: { id: number; name: string };
  awayTeam: { id: number; name: string };
  score?: { fullTime?: { home: number | null; away: number | null } };
};

export async function fetchFdMatchesByDate(date: string) {
  const key = process.env.FOOTBALL_DATA_KEY;
  if (!key) throw new Error('Missing FOOTBALL_DATA_KEY');

  const results: FootballDataMatch[] = [];
  let offset = 0;
  const limit = 100;
  while (true) {
    const url = new URL('/matches', BASE);
    url.searchParams.set('date', date);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('offset', String(offset));
    const res = await fetch(url, {
      headers: {
        'X-Auth-Token': key,
      },
      cache: 'no-store',
      next: { revalidate: 0 },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Football-Data error ${res.status}: ${text}`);
    }
    const json = await res.json();
    const page: FootballDataMatch[] = (json.matches || []) as FootballDataMatch[];
    results.push(...page);
    if (page.length < limit) break;
    offset += limit;
    if (offset > 2000) break; // hard stop
  }
  return results;
}


