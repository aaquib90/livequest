import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/adminClient';
import { fetchFixtures } from '@/lib/football/api';
import { TOP_LEAGUE_IDS, currentSeasonUtc } from '@/lib/football/config';

export async function POST(req: NextRequest) {
  const supabase = createAdminClient();
  const body = await req.json().catch(() => ({}));
  const requiredSecret = process.env.CRON_SECRET;
  if (requiredSecret) {
    const headerSecret = req.headers.get('x-cron-secret');
    const bodySecret = typeof body?.secret === 'string' ? body.secret : undefined;
    if (headerSecret !== requiredSecret && bodySecret !== requiredSecret) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }
  const leagueIds: number[] = Array.isArray(body?.leagueIds) && body.leagueIds.length ? body.leagueIds : TOP_LEAGUE_IDS;
  const days: number = typeof body?.days === 'number' && body.days > 0 ? body.days : 7;

  const season = currentSeasonUtc();
  const today = new Date();
  const from = today.toISOString().slice(0, 10);
  const toDate = new Date(today);
  toDate.setUTCDate(toDate.getUTCDate() + days);
  const to = toDate.toISOString().slice(0, 10);

  let totalUpserts = 0;
  for (const league of leagueIds) {
    const fixtures = await fetchFixtures({ league, season, from, to });
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

    const { error, count } = await supabase
      .from('matches')
      .upsert(rows, { onConflict: 'id' })
      .select('*', { count: 'exact', head: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    totalUpserts += count ?? 0;
  }

  return NextResponse.json({ ok: true, upserted: totalUpserts, season, range: { from, to } });
}


