import { NextResponse } from 'next/server';
import { embedPreflightCorsHeaders, embedResponseCorsHeaders } from '@/lib/embed/cors';
import { supabaseEnsure } from '@/lib/supabase/gatewayClient';

export const runtime = 'edge';

export async function OPTIONS(req: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: embedPreflightCorsHeaders(req, {
      methods: ['GET', 'OPTIONS'],
      headers: ['Content-Type'],
    }),
  });
}

type ReactionType = 'smile' | 'heart' | 'thumbs_up';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const baseCors = embedResponseCorsHeaders(req);
  const responseHeaders = {
    ...baseCors,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  try {
    const liveblogId = params.id;
    if (!liveblogId) {
      return NextResponse.json({ error: 'bad_request' }, { status: 400, headers: responseHeaders });
    }

    const url = new URL(req.url);
    const idsParam = url.searchParams.get('updateIds') || '';
    const deviceId = url.searchParams.get('deviceId') || '';
    const updateIds = idsParam.split(',').map((s) => s.trim()).filter(Boolean);
    if (!updateIds.length) {
      return NextResponse.json({ error: 'missing_updateIds' }, { status: 400, headers: responseHeaders });
    }

    // Validate liveblog visibility
    const lb = await supabaseEnsure<{ id: string; privacy: string; status: string } | null>(req, {
      action: 'select',
      table: 'liveblogs',
      columns: 'id,privacy,status',
      filters: [{ column: 'id', op: 'eq', value: liveblogId }],
      single: true,
    });
    if (!lb || lb.status !== 'active' || !['public','unlisted'].includes(lb.privacy)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403, headers: responseHeaders });
    }

    // Ensure all updateIds belong to this liveblog
    const ups = await supabaseEnsure<Array<{ id: string }>>(req, {
      action: 'select',
      table: 'updates',
      columns: 'id',
      filters: [
        { column: 'id', op: 'in', value: updateIds },
        { column: 'liveblog_id', op: 'eq', value: liveblogId },
      ],
    });
    const validIds = new Set((ups || []).map((u) => u.id));
    const filteredIds = updateIds.filter((id) => validIds.has(id));
    if (!filteredIds.length) {
      return NextResponse.json({ counts: {}, active: {} }, { status: 200, headers: responseHeaders });
    }

    // Counts per update and reaction
    const countsRows = await supabaseEnsure<
      Array<{ update_id: string; reaction: ReactionType; count: number | null }>
    >(req, {
      action: 'select',
      table: 'update_reactions',
      columns: 'update_id, reaction, count:count(*)',
      filters: [{ column: 'update_id', op: 'in', value: filteredIds }],
      group: 'update_id, reaction',
    });

    const counts: Record<string, Record<ReactionType, number>> = {};
    for (const id of filteredIds) {
      counts[id] = { smile: 0, heart: 0, thumbs_up: 0 };
    }
    for (const row of countsRows || []) {
      const { update_id: updateId, reaction, count } = row;
      counts[updateId][reaction] = Number(count ?? 0);
    }

    // Active map per update for this device
    const userAgent = (req.headers.get('user-agent') || '').slice(0, 512);
    const device_hash = deviceId ? await sha256(deviceId + '|' + userAgent) : '';
    const active: Record<string, Record<ReactionType, boolean>> = {};
    for (const id of filteredIds) {
      active[id] = { smile: false, heart: false, thumbs_up: false };
    }
    if (device_hash) {
      const activeRows = await supabaseEnsure<Array<{ update_id: string; reaction: ReactionType }>>(req, {
        action: 'select',
        table: 'update_reactions',
        columns: 'update_id, reaction',
        filters: [
          { column: 'update_id', op: 'in', value: filteredIds },
          { column: 'device_hash', op: 'eq', value: device_hash },
        ],
      });
      for (const row of activeRows || []) {
        active[row.update_id][row.reaction] = true;
      }
    }

    return NextResponse.json({ counts, active }, { status: 200, headers: responseHeaders });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200, headers: responseHeaders });
  }
}

async function sha256(input: string) {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
