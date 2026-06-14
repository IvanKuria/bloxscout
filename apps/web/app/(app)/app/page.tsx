import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PLANS, type Tier } from "@/lib/stripe/config";
import { getEntitlement } from "@/lib/supabase/account";
import { createClient } from "@/lib/supabase/server";
import { ManageButton, UpgradeButton } from "./billing-actions";

export const metadata: Metadata = {
  title: "Account",
  robots: { index: false, follow: false },
};

const TIER_ORDER: Tier[] = ["free", "pro", "studio"];

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
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
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
          Account
        </span>
        <h1 className="font-heading text-3xl font-semibold leading-tight">
          Your console
        </h1>
      </header>

      {/* Identity + current entitlement */}
      <section className="recon-grid relative overflow-hidden rounded-xl border border-console-border bg-black/25">
        <span className="absolute right-3 top-3 font-mono text-[10px] uppercase tracking-[0.18em] text-console-muted">
          Status
        </span>
        <div className="grid gap-px sm:grid-cols-3">
          <div className="flex flex-col gap-1.5 p-5">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-console-muted">
              Signed in as
            </span>
            <span className="break-all font-mono text-sm text-console-foreground">
              {user.email ?? "—"}
            </span>
          </div>
          <div className="flex flex-col gap-1.5 p-5">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-console-muted">
              Current tier
            </span>
            <span className="flex items-center gap-2">
              <span className="font-heading text-2xl font-semibold leading-none">
                {plan.name}
              </span>
              {isPaid ? (
                <span className="rounded-sm bg-accent/15 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-accent">
                  {ent.status ?? "active"}
                </span>
              ) : null}
            </span>
          </div>
          <div className="flex flex-col gap-1.5 p-5">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-console-muted">
              {ent.cancelAtPeriodEnd ? "Cancels on" : "Renews on"}
            </span>
            <span className="tabular font-mono text-sm text-console-foreground">
              {isPaid ? fmtDate(ent.currentPeriodEnd) : "—"}
            </span>
          </div>
        </div>

        {(isPaid || ent.hasStripeCustomer) && (
          <div className="flex items-center justify-between gap-4 border-t border-console-border bg-black/20 px-5 py-4">
            <p className="text-sm text-console-muted">
              Update payment method, switch plans, or cancel.
            </p>
            <ManageButton />
          </div>
        )}
      </section>

      {/* Plan options */}
      <section className="flex flex-col gap-4">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-console-muted">
          Plans
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {TIER_ORDER.map((t) => {
            const p = PLANS[t];
            const isCurrent = t === ent.tier;
            return (
              <div
                key={t}
                className={`flex flex-col gap-4 rounded-xl border bg-black/25 p-5 ${
                  isCurrent
                    ? "border-accent/50 ring-1 ring-accent/20"
                    : "border-console-border"
                }`}
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between">
                    <span className="font-heading text-lg font-semibold">
                      {p.name}
                    </span>
                    {isCurrent ? (
                      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-accent">
                        Current
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="tabular font-heading text-2xl font-semibold leading-none">
                      {p.priceMonthly}
                    </span>
                    <span className="font-mono text-xs text-console-muted">
                      /mo
                    </span>
                  </div>
                  <p className="text-xs text-console-muted">{p.tagline}</p>
                </div>

                <ul className="flex flex-col gap-1.5 text-xs text-console-foreground/80">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span className="text-accent">›</span>
                      {f}
                    </li>
                  ))}
                </ul>

                <div className="mt-auto flex flex-col gap-2">
                  {t === "free" || isCurrent ? (
                    <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-console-muted">
                      {isCurrent ? "Active plan" : "Default"}
                    </span>
                  ) : (
                    <>
                      <UpgradeButton
                        tier={t as Exclude<Tier, "free">}
                        interval="monthly"
                        label={`Upgrade — ${p.priceMonthly}/mo`}
                      />
                      <UpgradeButton
                        tier={t as Exclude<Tier, "free">}
                        interval="yearly"
                        label={`Annual — ${p.priceYearly}/yr`}
                        variant="outline"
                      />
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
