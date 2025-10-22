import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/adminClient';

export const runtime = 'edge';

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  } as Record<string, string>;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors() });
}

type ReactionType = 'smile' | 'heart' | 'thumbs_up';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const liveblogId = params.id;
    if (!liveblogId) return NextResponse.json({ error: 'bad_request' }, { status: 400, headers: cors() });

    const body = await req.json().catch(() => ({}));
    const updateId = String(body?.updateId || '');
    const type: ReactionType = body?.type;
    const deviceId = String(body?.deviceId || '');
    if (!updateId || !deviceId || !['smile','heart','thumbs_up'].includes(String(type))) {
      return NextResponse.json({ error: 'invalid_payload' }, { status: 400, headers: cors() });
    }

    const supa = createAdminClient();

    // Validate that update belongs to liveblog and liveblog is public/unlisted
    const { data: lb } = await supa
      .from('liveblogs')
      .select('id,privacy,status')
      .eq('id', liveblogId)
      .single();
    if (!lb || lb.status !== 'active' || !['public','unlisted'].includes(lb.privacy)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403, headers: cors() });
    }
    const { data: up } = await supa
      .from('updates')
      .select('id, liveblog_id')
      .eq('id', updateId)
      .eq('liveblog_id', liveblogId)
      .single();
    if (!up) {
      return NextResponse.json({ error: 'not_found' }, { status: 404, headers: cors() });
    }

    const userAgent = (req.headers.get('user-agent') || '').slice(0, 512);
    const device_hash = await sha256(deviceId + '|' + userAgent);

    // Toggle: if exists -> delete; else insert
    const { data: existing } = await supa
      .from('update_reactions')
      .select('id')
      .eq('update_id', updateId)
      .eq('reaction', type)
      .eq('device_hash', device_hash)
      .limit(1)
      .maybeSingle();

    if (existing) {
      await supa
        .from('update_reactions')
        .delete()
        .eq('id', existing.id);
    } else {
      await supa.from('update_reactions').insert({
        liveblog_id: liveblogId,
        update_id: updateId,
        reaction: type,
        device_hash,
        user_agent: userAgent,
      } as any);
    }

    const counts = await getCounts(supa, updateId);
    const active = await getActiveMap(supa, updateId, device_hash);

    return NextResponse.json({ ok: true, counts, active }, { status: 200, headers: cors() });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200, headers: cors() });
  }
}

async function sha256(input: string) {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function getCounts(supa: ReturnType<typeof createAdminClient>, updateId: string) {
  const { data } = await supa
    .from('update_reactions')
    .select('reaction, count:count(*)')
    .eq('update_id', updateId)
    .group('reaction');
  const base = { smile: 0, heart: 0, thumbs_up: 0 } as Record<ReactionType, number>;
  for (const row of data || []) {
    base[row.reaction as ReactionType] = Number((row as any).count || 0);
  }
  return base;
}

async function getActiveMap(supa: ReturnType<typeof createAdminClient>, updateId: string, device_hash: string) {
  const { data } = await supa
    .from('update_reactions')
    .select('reaction')
    .eq('update_id', updateId)
    .eq('device_hash', device_hash);
  const map = { smile: false, heart: false, thumbs_up: false } as Record<ReactionType, boolean>;
  for (const row of data || []) {
    map[row.reaction as ReactionType] = true;
  }
  return map;
}



