import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/serverClient';

export const runtime = 'edge';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const liveblogId = params.id;
    if (!liveblogId) return NextResponse.json({ error: 'bad_request' }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    // Owner check
    const { data: lb } = await supabase
      .from('liveblogs')
      .select('owner_id')
      .eq('id', liveblogId)
      .single();
    if (!lb || lb.owner_id !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const payload = (body?.payload || null) as { title?: string; body?: string; url: string; tag?: string; icon?: string; badge?: string } | null;
    if (!payload || typeof payload.url !== 'string') {
      return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
    }

    const dispatcherUrl = process.env.PUSH_DISPATCH_URL || '';
    const dispatcherToken = process.env.PUSH_DISPATCH_TOKEN || '';
    if (!dispatcherUrl) {
      return NextResponse.json({ ok: false, error: 'dispatcher_unconfigured' }, { status: 503 });
    }

    try {
      const url = new URL(`/notify/${liveblogId}`, dispatcherUrl).toString();
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(dispatcherToken ? { Authorization: `Bearer ${dispatcherToken}` } : {}),
        },
        body: JSON.stringify({ payload }),
      });
      if (!res.ok) {
        return NextResponse.json({ ok: false, error: 'dispatcher_failed' }, { status: 502 });
      }
      return NextResponse.json({ ok: true }, { status: 200 });
    } catch {
      return NextResponse.json({ ok: false, error: 'dispatcher_error' }, { status: 502 });
    }
  } catch {
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
