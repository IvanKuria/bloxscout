"use client";

import { LoaderCircle } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { type AuthState, signInWithDiscord } from "./actions";

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

function DiscordSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending} className="w-full">
      {pending ? (
        <LoaderCircle className="size-4 animate-spin" />
      ) : (
        <>
          <DiscordIcon className="size-4" />
          Continue with Discord
        </>
      )}
    </Button>
  );
}

export function AuthForm() {
  const [discordState, discordAction] = useActionState<
    AuthState | undefined,
    FormData
  >(async () => signInWithDiscord(), undefined);

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-[0_1px_0_rgba(23,23,29,0.04),0_24px_60px_-28px_rgba(23,23,29,0.25)] sm:p-7">
      <div className="mb-6 flex flex-col gap-1.5">
        <h2 className="font-heading text-2xl leading-tight text-foreground">
          Sign in with Discord
        </h2>
        <p className="text-sm leading-relaxed text-foreground/60">
          One tap, no password. Most Roblox developers already have a Discord
          account, so there&apos;s nothing new to set up.
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

      <p className="mt-5 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40">
        Signing in means you accept the terms
      </p>
    </div>
  );
}
