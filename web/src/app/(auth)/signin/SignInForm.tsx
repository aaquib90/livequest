"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, MailOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/browserClient";

type SignInFormProps = {
  defaultEmail?: string | null;
  defaultError?: string | null;
  pendingVerification?: boolean;
};

export default function SignInForm({
  defaultEmail = "",
  defaultError = null,
  pendingVerification = false,
}: SignInFormProps) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [error, setError] = useState<string | null>(defaultError);
  const [needsVerification, setNeedsVerification] = useState<boolean>(pendingVerification);
  const [isPending, startTransition] = useTransition();
  const [emailValue, setEmailValue] = useState(defaultEmail ?? "");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") || "");
    const password = String(formData.get("password") || "");
    if (!email || !password) return;
    setError(null);
    setNeedsVerification(false);
    startTransition(async () => {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        const msg = authError.message?.toLowerCase() ?? "";
        if (msg.includes("confirm")) {
          setNeedsVerification(true);
          setEmailValue(email);
          return;
        }
        setError(authError.message ?? "Unable to sign in. Please try again.");
        return;
      }
      router.push("/dashboard");
    });
  }

  return (
    <div className="space-y-5">
      {needsVerification ? (
        <div
          className="flex items-start gap-3 rounded-2xl border border-primary/40 bg-primary/10 px-4 py-3 text-left text-sm text-foreground"
          role="status"
        >
          <MailOpen className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
          <div className="space-y-1">
            <p className="font-medium text-foreground">Confirm your email to continue</p>
            <p className="text-muted-foreground">
              We emailed a welcome link to{" "}
              <span className="font-medium text-foreground">{emailValue || "the inbox you used to sign up"}</span>. Open it to activate your account and then return to sign in.
            </p>
          </div>
        </div>
      ) : null}
      {error ? (
        <div
          className="flex items-center gap-2 rounded-2xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground/90"
          role="alert"
        >
          {error}
        </div>
      ) : null}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            defaultValue={defaultEmail || ""}
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
        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              Sign in
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </form>
      <p className="text-sm text-muted-foreground">
        No account yet?{" "}
        <a className="text-foreground underline decoration-dotted" href="/signup">
          Create one in seconds
        </a>
        .
      </p>
    </div>
  );
}

