import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

const MAX_AUDIO_BYTES = 25 * 1024 * 1024; // 25MB safety guard
const MODEL_ID = "gpt-4o-mini-transcribe";

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "openai_not_configured" },
      { status: 500 }
    );
  }

  try {
    const accessToken = extractSupabaseAccessToken(req);
    const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!accessToken || !projectUrl || !anonKey) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const userResponse = await fetch(`${projectUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: anonKey,
      },
    });
    if (!userResponse.ok) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const contentType =
      req.headers.get("content-type")?.split(";")[0]?.trim() || "audio/webm";
    const audioBuffer = await req.arrayBuffer();
    const size = audioBuffer.byteLength;
    if (!audioBuffer || size === 0) {
      return NextResponse.json({ error: "empty_audio" }, { status: 400 });
    }
    if (size > MAX_AUDIO_BYTES) {
      return NextResponse.json({ error: "audio_too_large" }, { status: 413 });
    }

    const audioBytes = new Uint8Array(audioBuffer);
    const boundary = `----livequest-${Math.random().toString(16).slice(2)}`;
    const encoder = new TextEncoder();
    const bodyParts: Uint8Array[] = [
      encoder.encode(`--${boundary}\r\n`),
      encoder.encode(
        'Content-Disposition: form-data; name="model"\r\n\r\n'
      ),
      encoder.encode(`${MODEL_ID}\r\n`),
      encoder.encode(`--${boundary}\r\n`),
      encoder.encode(
        'Content-Disposition: form-data; name="response_format"\r\n\r\n'
      ),
      encoder.encode("verbose_json\r\n"),
      encoder.encode(`--${boundary}\r\n`),
      encoder.encode(
        'Content-Disposition: form-data; name="temperature"\r\n\r\n'
      ),
      encoder.encode("0\r\n"),
      encoder.encode(`--${boundary}\r\n`),
      encoder.encode(
        `Content-Disposition: form-data; name="file"; filename="voice.webm"\r\n`
      ),
      encoder.encode(`Content-Type: ${contentType}\r\n\r\n`),
      audioBytes,
      encoder.encode(`\r\n--${boundary}--\r\n`),
    ];
    const requestBody = concatUint8Arrays(bodyParts);

    const response = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
        },
        body: requestBody,
      }
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => "upstream_error");
      return NextResponse.json(
        { error: "transcription_failed", detail: errorText },
        { status: 502 }
      );
    }

    const result = (await response.json()) as {
      text?: string;
      language?: string;
      duration?: number;
      segments?: Array<{ text?: string }>;
    };

    return NextResponse.json({
      text: result.text ?? "",
      language: result.language ?? null,
      duration: result.duration ?? null,
      segments: result.segments?.map((segment) => segment.text ?? "").filter(Boolean) ?? [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    return NextResponse.json(
      { error: "server_error", detail: message },
      { status: 500 }
    );
  }
}

function extractSupabaseAccessToken(req: NextRequest): string | null {
  const cookies = req.headers.get("cookie") || "";
  if (!cookies.length) return null;
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!projectUrl) return null;
  const projectRef = projectUrl.replace(/^https?:\/\//, "").split(".")[0];
  if (!projectRef) return null;
  const cookieName = `sb-${projectRef}-auth-token`;
  const tokenCookie = cookies
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${cookieName}=`));
  if (!tokenCookie) return null;
  const value = tokenCookie.slice(cookieName.length + 1);
  try {
    const decoded = decodeURIComponent(value);
    const parsed = JSON.parse(decoded);
    const sessionToken =
      parsed?.access_token ??
      parsed?.currentSession?.access_token ??
      parsed?.currentSession?.accessToken ??
      null;
    return typeof sessionToken === "string" && sessionToken.length > 0
      ? sessionToken
      : null;
  } catch {
    return null;
  }
}

function concatUint8Arrays(arrays: Uint8Array[]): Uint8Array {
  let total = 0;
  for (const arr of arrays) {
    total += arr.length;
  }
  const result = new Uint8Array(total);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}
