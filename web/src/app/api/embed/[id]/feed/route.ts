import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/serverClient';
import * as Sentry from '@sentry/nextjs';

export const runtime = 'edge';
export const revalidate = 5;

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const id = params.id;
  const { data: liveblog } = await Sentry.startSpan({ op: 'db', name: 'Get liveblog feed meta' }, async () => {
    return await supabase
      .from('liveblogs')
      .select('id,privacy')
      .eq('id', id)
      .single();
  });
  if (!liveblog) {
    return NextResponse.json({ error: 'not_found' }, { status: 404, headers: corsHeaders() });
  }

  const { data: updates } = await Sentry.startSpan({ op: 'db', name: 'Get liveblog updates' }, async () => {
    return await supabase
      .from('updates')
      .select('id,content,published_at,pinned')
      .eq('liveblog_id', id)
      .is('deleted_at', null)
      .eq('status', 'published')
      .order('pinned', { ascending: false })
      .order('published_at', { ascending: false })
      .limit(100);
  });

  return new NextResponse(JSON.stringify({ updates: updates || [] }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=5, s-maxage=5, stale-while-revalidate=30',
      ...corsHeaders(),
    },
  });
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  } as Record<string, string>;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}


