import { NextRequest, NextResponse } from 'next/server';
import { supabaseEnsure } from '@/lib/supabase/gatewayClient';
// Use Web Crypto instead of Node 'crypto' for Edge runtime

export const runtime = 'edge';
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

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function stableHashToBigInt(input: string, hexDigits = 12): Promise<bigint> {
  const hex = (await sha256Hex(input)).slice(0, hexDigits);
  return BigInt('0x' + hex);
}

async function stableHashToInt31(input: string): Promise<number> {
  const hex = await sha256Hex(input);
  const first8 = hex.slice(0, 8);
  const u32 = parseInt(first8, 16) >>> 0; // 0..4294967295
  const int31 = u32 & 0x7fffffff; // 0..2147483647 fits Postgres int
  return int31;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const season = typeof body?.season === 'number' ? body.season : 2025;
  const url = body?.url || `https://fixturedownload.com/feed/json/epl-${season}`;

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return NextResponse.json({ error: `Failed to fetch fixture JSON: ${res.status} ${text}` }, { status: 502 });
  }
  const list = (await res.json()) as FixtureDownloadMatch[];

  const rows = await Promise.all(list.map(async (m) => {
    const isoDate = m.DateUtc.includes('T') ? m.DateUtc : m.DateUtc.replace(' ', 'T');
    const id = await stableHashToBigInt(`${season}:${m.HomeTeam}:${m.AwayTeam}:${isoDate}`);
    const homeId = await stableHashToInt31(`home:${m.HomeTeam}`);
    const awayId = await stableHashToInt31(`away:${m.AwayTeam}`);
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
  }));

  if (rows.length === 0) return NextResponse.json({ ok: true, season, imported: 0 });

  const data = await supabaseEnsure<{ id: string }[]>(req, {
    action: 'upsert',
    table: 'matches',
    values: rows,
    onConflict: 'id',
    returning: 'representation',
  });

  return NextResponse.json({ ok: true, season, imported: data?.length ?? 0 });
}

