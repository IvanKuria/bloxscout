import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { signOutEverywhere } from "./actions";
import { AppearanceControl } from "@/components/settings/appearance-control";
import { DeleteAccount } from "@/components/settings/delete-account";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { FREE_DAILY_RUNS } from "@/lib/limits";
import { getEntitlement } from "@/lib/supabase/account";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false, follow: false },
};

export default async function SettingsPage() {
  // Re-check auth at the data source (defense in depth). redirect() throws
  // NEXT_REDIRECT, so it lives OUTSIDE the try/catch.
  let user: { id: string; email: string | null } | null = null;
  let runsToday = 0;
  let isPaid = false;

  try {
    const supabase = await createClient();
    const {
      data: { user: authedUser },
    } = await supabase.auth.getUser();

    if (authedUser) {
      user = { id: authedUser.id, email: authedUser.email ?? null };

      // Today's usage from the RLS-scoped view (caller's row only).
      const { data: usage } = await supabase
        .from("my_usage")
        .select("runs")
        .maybeSingle();
      runsToday = usage?.runs ?? 0;

      const ent = await getEntitlement(authedUser.id);
      isPaid = ent.tier !== "free";
    }
  } catch {
    // Auth not configured · fall through to the redirect guard below.
  }

  if (!user) redirect("/login?redirectedFrom=/settings");

  const used = Math.min(runsToday, FREE_DAILY_RUNS);
  const pct = isPaid
    ? 100
    : Math.min(100, Math.round((used / FREE_DAILY_RUNS) * 100));

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col gap-8 overflow-y-auto px-6 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your appearance, usage, and account.
        </p>
      </header>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Choose how bloxscout looks on this device.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AppearanceControl />
        </CardContent>
      </Card>

      {/* Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Usage</CardTitle>
          <CardDescription>
            {isPaid
              ? "Your plan includes unlimited Copilot runs."
              : "Free accounts get a limited number of Copilot runs each day."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {isPaid ? (
            <p className="text-sm font-medium text-foreground">
              Unlimited{" "}
              <span className="text-primary">(Pro)</span>
            </p>
          ) : (
            <>
              <p className="text-sm text-foreground">
                <span className="font-medium tabular-nums">{used}</span> of{" "}
                <span className="font-medium tabular-nums">
                  {FREE_DAILY_RUNS}
                </span>{" "}
                free runs used today
              </p>
              <div
                className="h-2 w-full overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={FREE_DAILY_RUNS}
                aria-valuenow={used}
                aria-label="Free runs used today"
              >
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              {used >= FREE_DAILY_RUNS ? (
                <p className="text-xs text-muted-foreground">
                  You have used all your free runs for today. They reset at
                  midnight UTC.
                </p>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Your sign-in identity.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Email</span>
            <span className="break-all text-sm text-foreground">
              {user.email ?? "Not available"}
            </span>
          </div>
          <Separator />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Sign out of bloxscout on all of your devices.
            </p>
            <form action={signOutEverywhere}>
              <Button type="submit" variant="outline" size="sm">
                Sign out everywhere
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="ring-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">Danger zone</CardTitle>
          <CardDescription>
            Irreversible actions. Proceed with care.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Permanently delete your account and all associated data.
          </p>
          <DeleteAccount />
        </CardContent>
      </Card>
    </div>
  );
}
