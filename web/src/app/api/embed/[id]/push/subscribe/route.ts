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
    const subscription = body?.subscription as {
      endpoint?: unknown;
      keys?: unknown;
      expirationTime?: unknown;
    } | undefined;
    if (!subscription || typeof subscription.endpoint !== 'string') {
      return NextResponse.json({ error: 'invalid_subscription' }, { status: 400, headers: responseHeaders });
    }
    const userAgent = (req.headers.get('user-agent') || '').slice(0, 512);
    const subscriptionKeys =
      subscription && typeof subscription.keys === 'object' && subscription.keys !== null
        ? (subscription.keys as Record<string, unknown>)
        : {};
    const expiration =
      typeof subscription?.expirationTime === 'number' || typeof subscription?.expirationTime === 'string'
        ? new Date(subscription.expirationTime)
        : null;
    const payload: {
      liveblog_id: string;
      endpoint: string;
      keys: Record<string, unknown>;
      expiration_time: Date | null;
      user_agent: string;
    } = {
      liveblog_id: liveblogId,
      endpoint: String(subscription.endpoint),
      keys: subscriptionKeys,
      expiration_time: expiration,
      user_agent: userAgent,
    };
    await supabaseEnsure(req, {
      action: 'upsert',
      table: 'push_subscriptions',
      values: payload,
      onConflict: 'liveblog_id,endpoint',
      returning: 'minimal',
    });
    return NextResponse.json({ ok: true }, { status: 200, headers: responseHeaders });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200, headers: responseHeaders });
  }
}
