"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/browserClient";

type SignUpFormProps = {
  defaultError?: string | null;
};

export default function SignUpForm({ defaultError = null }: SignUpFormProps) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [error, setError] = useState<string | null>(defaultError);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") || "");
    const password = String(formData.get("password") || "");

    if (!email || !password) return;
    setError(null);

    startTransition(async () => {
      const { error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) {
        setError(signUpError.message ?? "Unable to create your account. Please try again.");
        return;
      }
      router.push(`/signup/verify?email=${encodeURIComponent(email)}`);
    });
  }

  return (
    <div className="space-y-5">
      {error ? (
        <div
          className="flex items-center justify-center rounded-2xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground/90"
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
        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating your studio...
            </>
          ) : (
            <>
              Sign up
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </form>
      <p className="text-sm text-muted-foreground">
        Already have an account?{" "}
        <a className="text-foreground underline decoration-dotted" href="/signin">
          Sign in
        </a>
        .
      </p>
    </div>
  );
}

