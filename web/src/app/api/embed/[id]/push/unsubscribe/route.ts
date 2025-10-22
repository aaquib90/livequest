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

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const liveblogId = params.id;
    if (!liveblogId) return NextResponse.json({ error: 'bad_request' }, { status: 400, headers: cors() });
    const body = await req.json().catch(() => ({}));
    const endpoint = body?.endpoint;
    if (!endpoint || typeof endpoint !== 'string') {
      return NextResponse.json({ error: 'invalid_endpoint' }, { status: 400, headers: cors() });
    }
    const supa = createAdminClient();
    await supa
      .from('push_subscriptions')
      .delete()
      .eq('liveblog_id', liveblogId)
      .eq('endpoint', endpoint);
    return NextResponse.json({ ok: true }, { status: 200, headers: cors() });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200, headers: cors() });
  }
}


