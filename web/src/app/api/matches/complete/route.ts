import { NextRequest, NextResponse } from 'next/server';
import { supabaseRequest } from '@/lib/supabase/gatewayClient';

export const runtime = 'edge';

// Marks matches as completed (FT) when their scheduled date/time has passed by a buffer
// and they are not already in a terminal status. Intended to be called via cron.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  const requiredSecret = process.env.CRON_SECRET;
  if (requiredSecret) {
    const headerSecret = req.headers.get('x-cron-secret');
    const bodySecret = typeof body?.secret === 'string' ? body.secret : undefined;
    if (headerSecret !== requiredSecret && bodySecret !== requiredSecret) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  // Buffer after kickoff before forcing completion (minutes)
  const bufferMinutes = typeof body?.bufferMinutes === 'number' && body.bufferMinutes > 0 ? body.bufferMinutes : 180; // 3h default
  const cutoffIso = new Date(Date.now() - bufferMinutes * 60_000).toISOString();

  // Terminal statuses that should not be overridden
  const terminalStatuses = ['FT', 'AET', 'PEN', 'PST', 'CANC', 'ABD', 'AWD', 'WO'];

  // Coerce to PostgREST list string for NOT IN
  const list = '(' + terminalStatuses.map((s) => `"${s}"`).join(',') + ')';

  const response = await supabaseRequest(req, {
    action: 'update',
    table: 'matches',
    values: { status: 'FT' },
    filters: [
      { column: 'date', op: 'lt', value: cutoffIso },
      { column: 'status', op: 'not', operator: 'in', value: list },
    ],
    head: true,
    count: 'exact',
    returning: 'minimal',
  });

  if (response.error) {
    return NextResponse.json({ error: response.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, markedCompleted: response.count ?? 0, cutoffIso, bufferMinutes });
}

