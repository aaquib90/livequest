export const runtime = 'edge';
import { headers } from "next/headers";
import CaptionThisClient from "./ui/CaptionThisClient";

export default async function CaptionThisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const h = headers();
  const host = h.get("host");
  const protocol = h.get("x-forwarded-proto") ?? "https";
  const base = `${protocol}://${host}`;
  return <CaptionThisClient widgetId={id} apiBase={base} />;
}


