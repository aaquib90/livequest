import { NextResponse } from "next/server";

import { embedPreflightCorsHeaders, embedResponseCorsHeaders } from "@/lib/embed/cors";
import { normaliseReactions } from "@/lib/branding/utils";
import { supabaseEnsure } from "@/lib/supabase/gatewayClient";

export const runtime = 'edge';

export async function OPTIONS(req: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: embedPreflightCorsHeaders(req, {
      methods: ['POST', 'OPTIONS'],
      headers: ['Content-Type'],
    }),
  });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const baseCors = embedResponseCorsHeaders(req);
  const responseHeaders = {
    ...baseCors,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  try {
    const liveblogId = params.id;
    if (!liveblogId) {
      return NextResponse.json({ error: 'bad_request' }, { status: 400, headers: responseHeaders });
    }

    const body = await req.json().catch(() => ({}));
    const updateId = String(body?.updateId || '');
    const type = String(body?.type || '');
    const deviceId = String(body?.deviceId || '');
    if (!updateId || !deviceId || !type) {
      return NextResponse.json({ error: 'invalid_payload' }, { status: 400, headers: responseHeaders });
    }

    // Validate that update belongs to liveblog and liveblog is public/unlisted
    const lb = await supabaseEnsure<{ id: string; privacy: string; status: string; owner_id: string } | null>(req, {
      action: 'select',
      table: 'liveblogs',
      columns: 'id,privacy,status,owner_id',
      filters: [{ column: 'id', op: 'eq', value: liveblogId }],
      single: true,
    });
    if (!lb || lb.status !== 'active' || !['public','unlisted'].includes(lb.privacy)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403, headers: responseHeaders });
    }
    const up = await supabaseEnsure<{ id: string; liveblog_id: string } | null>(req, {
      action: 'select',
      table: 'updates',
      columns: 'id, liveblog_id',
      filters: [
        { column: 'id', op: 'eq', value: updateId },
        { column: 'liveblog_id', op: 'eq', value: liveblogId },
      ],
      single: true,
    });
    if (!up) {
      return NextResponse.json({ error: 'not_found' }, { status: 404, headers: responseHeaders });
    }

    const brandingRow = lb.owner_id
      ? await supabaseEnsure<{ reactions: unknown } | null>(req, {
          action: 'select',
          table: 'account_branding',
          columns: 'reactions',
          filters: [{ column: 'account_id', op: 'eq', value: lb.owner_id }],
          maybeSingle: true,
        })
      : null;
    const allowedReactions = normaliseReactions(brandingRow?.reactions);
    const allowedIds = new Set(allowedReactions.map((reaction) => reaction.id));
    if (!allowedIds.has(type)) {
      return NextResponse.json({ error: 'invalid_reaction' }, { status: 400, headers: responseHeaders });
    }

    const userAgent = (req.headers.get('user-agent') || '').slice(0, 512);
    const device_hash = await sha256(deviceId + '|' + userAgent);

    // Toggle: if exists -> delete; else insert
    const existing = await supabaseEnsure<{ id: string } | null>(req, {
      action: 'select',
      table: 'update_reactions',
      columns: 'id',
      filters: [
        { column: 'update_id', op: 'eq', value: updateId },
        { column: 'reaction', op: 'eq', value: type },
        { column: 'device_hash', op: 'eq', value: device_hash },
      ],
      limit: 1,
      maybeSingle: true,
    });

    if (existing) {
      await supabaseEnsure(req, {
        action: 'delete',
        table: 'update_reactions',
        filters: [{ column: 'id', op: 'eq', value: existing.id }],
        returning: 'minimal',
      });
    } else {
      await supabaseEnsure(req, {
        action: 'insert',
        table: 'update_reactions',
        values: {
          liveblog_id: liveblogId,
          update_id: updateId,
          reaction: type,
          device_hash,
          user_agent: userAgent,
        },
        returning: 'minimal',
      });
    }

    const counts = await getCounts(req, updateId);
    const active = await getActiveMap(req, updateId, device_hash);

    return NextResponse.json({ ok: true, counts, active }, { status: 200, headers: responseHeaders });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200, headers: responseHeaders });
  }
}

async function sha256(input: string) {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function getCounts(req: Request, updateId: string) {
  const data = await supabaseEnsure<Array<{ reaction: string; count: number | null }>>(req, {
    action: 'select',
    table: 'update_reactions',
    columns: 'reaction, count:count(*)',
    filters: [{ column: 'update_id', op: 'eq', value: updateId }],
    group: 'reaction',
  });
  const base: Record<string, number> = {};
  for (const row of data || []) {
    const { reaction, count } = row;
    if (!reaction) continue;
    base[reaction] = Number(count ?? 0);
  }
  return base;
}

async function getActiveMap(req: Request, updateId: string, device_hash: string) {
  const data = await supabaseEnsure<Array<{ reaction: string }>>(req, {
    action: 'select',
    table: 'update_reactions',
    columns: 'reaction',
    filters: [
      { column: 'update_id', op: 'eq', value: updateId },
      { column: 'device_hash', op: 'eq', value: device_hash },
    ],
  });
  const map: Record<string, boolean> = {};
  for (const row of data || []) {
    if (!row.reaction) continue;
    map[row.reaction] = true;
  }
  return map;
}
