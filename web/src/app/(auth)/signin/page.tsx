import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { LockKeyhole } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import SignInForm from "./SignInForm";

export const runtime = "edge";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Access your Livequest Studio dashboard to manage live coverage, analytics, and sponsor activations.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; status?: string; email?: string }>;
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
      // fall back to rendering sign-in form
    }
  }

  const sp = await searchParams;
  const error = sp?.error ?? null;
  const status = sp?.status;
  const email = sp?.email ?? "";

  if (status === "signed-in") {
    return redirect("/dashboard");
  }

  const pendingVerification = status === "pending-verification";

  return (
    <div className="relative flex min-h-[80vh] items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(250,250,250,0.04),_transparent_55%)]" />
      <div className="relative z-10 mx-auto w-full max-w-lg">
        <Card className="border-border/60 bg-background/60 backdrop-blur">
          <CardHeader className="space-y-4 text-center">
            <Badge variant="muted" className="mx-auto w-fit border-border/40">
              <LockKeyhole className="mr-1.5 h-3.5 w-3.5" />
              Secure access
            </Badge>
            <div>
              <CardTitle className="text-3xl">Sign in to Livequest Studio</CardTitle>
              <CardDescription className="text-base">
                Welcome back. Enter your credentials to continue crafting live coverage.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <SignInForm defaultEmail={email} defaultError={error} pendingVerification={pendingVerification} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
