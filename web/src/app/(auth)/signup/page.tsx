import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import SignUpForm from "./SignUpForm";

export const runtime = "edge";

export const metadata: Metadata = {
  title: "Create your account",
  description: "Sign up for Livequest Studio to publish live coverage, track analytics, and activate sponsors in minutes.",
};

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const headerList = headers();
  const host = headerList.get("host");
  const protocol = headerList.get("x-forwarded-proto") ?? "https";
  const cookieHeader = cookies().toString();

  if (host) {
    try {
      const accountRes = await fetch(`${protocol}://${host}/api/internal/overview?target=account`, {
        headers: {
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        },
        cache: "no-store",
      });
      if (accountRes.ok) {
        return redirect("/dashboard");
      }
    } catch {
      // continue rendering sign-up form
    }
  }

  const sp = await searchParams;
  const error = sp?.error;
  return (
    <div className="relative flex min-h-[80vh] items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(244,244,245,0.05),_transparent_55%)]" />
      <div className="relative z-10 mx-auto w-full max-w-lg">
        <Card className="border-border/60 bg-background/60 backdrop-blur">
          <CardHeader className="space-y-4 text-center">
            <Badge variant="muted" className="mx-auto w-fit border-border/40">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              Create your studio
            </Badge>
            <div>
              <CardTitle className="text-3xl">Join Livequest Studio</CardTitle>
              <CardDescription className="text-base">
                One login gets you rapid publishing, beautiful embeds, and realtime
                analytics. Let&apos;s get you set up.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <SignUpForm defaultError={error} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
