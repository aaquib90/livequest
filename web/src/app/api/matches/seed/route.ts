import { NextRequest, NextResponse } from 'next/server';
import { supabaseEnsure } from '@/lib/supabase/gatewayClient';
import { fetchFixturesRangePaged, fetchFixturesByDatePaged } from '@/lib/football/api';
import { fetchFdMatchesByDate } from '@/lib/football/footballDataApi';
import { TOP_LEAGUE_IDS, currentSeasonUtc } from '@/lib/football/config';

export const runtime = 'edge';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  const secret = process.env.CRON_SECRET;
  if (secret) {
    const headerSecret = req.headers.get('x-cron-secret');
    const bodySecret = typeof body?.secret === 'string' ? body.secret : undefined;
    if (headerSecret !== secret && bodySecret !== secret) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  const leagueIds: number[] = Array.isArray(body?.leagueIds) && body.leagueIds.length ? body.leagueIds : TOP_LEAGUE_IDS;
  const season: number = typeof body?.season === 'number' ? body.season : currentSeasonUtc();
  const date: string | undefined = typeof body?.date === 'string' ? body.date : undefined;
  const from: string = body?.from || new Date().toISOString().slice(0, 10);
  const to: string = body?.to || (() => { const d = new Date(); d.setUTCMonth(d.getUTCMonth() + 3); return d.toISOString().slice(0,10); })();
  const windowDays: number = typeof body?.windowDays === 'number' ? body.windowDays : 7;

  let totalUpserted = 0;
  let totalFetched = 0;
  const perLeague: Array<{ league: number; fetched: number; upserted: number }> = [];
  if (date) {
    const provider: string | undefined = typeof body?.provider === 'string' ? body.provider : undefined;
    const fixtures = provider === 'fd' ? await fetchFdMatchesByDate(date) : await fetchFixturesByDatePaged(date);
    totalFetched += fixtures.length;
    const rows = fixtures.map((f: any) => {
      if (provider === 'fd') {
        const full = f as any;
        return {
          id: full.id,
          league_id: full.competition?.id,
          league_name: full.competition?.name,
          country: full.area?.name ?? 'Unknown',
          season: Number((full.season?.startDate || '0').slice(0,4)) || new Date(full.utcDate).getUTCFullYear(),
          date: full.utcDate,
          status: full.status?.substring(0, 8) || 'NS',
          venue: full.venue ?? null,
          home_team_id: full.homeTeam?.id,
          home_team_name: full.homeTeam?.name,
          away_team_id: full.awayTeam?.id,
          away_team_name: full.awayTeam?.name,
          home_goals: full.score?.fullTime?.home ?? null,
          away_goals: full.score?.fullTime?.away ?? null,
          score: full.score ?? null,
          raw: full,
        };
      }
      return {
        id: f.fixture.id,
        league_id: f.league.id,
        league_name: f.league.name,
        country: f.league.country,
        season: f.league.season,
        date: f.fixture.date,
        status: f.fixture.status?.short,
        venue: f.fixture.venue?.name ?? null,
        home_team_id: f.teams.home.id,
        home_team_name: f.teams.home.name,
        away_team_id: f.teams.away.id,
        away_team_name: f.teams.away.name,
        home_goals: f.goals.home,
        away_goals: f.goals.away,
        score: f.score,
        raw: f,
      };
    });
    if (rows.length === 0) {
      return NextResponse.json({ ok: true, season, range: { from, to, date }, fetched: 0, upserted: 0, perLeague: [] });
    }
    const data = await supabaseEnsure<{ id: string }[]>(req, {
      action: 'upsert',
      table: 'matches',
      values: rows,
      onConflict: 'id',
      returning: 'representation',
    });
    const upserted = data?.length ?? 0;
    totalUpserted += upserted;
    // Summaries per league
    const perLeagueMap = new Map<number, { league: number; fetched: number; upserted: number }>();
    for (const f of fixtures) {
      const lid = (provider === 'fd' ? (f.competition?.id as number) : (f.league.id as number));
      const s = perLeagueMap.get(lid) || { league: lid, fetched: 0, upserted: 0 };
      s.fetched += 1;
      perLeagueMap.set(lid, s);
    }
    perLeague.push(...Array.from(perLeagueMap.values()));
  } else {
    for (const league of leagueIds) {
      const fixtures = await fetchFixturesRangePaged({ league, season, from, to, windowDays });
      totalFetched += fixtures.length;
      const rows = fixtures.map((f: any) => ({
        id: f.fixture.id,
        league_id: f.league.id,
        league_name: f.league.name,
        country: f.league.country,
        season: f.league.season,
        date: f.fixture.date,
        status: f.fixture.status?.short,
        venue: f.fixture.venue?.name ?? null,
        home_team_id: f.teams.home.id,
        home_team_name: f.teams.home.name,
        away_team_id: f.teams.away.id,
        away_team_name: f.teams.away.name,
        home_goals: f.goals.home,
        away_goals: f.goals.away,
        score: f.score,
        raw: f,
      }));
      if (rows.length === 0) continue;
      const data = await supabaseEnsure<{ id: string }[]>(req, {
        action: 'upsert',
        table: 'matches',
        values: rows,
        onConflict: 'id',
        returning: 'representation',
      });
      const upserted = data?.length ?? 0;
      totalUpserted += upserted;
      perLeague.push({ league, fetched: fixtures.length, upserted });
    }
  }

  return NextResponse.json({ ok: true, season, range: { from, to, date }, fetched: totalFetched, upserted: totalUpserted, perLeague });
}
