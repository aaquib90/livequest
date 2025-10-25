export const runtime = "nodejs";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/serverClient";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { seedWidgetDefaults } from "@/lib/engagement/seedDefaults";

async function createWidget(formData: FormData) {
  "use server";
  const type = String(formData.get("type") || "");
  const name = String(formData.get("name") || "");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("You must be signed in");
  }
  const { data, error } = await supabase
    .from("engagement_widgets")
    .insert({ owner_id: user.id, type, name: name || null, config: {}, status: "active" })
    .select("id")
    .single();
  if (error) {
    throw new Error(`Failed to create widget: ${error.message}`);
  }
  if (data?.id) {
    await seedWidgetDefaults(data.id, type);
  }
  redirect(`/dashboard/engagement`);
}

export default function NewEngagementWidgetPage() {
  return (
    <div className="space-y-8">
      <Card className="border-border/70 bg-background/40">
        <CardHeader>
          <CardTitle className="text-2xl">Create widget</CardTitle>
          <CardDescription>Choose a type and give it a name (optional).</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createWidget} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select id="type" name="type" required defaultValue="hot-take">
                <option value="hot-take">Hot Take Meter</option>
                <option value="caption-this">Caption This</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <input id="name" name="name" className="rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm" placeholder="Optional name" />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" className="w-full sm:w-auto">Create</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
