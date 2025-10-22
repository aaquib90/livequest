import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/adminClient';

export const runtime = 'edge';

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  } as Record<string, string>;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors() });
}

type ReactionType = 'smile' | 'heart' | 'thumbs_up';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const liveblogId = params.id;
    if (!liveblogId) return NextResponse.json({ error: 'bad_request' }, { status: 400, headers: cors() });

    const url = new URL(req.url);
    const idsParam = url.searchParams.get('updateIds') || '';
    const deviceId = url.searchParams.get('deviceId') || '';
    const updateIds = idsParam.split(',').map((s) => s.trim()).filter(Boolean);
    if (!updateIds.length) {
      return NextResponse.json({ error: 'missing_updateIds' }, { status: 400, headers: cors() });
    }

    const supa = createAdminClient();

    // Validate liveblog visibility
    const { data: lb } = await supa
      .from('liveblogs')
      .select('id,privacy,status')
      .eq('id', liveblogId)
      .single();
    if (!lb || lb.status !== 'active' || !['public','unlisted'].includes(lb.privacy)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403, headers: cors() });
    }

    // Ensure all updateIds belong to this liveblog
    const { data: ups } = await supa
      .from('updates')
      .select('id')
      .in('id', updateIds)
      .eq('liveblog_id', liveblogId);
    const validIds = new Set((ups || []).map((u) => u.id));
    const filteredIds = updateIds.filter((id) => validIds.has(id));
    if (!filteredIds.length) {
      return NextResponse.json({ counts: {}, active: {} }, { status: 200, headers: cors() });
    }

    // Counts per update and reaction
    const { data: countsRows } = await supa
      .from('update_reactions')
      .select('update_id, reaction, count:count(*)')
      .in('update_id', filteredIds)
      .group('update_id, reaction');

    const counts: Record<string, Record<ReactionType, number>> = {};
    for (const id of filteredIds) {
      counts[id] = { smile: 0, heart: 0, thumbs_up: 0 };
    }
    for (const row of countsRows || []) {
      const uid = (row as any).update_id as string;
      const rt = (row as any).reaction as ReactionType;
      counts[uid][rt] = Number((row as any).count || 0);
    }

    // Active map per update for this device
    const userAgent = (req.headers.get('user-agent') || '').slice(0, 512);
    const device_hash = deviceId ? await sha256(deviceId + '|' + userAgent) : '';
    const active: Record<string, Record<ReactionType, boolean>> = {};
    for (const id of filteredIds) {
      active[id] = { smile: false, heart: false, thumbs_up: false };
    }
    if (device_hash) {
      const { data: activeRows } = await supa
        .from('update_reactions')
        .select('update_id, reaction')
        .in('update_id', filteredIds)
        .eq('device_hash', device_hash);
      for (const row of activeRows || []) {
        active[(row as any).update_id][(row as any).reaction as ReactionType] = true;
      }
    }

    return NextResponse.json({ counts, active }, { status: 200, headers: cors() });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200, headers: cors() });
  }
}

async function sha256(input: string) {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}



