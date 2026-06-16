import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PLANS, type Tier } from "@/lib/stripe/config";
import { getEntitlement } from "@/lib/supabase/account";
import { createClient } from "@/lib/supabase/server";
import { ManageButton, UpgradeButton } from "./billing-actions";

export const metadata: Metadata = {
  title: "Account",
  robots: { index: false, follow: false },
};

const TIER_ORDER: Tier[] = ["free", "pro"];

function fmtDate(iso: string | null): string {
  if (!iso) return "·";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectedFrom=/app");

  const ent = await getEntitlement(user.id);
  const plan = PLANS[ent.tier];
  const isPaid = ent.tier !== "free";

  return (
    <div className="mx-auto flex h-full w-full max-w-4xl flex-col gap-10 overflow-y-auto px-6 py-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Account
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your plan, billing, and workspace details.
          </p>
        </div>
        <Button render={<Link href="/app/copilot" />} variant="outline">
          Open the AI agent
          <ArrowUpRight />
        </Button>
      </header>

      {/* Identity + current entitlement */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your plan</CardTitle>
          <CardDescription>
            Signed in as {user.email ?? "your account"}.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">Email</span>
              <span className="break-all text-sm text-foreground">
                {user.email ?? "·"}
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">Current tier</span>
              <span className="flex items-center gap-2">
                <span className="font-heading text-lg font-semibold leading-none">
                  {plan.name}
                </span>
                {isPaid ? (
                  <Badge variant="secondary" className="capitalize">
                    {ent.status ?? "active"}
                  </Badge>
                ) : null}
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">
                {ent.cancelAtPeriodEnd ? "Cancels on" : "Renews on"}
              </span>
              <span className="text-sm tabular-nums text-foreground">
                {isPaid ? fmtDate(ent.currentPeriodEnd) : "·"}
              </span>
            </div>
          </div>
        </CardContent>

        {(isPaid || ent.hasStripeCustomer) && (
          <CardFooter className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Update payment method, switch plans, or cancel.
            </p>
            <ManageButton />
          </CardFooter>
        )}
      </Card>

      {/* Plan options */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="font-heading text-lg font-semibold tracking-tight">
            Plans
          </h2>
          <p className="text-sm text-muted-foreground">
            Choose the tier that fits how you build.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {TIER_ORDER.map((t) => {
            const p = PLANS[t];
            const isCurrent = t === ent.tier;
            return (
              <Card
                key={t}
                className={
                  isCurrent ? "ring-2 ring-primary" : undefined
                }
              >
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle>{p.name}</CardTitle>
                    {isCurrent ? <Badge>Current</Badge> : null}
                  </div>
                  <div className="flex items-baseline gap-1 pt-1">
                    <span className="font-heading text-2xl font-semibold leading-none tabular-nums">
                      {p.priceMonthly}
                    </span>
                    <span className="text-xs text-muted-foreground">/mo</span>
                  </div>
                  <CardDescription>{p.tagline}</CardDescription>
                </CardHeader>

                <CardContent className="flex flex-1 flex-col gap-5">
                  <Separator />
                  <ul className="flex flex-col gap-2 text-sm text-foreground/80">
                    {p.features.map((f) => (
                      <li key={f} className="flex gap-2">
                        <span aria-hidden className="text-primary">
                          ✓
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto flex flex-col gap-2">
                    {t === "free" || isCurrent ? (
                      <span className="text-xs text-muted-foreground">
                        {isCurrent ? "Active plan" : "Default plan"}
                      </span>
                    ) : (
                      <>
                        <UpgradeButton
                          tier={t as Exclude<Tier, "free">}
                          interval="monthly"
                          label={`Upgrade · ${p.priceMonthly}/mo`}
                        />
                        <UpgradeButton
                          tier={t as Exclude<Tier, "free">}
                          interval="yearly"
                          label={`Annual · ${p.priceYearly}/yr`}
                          variant="outline"
                        />
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
