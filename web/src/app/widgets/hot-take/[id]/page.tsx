export const runtime = 'edge';
import { headers } from "next/headers";
import HotTakeClient from "./ui/HotTakeClient";

export default async function HotTakePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const headerList = headers();
  const host = headerList.get("host");
  const protocol = headerList.get("x-forwarded-proto") ?? "https";
  // Optionally fetch widget config in future; for MVP we only need id
  const base = `${protocol}://${host}`;
  return <HotTakeClient widgetId={id} apiBase={base} />;
}


