import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/adminClient';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const maxDuration = 300;

type FixtureDownloadMatch = {
  MatchNumber: number;
  RoundNumber: number;
  DateUtc: string; // "2025-08-15 19:00:00Z"
  Location: string | null;
  HomeTeam: string;
  AwayTeam: string;
  HomeTeamScore: number | null;
  AwayTeamScore: number | null;
};

function stableHashToBigInt(input: string, hexDigits = 12): bigint {
  const hex = crypto.createHash('sha256').update(input).digest('hex').slice(0, hexDigits);
  return BigInt('0x' + hex);
}

function stableHashToInt31(input: string): number {
  const buf = crypto.createHash('sha256').update(input).digest();
  const u32 = (buf.readUInt32BE(0)) >>> 0; // 0..4294967295
  const int31 = u32 & 0x7fffffff; // 0..2147483647 fits Postgres int
  return int31;
}

export async function POST(req: NextRequest) {
  const supabase = createAdminClient();
  const body = await req.json().catch(() => ({}));
  const season = typeof body?.season === 'number' ? body.season : 2025;
  const url = body?.url || `https://fixturedownload.com/feed/json/epl-${season}`;

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return NextResponse.json({ error: `Failed to fetch fixture JSON: ${res.status} ${text}` }, { status: 502 });
  }
  const list = (await res.json()) as FixtureDownloadMatch[];

  const rows = list.map((m) => {
    const isoDate = m.DateUtc.includes('T') ? m.DateUtc : m.DateUtc.replace(' ', 'T');
    const id = stableHashToBigInt(`${season}:${m.HomeTeam}:${m.AwayTeam}:${isoDate}`);
    const homeId = stableHashToInt31(`home:${m.HomeTeam}`);
    const awayId = stableHashToInt31(`away:${m.AwayTeam}`);
    const finished = m.HomeTeamScore != null && m.AwayTeamScore != null;
    return {
      id: id.toString(), // Supabase will coerce to bigint
      league_id: 39,
      league_name: 'Premier League',
      country: 'England',
      season,
      date: new Date(isoDate).toISOString(),
      status: finished ? 'FT' : 'NS',
      venue: m.Location || null,
      home_team_id: homeId,
      home_team_name: m.HomeTeam,
      away_team_id: awayId,
      away_team_name: m.AwayTeam,
      home_goals: m.HomeTeamScore,
      away_goals: m.AwayTeamScore,
      score: finished ? { fulltime: { home: m.HomeTeamScore, away: m.AwayTeamScore } } : null,
      raw: m,
    } as Record<string, unknown>;
  });

  if (rows.length === 0) return NextResponse.json({ ok: true, season, imported: 0 });

  const { error, data } = await supabase
    .from('matches')
    .upsert(rows, { onConflict: 'id' })
    .select('id');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, season, imported: data?.length ?? 0 });
}


