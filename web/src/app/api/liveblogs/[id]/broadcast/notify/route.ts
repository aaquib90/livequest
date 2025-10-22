import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/serverClient';
import { sendPushToLiveblog } from '@/lib/notifications/push';

export const runtime = 'nodejs';

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

    let delivered = false;
    let deliveryError: string | null = null;
    try {
      await sendPushToLiveblog(liveblogId, {
        title: payload.title,
        body: payload.body,
        url: payload.url,
        tag: payload.tag,
        icon: payload.icon,
        badge: payload.badge,
      });
      delivered = true;
    } catch (err: any) {
      deliveryError = err?.message || 'push_failed';
    }

    // Forward to dispatcher (Cloudflare Worker or external service) if configured
    const dispatcherUrl = process.env.PUSH_DISPATCH_URL || '';
    const dispatcherToken = process.env.PUSH_DISPATCH_TOKEN || '';
    let forwarded: boolean | null = null;
    if (dispatcherUrl) {
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
        forwarded = res.ok;
      } catch {
        forwarded = false;
      }
    }

    if (delivered || forwarded) {
      return NextResponse.json({ ok: true, delivered, forwarded }, { status: 200 });
    }

    return NextResponse.json(
      { ok: false, delivered, forwarded, error: deliveryError ?? (forwarded === false ? 'dispatcher_failed' : 'not_configured') },
      { status: 500 },
    );
  } catch {
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
