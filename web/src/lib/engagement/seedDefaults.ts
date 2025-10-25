import { createAdminClient } from "@/lib/supabase/adminClient";

async function ensureCaptionSeed(widgetId: string) {
  const admin = createAdminClient();

  const { data: existing, error: existingError } = await admin
    .from("ugc_submissions")
    .select("id")
    .eq("widget_id", widgetId)
    .contains("metadata", { seed: true })
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing) {
    return;
  }

  const placeholder =
    "Awaiting community captions. Submissions appear here after you approve them.";

  const { error: insertError } = await admin.from("ugc_submissions").insert({
    widget_id: widgetId,
    device_hash: "seed",
    content: placeholder,
    status: "pending",
    metadata: { seed: true },
  });

  if (insertError) {
    throw insertError;
  }
}

export async function seedWidgetDefaults(widgetId: string, type: string) {
  if (!widgetId || !type) return;

  try {
    if (type === "caption-this") {
      await ensureCaptionSeed(widgetId);
    }
  } catch (error) {
    console.error("Failed to seed widget defaults", { widgetId, type, error });
  }
}
