import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MailCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const runtime = "edge";

export const metadata: Metadata = {
  title: "Confirm your email",
  description: "Check your inbox to activate your Livequest Studio account and unlock the dashboard.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function VerifySignupPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const sp = await searchParams;
  const email = sp?.email;
  const inbox = email ? (
    <span className="font-medium text-foreground">{email}</span>
  ) : (
    "the inbox you used to sign up"
  );

  return (
    <div className="relative flex min-h-[80vh] items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(244,244,245,0.05),_transparent_55%)]" />
      <div className="relative z-10 mx-auto w-full max-w-lg">
        <Card className="border-border/60 bg-background/60 backdrop-blur">
          <CardHeader className="space-y-4 text-center">
            <Badge variant="muted" className="mx-auto w-fit border-border/40">
              <MailCheck className="mr-1.5 h-3.5 w-3.5" />
              Check your inbox
            </Badge>
            <div>
              <CardTitle className="text-3xl">Confirm your email</CardTitle>
              <CardDescription className="text-base">
                Before you can sign in, open the welcome email we just sent to{" "}
                {inbox} and follow the confirmation link.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 text-sm text-muted-foreground">
            <p>
              The link activates your Livequest Studio account and unlocks access to the
              dashboard. It may take a minute to arrive, so be sure to check spam or
              promotions folders.
            </p>
            <p>
              Ready to go? Return here after confirming and continue to the sign-in
              page.
            </p>
            <Button asChild className="w-full" size="lg">
              <Link href="/signin">
                Continue to sign in
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
