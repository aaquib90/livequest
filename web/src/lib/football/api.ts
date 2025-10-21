const BASE = 'https://v3.football.api-sports.io';

type FetchFixturesParams = {
  league: number;
  season: number;
  from?: string; // yyyy-mm-dd
  to?: string;   // yyyy-mm-dd
  status?: string; // API-Football status short codes e.g., NS, LIVE, FT
};

export async function fetchFixtures(params: FetchFixturesParams) {
  if (!process.env.APIFOOTBALL_KEY) {
    throw new Error('Missing APIFOOTBALL_KEY');
  }
  const url = new URL('/fixtures', BASE);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  });
  const res = await fetch(url, {
    headers: {
      'x-apisports-key': process.env.APIFOOTBALL_KEY,
    },
    // Server-only fetch
    cache: 'no-store',
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API-Football error ${res.status}: ${text}`);
  }
  const json = await res.json();
  return json.response as any[];
}

// Helper to fetch in smaller date windows to avoid result caps
export async function fetchFixturesRangePaged(args: { league: number; season: number; from: string; to: string; windowDays?: number }) {
  const windowDays = Math.max(1, Math.min(30, args.windowDays ?? 7));
  const results: any[] = [];
  let cursor = new Date(args.from + 'T00:00:00Z');
  const end = new Date(args.to + 'T00:00:00Z');
  while (cursor <= end) {
    const chunkFrom = cursor.toISOString().slice(0, 10);
    const chunkEnd = new Date(cursor);
    chunkEnd.setUTCDate(chunkEnd.getUTCDate() + windowDays);
    const chunkTo = (chunkEnd <= end ? chunkEnd : end).toISOString().slice(0, 10);
    const part = await fetchFixtures({ league: args.league, season: args.season, from: chunkFrom, to: chunkTo });
    results.push(...part);
    cursor = new Date(chunkEnd);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return results;
}

export async function fetchFixturesByDatePaged(date: string) {
  if (!process.env.APIFOOTBALL_KEY) throw new Error('Missing APIFOOTBALL_KEY');
  const all: any[] = [];
  let page = 1;
  while (true) {
    const url = new URL('/fixtures', BASE);
    url.searchParams.set('date', date);
    url.searchParams.set('page', String(page));
    const res = await fetch(url, {
      headers: { 'x-apisports-key': process.env.APIFOOTBALL_KEY },
      cache: 'no-store',
      next: { revalidate: 0 },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`API-Football error ${res.status}: ${text}`);
    }
    const json = await res.json();
    const response = (json.response || []) as any[];
    all.push(...response);
    const paging = json.paging || { current: page, total: page };
    if (!paging.total || page >= paging.total) break;
    page += 1;
  }
  return all;
}


