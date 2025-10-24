import { NextResponse } from 'next/server';
import { supabaseEnsure } from '@/lib/supabase/gatewayClient';

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
    const subscription = body?.subscription;
    if (!subscription || typeof subscription.endpoint !== 'string') {
      return NextResponse.json({ error: 'invalid_subscription' }, { status: 400, headers: cors() });
    }
    const userAgent = (req.headers.get('user-agent') || '').slice(0, 512);
    const payload = {
      liveblog_id: liveblogId,
      endpoint: String(subscription.endpoint),
      keys: subscription.keys ? subscription.keys : {},
      expiration_time: subscription.expirationTime ? new Date(subscription.expirationTime) : null,
      user_agent: userAgent,
    } as any;
    await supabaseEnsure(req, {
      action: 'upsert',
      table: 'push_subscriptions',
      values: payload,
      onConflict: 'liveblog_id,endpoint',
      returning: 'minimal',
    });
    return NextResponse.json({ ok: true }, { status: 200, headers: cors() });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200, headers: cors() });
  }
}

