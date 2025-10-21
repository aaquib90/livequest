export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/serverClient';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);

  const country = searchParams.get('country') ?? undefined;
  const leagueId = searchParams.get('league_id') ? Number(searchParams.get('league_id')) : undefined;
  const season = searchParams.get('season') ? Number(searchParams.get('season')) : undefined;
  const from = searchParams.get('from') ?? undefined; // ISO date
  const to = searchParams.get('to') ?? undefined; // ISO date
  const status = searchParams.get('status') ?? undefined;

  let query = supabase.from('matches').select('*');
  if (country) query = query.eq('country', country);
  if (leagueId) query = query.eq('league_id', leagueId);
  if (season) query = query.eq('season', season);
  if (from) query = query.gte('date', from);
  if (to) query = query.lte('date', to);
  if (status) query = query.eq('status', status);
  query = query.order('date', { ascending: true });

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}


