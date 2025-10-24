import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { embedPreflightCorsHeaders, embedResponseCorsHeaders } from '@/lib/embed/cors';
import { createClient } from '@/lib/supabase/serverClient';

export const runtime = 'edge';

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const baseCors = embedResponseCorsHeaders(_req);
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (data: { event: string; new: unknown; old: unknown }) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      controller.enqueue(encoder.encode('retry: 5000\n\n'));

      const supabase = await createClient();
      const channel = supabase
        .channel(`embed-sse:${params.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'updates', filter: `liveblog_id=eq.${params.id}` }, (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          send({ event: payload.eventType, new: payload.new, old: payload.old });
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') controller.enqueue(encoder.encode(': connected\n\n'));
        });

      const close = () => {
        try { supabase.removeChannel(channel); } catch {}
        controller.close();
      };
      const maybeSignal = (_req as { signal?: AbortSignal | null } | undefined)?.signal;
      maybeSignal?.addEventListener?.('abort', close);
    },
  });

  return new NextResponse(stream, {
    status: 200,
    headers: {
      ...baseCors,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: embedPreflightCorsHeaders(req, { methods: ['GET', 'OPTIONS'] }),
  });
}
