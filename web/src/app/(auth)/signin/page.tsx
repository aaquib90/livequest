import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, LockKeyhole } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/serverClient";

export const runtime = "edge";

async function signInAction(formData: FormData) {
  "use server";
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return redirect(`/signin?error=${encodeURIComponent(error.message)}`);
  }
  return redirect("/dashboard");
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  const error = sp?.error;
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
            {error ? (
              <div
                className="flex items-center gap-2 rounded-2xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground/90"
                role="alert"
              >
                {error}
              </div>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-5">
            <form action={signInAction} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                />
              </div>
              <Button type="submit" className="w-full" size="lg">
                Sign in
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
            <p className="text-sm text-muted-foreground">
              No account yet?{" "}
              <Link className="text-foreground underline decoration-dotted" href="/signup">
                Create one in seconds
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
