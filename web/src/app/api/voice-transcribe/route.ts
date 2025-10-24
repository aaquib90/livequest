import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/serverClient";

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
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const form = await req.formData();
    const audio = form.get("audio");
    if (!audio || !(audio instanceof File)) {
      return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }
    if (audio.size === 0) {
      return NextResponse.json({ error: "empty_audio" }, { status: 400 });
    }
    if (audio.size > MAX_AUDIO_BYTES) {
      return NextResponse.json({ error: "audio_too_large" }, { status: 413 });
    }

    const openAiForm = new FormData();
    openAiForm.append("file", audio, audio.name || "voice.webm");
    openAiForm.append("model", MODEL_ID);
    openAiForm.append("response_format", "verbose_json");
    openAiForm.append("temperature", "0");

    const response = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: openAiForm,
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
