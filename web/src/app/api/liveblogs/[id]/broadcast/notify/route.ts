import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/serverClient';
import { sendPushToLiveblog, type PushPayload } from '@/lib/notifications/push';

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
    const payload = (body?.payload || null) as PushPayload | null;
    if (!payload || typeof payload.url !== 'string') {
      return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
    }
    await sendPushToLiveblog(liveblogId, payload);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}


