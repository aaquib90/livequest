import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";

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

async function signUpAction(formData: FormData) {
  "use server";
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) {
    return redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }
  return redirect("/dashboard");
}

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
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
            {error ? (
              <div
                className="flex items-center justify-center rounded-2xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground/90"
                role="alert"
              >
                {error}
              </div>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-5">
            <form action={signUpAction} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="team@yournewsroom.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  placeholder="Create a strong password"
                />
              </div>
              <Button type="submit" className="w-full" size="lg">
                Sign up
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link className="text-foreground underline decoration-dotted" href="/signin">
                Sign in
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
