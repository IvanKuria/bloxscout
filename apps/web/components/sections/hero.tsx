import { CtaLink } from "./cta-link";
import { BlurText } from "@/components/ui/blur-text";
import AnimatedContent from "@/components/ui/animated-content";
import { HeroBackdrop } from "./hero-backdrop";
import { AppWindow } from "./app-window";

/**
 * Hero — centered, product-led, and calm (OpenAI/ChatGPT idiom): a clean Geist
 * headline with "AI agent" emphasized, a subhead, a pill CTA pair, and a
 * browser window framing the REAL bloxscout agent answering with live data. A
 * faint token-based glow gives the backdrop quiet depth.
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden bg-background">
      <HeroBackdrop />

      <div className="relative mx-auto max-w-5xl px-6 pt-24 pb-24 text-center sm:pt-28 lg:pt-32">
        <h1 className="mx-auto max-w-3xl text-[2.6rem] leading-[1.05] font-semibold tracking-tight text-foreground sm:text-[3.4rem] lg:text-[3.9rem]">
          <span className="block">
            The <span className="text-primary">AI agent</span> for
          </span>
          <BlurText
            text="Roblox game ideas."
            animateBy="words"
            delay={70}
            className="block"
          />
        </h1>

        <p className="mx-auto mt-7 max-w-xl text-[1.0625rem] leading-[1.6] text-muted-foreground">
          bloxscout reasons over the live Roblox economy to tell you what to
          build, and whether you can actually win the niche, before you write a
          line of code.
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <CtaLink href="/signup" size="lg">
            Start free
          </CtaLink>
          <CtaLink href="#demo" variant="outline" size="lg">
            See it work
          </CtaLink>
        </div>

        <p className="mt-6 text-[13px] text-muted-foreground">
          Nothing to install · live data, refreshed every ~30 min
        </p>

        {/* The real product (live data) in a browser window. */}
        <AnimatedContent
          distance={48}
          duration={0.9}
          className="relative mx-auto mt-16 max-w-5xl"
        >
          <AppWindow />
        </AnimatedContent>
      </div>
    </section>
  );
}
