/// <reference types="@cloudflare/workers-types" />

const MODEL_ID = "gpt-4o-mini-transcribe";
const DEFAULT_MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const DEFAULT_ALLOWED_HEADERS = "Authorization,Content-Type";
const DEFAULT_ALLOWED_METHODS = "POST,OPTIONS";

interface Env {
  OPENAI_API_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  ALLOWED_ORIGINS?: string;
  MAX_AUDIO_BYTES?: string;
}

type JsonRecord = Record<string, unknown>;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const originHeader = request.headers.get("origin");
    const resolvedOrigin = resolveAllowedOrigin(originHeader, env);

    if (request.method === "OPTIONS") {
      if (!resolvedOrigin) {
        return new Response("forbidden", { status: 403 });
      }
      return new Response(null, {
        status: 204,
        headers: corsHeaders(resolvedOrigin),
      });
    }

    if (!resolvedOrigin) {
      return new Response("forbidden", { status: 403 });
    }

    if (request.method !== "POST") {
      return withCors(
        jsonResponse({ error: "method_not_allowed" }, 405),
        resolvedOrigin,
      );
    }

    if (!env.OPENAI_API_KEY) {
      return withCors(
        jsonResponse({ error: "openai_not_configured" }, 500),
        resolvedOrigin,
      );
    }
    if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
      return withCors(
        jsonResponse({ error: "supabase_not_configured" }, 500),
        resolvedOrigin,
      );
    }

    const authHeader = request.headers.get("authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return withCors(jsonResponse({ error: "unauthorized" }, 401), resolvedOrigin);
    }
    const accessToken = authHeader.slice(7).trim();
    if (!accessToken) {
      return withCors(jsonResponse({ error: "unauthorized" }, 401), resolvedOrigin);
    }

    const userRes = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: env.SUPABASE_ANON_KEY,
      },
    });
    if (!userRes.ok) {
      return withCors(jsonResponse({ error: "unauthorized" }, 401), resolvedOrigin);
    }

    const contentType =
      request.headers.get("content-type")?.split(";")[0]?.trim() || "audio/webm";
    const audioBuffer = await request.arrayBuffer();
    const maxBytes = parseMaxBytes(env.MAX_AUDIO_BYTES);

    if (!audioBuffer || audioBuffer.byteLength === 0) {
      return withCors(jsonResponse({ error: "empty_audio" }, 400), resolvedOrigin);
    }
    if (audioBuffer.byteLength > maxBytes) {
      return withCors(jsonResponse({ error: "audio_too_large" }, 413), resolvedOrigin);
    }

    const multipart = buildMultipartPayload({
      boundary: `----livequest-${Math.random().toString(16).slice(2)}`,
      model: MODEL_ID,
      contentType,
      audio: new Uint8Array(audioBuffer),
    });

    const openaiRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": `multipart/form-data; boundary=${multipart.boundary}`,
      },
      body: multipart.body,
    });

    const rawText = await openaiRes.text();
    let payload: JsonRecord | null = null;
    try {
      payload = JSON.parse(rawText) as JsonRecord;
    } catch {
      payload = null;
    }

    if (!openaiRes.ok || !payload) {
      return withCors(
        jsonResponse(
          {
            error: "transcription_failed",
            detail: rawText.slice(0, 2000),
            status: openaiRes.status,
          },
          502,
        ),
        resolvedOrigin,
      );
    }

    return withCors(jsonResponse(payload), resolvedOrigin);
  },
};

function buildMultipartPayload(input: {
  boundary: string;
  model: string;
  contentType: string;
  audio: Uint8Array;
}): { boundary: string; body: Uint8Array } {
  const encoder = new TextEncoder();
  const { boundary, model, contentType, audio } = input;
  const parts = [
    encoder.encode(`--${boundary}\r\n`),
    encoder.encode('Content-Disposition: form-data; name="model"\r\n\r\n'),
    encoder.encode(`${model}\r\n`),
    encoder.encode(`--${boundary}\r\n`),
    encoder.encode(
      'Content-Disposition: form-data; name="response_format"\r\n\r\n',
    ),
    encoder.encode("verbose_json\r\n"),
    encoder.encode(`--${boundary}\r\n`),
    encoder.encode('Content-Disposition: form-data; name="temperature"\r\n\r\n'),
    encoder.encode("0\r\n"),
    encoder.encode(`--${boundary}\r\n`),
    encoder.encode(
      'Content-Disposition: form-data; name="file"; filename="voice.webm"\r\n',
    ),
    encoder.encode(`Content-Type: ${contentType}\r\n\r\n`),
    audio,
    encoder.encode(`\r\n--${boundary}--\r\n`),
  ];
  return {
    boundary,
    body: concatUint8Arrays(parts),
  };
}

function concatUint8Arrays(chunks: Uint8Array[]): Uint8Array {
  let total = 0;
  for (const chunk of chunks) {
    total += chunk.length;
  }
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

function parseMaxBytes(value?: string): number {
  if (!value) return DEFAULT_MAX_AUDIO_BYTES;
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed <= 0) return DEFAULT_MAX_AUDIO_BYTES;
  return parsed;
}

function resolveAllowedOrigin(origin: string | null, env: Env): string | null {
  const raw = env.ALLOWED_ORIGINS;
  if (!raw || !raw.trim()) {
    return origin ?? "*";
  }
  const entries = raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (entries.includes("*")) {
    return origin ?? "*";
  }
  if (origin && entries.includes(origin)) {
    return origin;
  }
  return null;
}

function corsHeaders(origin: string): Headers {
  const headers = new Headers();
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Headers", DEFAULT_ALLOWED_HEADERS);
  headers.set("Access-Control-Allow-Methods", DEFAULT_ALLOWED_METHODS);
  headers.set("Vary", "Origin");
  return headers;
}

function withCors(response: Response, origin: string): Response {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Headers", DEFAULT_ALLOWED_HEADERS);
  headers.set("Access-Control-Allow-Methods", DEFAULT_ALLOWED_METHODS);
  headers.set("Vary", "Origin");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
