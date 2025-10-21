import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/serverClient';

export const runtime = 'nodejs';

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
    const supabase = await createClient();
    const body = await req.json().catch(() => ({}));
    const { sessionId, event = 'ping', mode, metadata } = body || {};
    const userAgent = (req.headers.get('user-agent') || '').slice(0, 512);
    const referrer = (req.headers.get('referer') || '').slice(0, 512);
    const ip = req.headers.get('x-forwarded-for') || '';
    const ipHash = await sha256(ip);

    if (!params.id || !sessionId) {
      return NextResponse.json({ error: 'bad_request' }, { status: 400, headers: cors() });
    }

    if (event === 'ping') {
      await supabase.from('viewer_pings').insert({ liveblog_id: params.id, session_id: String(sessionId), mode, user_agent: userAgent, referrer, ip_hash: ipHash });
    } else {
      await supabase.from('analytics_events').insert({ liveblog_id: params.id, session_id: String(sessionId), event: String(event), metadata: metadata ?? null });
    }

    return NextResponse.json({ ok: true }, { status: 200, headers: cors() });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200, headers: cors() });
  }
}

async function sha256(input: string) {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}


