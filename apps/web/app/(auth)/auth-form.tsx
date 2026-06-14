"use client";

import { ArrowRight, CheckCircle2, LoaderCircle, Mail } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import {
  type AuthState,
  signInWithDiscord,
  signInWithEmail,
} from "./actions";

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M20.317 4.369A19.79 19.79 0 0 0 16.558 3.2a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.249a18.27 18.27 0 0 0-5.487 0 12.6 12.6 0 0 0-.617-1.25.077.077 0 0 0-.079-.036A19.736 19.736 0 0 0 5.33 4.37a.07.07 0 0 0-.032.027C2.884 7.95 2.249 11.43 2.561 14.86a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.893.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.099.246.197.372.291a.077.077 0 0 1-.006.128c-.598.349-1.22.645-1.873.892a.076.076 0 0 0-.04.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.055c.5-3.94-.838-7.39-3.548-10.464a.061.061 0 0 0-.031-.028zM8.02 12.776c-1.182 0-2.157-1.085-2.157-2.419 0-1.333.956-2.418 2.157-2.418 1.21 0 2.176 1.094 2.157 2.418 0 1.334-.956 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.418 2.157-2.418 1.21 0 2.176 1.094 2.157 2.418 0 1.334-.946 2.419-2.157 2.419z" />
    </svg>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-console-muted">
      {children}
    </span>
  );
}

function EmailSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="lg"
      disabled={pending}
      className="w-full bg-accent text-accent-foreground hover:bg-accent-hover"
    >
      {pending ? (
        <LoaderCircle className="size-4 animate-spin" />
      ) : (
        <>
          Send magic link
          <ArrowRight className="size-4" />
        </>
      )}
    </Button>
  );
}

function DiscordSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="outline"
      size="lg"
      disabled={pending}
      className="w-full border-console-border bg-transparent text-console-foreground hover:bg-white/5 hover:text-console-foreground"
    >
      {pending ? (
        <LoaderCircle className="size-4 animate-spin" />
      ) : (
        <>
          <DiscordIcon className="size-4 text-[#5865F2]" />
          Continue with Discord
        </>
      )}
    </Button>
  );
}

export function AuthForm() {
  const [emailState, emailAction] = useActionState<
    AuthState | undefined,
    FormData
  >(signInWithEmail, undefined);
  const [discordState, discordAction] = useActionState<
    AuthState | undefined,
    FormData
  >(async () => signInWithDiscord(), undefined);

  return (
    <div className="rounded-xl border border-console-border bg-black/30 p-6 backdrop-blur-sm">
      <div className="mb-6 flex flex-col gap-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
          Access console
        </span>
        <h1 className="font-heading text-2xl font-semibold leading-tight text-console-foreground">
          Sign in or create an account
        </h1>
        <p className="text-sm text-console-muted">
          Start asking the agent for winning Roblox ideas. No password — we send
          a one-time link.
        </p>
      </div>

      {/* Discord OAuth */}
      <form action={discordAction}>
        <DiscordSubmit />
      </form>
      {discordState?.error ? (
        <p className="mt-2 font-mono text-xs text-negative">
          {discordState.error}
        </p>
      ) : null}

      {/* Divider */}
      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-console-border" />
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-console-muted">
          or via email
        </span>
        <div className="h-px flex-1 bg-console-border" />
      </div>

      {/* Magic-link email */}
      {emailState?.message ? (
        <div className="flex items-start gap-2.5 rounded-lg border border-positive/30 bg-positive/10 p-3.5">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-positive" />
          <p className="text-sm text-console-foreground">{emailState.message}</p>
        </div>
      ) : (
        <form action={emailAction} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <FieldLabel>Email address</FieldLabel>
            <div className="flex items-center gap-2 rounded-lg border border-console-border bg-black/40 px-3 focus-within:border-accent">
              <Mail className="size-4 text-console-muted" />
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                placeholder="you@studio.gg"
                className="h-10 w-full bg-transparent font-mono text-sm text-console-foreground outline-none placeholder:text-console-muted/60"
              />
            </div>
          </label>
          {emailState?.error ? (
            <p className="font-mono text-xs text-negative">{emailState.error}</p>
          ) : null}
          <EmailSubmit />
        </form>
      )}

      <p className="mt-5 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-console-muted">
        Signing in means you accept the terms
      </p>
    </div>
  );
}
