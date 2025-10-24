import { NextResponse } from 'next/server';
import { embedPreflightCorsHeaders, embedResponseCorsHeaders } from '@/lib/embed/cors';
import { createClient } from '@/lib/supabase/serverClient';

export const runtime = 'edge';
export const revalidate = 5;

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const baseCors = embedResponseCorsHeaders(req);
  const supabase = await createClient();
  const id = params.id;
  const { data: liveblog } = await supabase
    .from('liveblogs')
    .select('id,privacy')
    .eq('id', id)
    .single();
  if (!liveblog) {
    return NextResponse.json({ error: 'not_found' }, { status: 404, headers: baseCors });
  }

  const { data: updates } = await supabase
    .from('updates')
    .select('id,content,published_at,pinned')
    .eq('liveblog_id', id)
    .is('deleted_at', null)
    .eq('status', 'published')
    .order('pinned', { ascending: false })
    .order('published_at', { ascending: false })
    .limit(100);

  // Build a weak ETag from a stable string of the current payload
  const payload = { updates: updates || [] } as const;
  const etag = await buildWeakEtag(payload);

  // Conditional GET handling
  const ifNoneMatch = req.headers.get('if-none-match');
  if (ifNoneMatch && normalizeEtag(ifNoneMatch) === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        ...baseCors,
        'ETag': etag,
        'Cache-Control': 'public, max-age=5, s-maxage=5, stale-while-revalidate=30',
      },
    });
  }

  return new NextResponse(JSON.stringify(payload), {
    status: 200,
    headers: {
      ...baseCors,
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=5, s-maxage=5, stale-while-revalidate=30',
      'ETag': etag,
    },
  });
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: embedPreflightCorsHeaders(req, { methods: ['GET', 'OPTIONS'] }),
  });
}

async function buildWeakEtag(data: unknown): Promise<string> {
  try {
    const json = JSON.stringify(data);
    const buffer = new TextEncoder().encode(json);
    const hash = await crypto.subtle.digest('SHA-1', buffer);
    const hex = Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return `W/"${hex}"`;
  } catch {
    // Fallback to a random etag if hashing fails
    return `W/"${Math.random().toString(36).slice(2)}"`;
  }
}

function normalizeEtag(value: string): string {
  // Clients can send multiple ETags in If-None-Match; we only support exact match for our single value
  // Trim spaces and pick the first token
  const token = value.split(',')[0]?.trim() || '';
  return token;
}
