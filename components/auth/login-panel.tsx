"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginPanel() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [message, setMessage] = useState<string | null>(
    params?.get("notice") ??
      params?.get("error") ??
      null,
  );
  const [loading, setLoading] = useState(false);

  async function authenticate() {
    setLoading(true);
    setMessage(null);
    const supabase = createSupabaseBrowserClient();

    try {
      if (!email || password.length < 8) {
        setMessage("Email + ≥8 characters on the password.");
        setLoading(false);
        return;
      }

      const response =
        mode === "login"
          ? await supabase.auth.signInWithPassword({
              email,
              password,
            })
          : await supabase.auth.signUp({
              email,
              password,
            });

      if (response.error) {
        setMessage(response.error.message);
        setLoading(false);
        return;
      }

      if (mode === "register" && !response.data.session) {
        setMessage("Check inbox to confirm—or disable email confirmations in Supabase for dev.");
        setLoading(false);
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      console.error(error);
      setMessage("Unexpected issue. Refresh and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-neutral-900 bg-neutral-950/95">
      <CardHeader className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">
          May–June lean gain
        </p>
        <CardTitle className="text-3xl font-semibold text-neutral-50">
          {mode === "login" ? "Back to the cockpit" : "Spin up workspace"}
        </CardTitle>
        <p className="text-sm text-neutral-400">
          Password stays local via Supabase—keep it ruthless and unique.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="inline-flex rounded-full border border-neutral-800 bg-neutral-900 p-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-neutral-300">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`rounded-full px-4 py-1 ${
              mode === "login" ? "bg-neutral-50 text-neutral-950" : ""
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`rounded-full px-4 py-1 ${
              mode === "register" ? "bg-neutral-50 text-neutral-950" : ""
            }`}
          >
            Create account
          </button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            minLength={8}
            placeholder="*******"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        {message ? (
          <div className="rounded-xl border border-amber-500/40 bg-amber-950/40 px-3 py-2 text-xs text-amber-100">
            {message}
          </div>
        ) : null}

        <Button
          type="button"
          variant="muted"
          className="mt-5 w-full border border-transparent bg-neutral-50 py-[14px] text-lg font-semibold text-neutral-950 hover:bg-neutral-200"
          onClick={authenticate}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 aria-hidden className="size-5 animate-spin" />
              Working...
            </>
          ) : mode === "login" ? (
            "Kick off session"
          ) : (
            "Register & provision data"
          )}
        </Button>

        <p className="text-center text-[13px] text-neutral-400">
          By continuing you acknowledge this is coaching software for your own accountability,
          not clinical advice.&nbsp;
          <Link href="https://supabase.com/" className="text-neutral-200 underline-offset-4">
            Supabase
          </Link>{" "}
          handles auth parity with bank-grade infra.
        </p>
      </CardContent>
    </Card>
  );
}
