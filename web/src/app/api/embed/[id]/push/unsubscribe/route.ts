import { NextResponse } from 'next/server';
import { embedPreflightCorsHeaders, embedResponseCorsHeaders } from '@/lib/embed/cors';
import { supabaseEnsure } from '@/lib/supabase/gatewayClient';

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
    const endpoint = body?.endpoint;
    if (!endpoint || typeof endpoint !== 'string') {
      return NextResponse.json({ error: 'invalid_endpoint' }, { status: 400, headers: responseHeaders });
    }
    await supabaseEnsure(req, {
      action: 'delete',
      table: 'push_subscriptions',
      filters: [
        { column: 'liveblog_id', op: 'eq', value: liveblogId },
        { column: 'endpoint', op: 'eq', value: endpoint },
      ],
      returning: 'minimal',
    });
    return NextResponse.json({ ok: true }, { status: 200, headers: responseHeaders });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200, headers: responseHeaders });
  }
}
