import { notFound } from "next/navigation";
import { Sparkle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/serverClient";

import EmbedClient from "./ui/EmbedClient";

export const revalidate = 5;

export default async function EmbedPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const { id } = await params;
  const { data: liveblog } = await supabase
    .from("liveblogs")
    .select("id,title,privacy,settings")
    .eq("id", id)
    .single();
  if (!liveblog) return notFound();

  const { data: updates } = await supabase
    .from("updates")
    .select("id,content,published_at,pinned")
    .eq("liveblog_id", liveblog.id)
    .is("deleted_at", null)
    .eq("status", "published")
    .order("pinned", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(50);

  const orderPref =
    (liveblog.settings?.update_order as "newest" | "oldest") || "newest";
  const template = (liveblog.settings?.template as string | undefined) ?? null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <Card className="border-border/70 bg-background/60 backdrop-blur">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Badge variant="muted" className="w-fit border-border/40">
              <Sparkle className="mr-1.5 h-3.5 w-3.5" />
              Live
            </Badge>
            <CardTitle className="mt-4 text-2xl font-semibold">
              {liveblog.title}
            </CardTitle>
          </div>
          <p className="text-xs text-muted-foreground">
            Powered by Livequest Studio
          </p>
        </CardHeader>
        <CardContent className="pb-0">
          <EmbedClient
            initialUpdates={updates || []}
            liveblogId={liveblog.id}
            order={orderPref}
            template={template}
          />
        </CardContent>
      </Card>
    </div>
  );
}
