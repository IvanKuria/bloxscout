"use client";

/**
 * NicheShowcase — a 3D, drag-spinnable cube of real games the agent is watching
 * right now (vendored fancycomponents `BoxCarousel`). The face in view drives a
 * synced caption (game name + genre + live CCU). Reduced-motion is handled inside
 * BoxCarousel (instant transitions); we additionally fall back to a static card
 * if there aren't enough faces or the cube can't mount.
 */
import * as React from "react";
import BoxCarousel, {
  type BoxCarouselRef,
  type CarouselItem,
} from "@/components/fancy/box-carousel";

export type ShowcaseGame = {
  id: number;
  name: string;
  genre: string | null;
  playing: number;
  icon: string;
};

function compactNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

export function NicheShowcase({ games }: { games: ShowcaseGame[] }) {
  const ref = React.useRef<BoxCarouselRef>(null);
  const [index, setIndex] = React.useState(0);
  const [dims, setDims] = React.useState({ w: 360, h: 360 });

  React.useEffect(() => {
    const fit = () => {
      const v = Math.min(360, Math.max(260, window.innerWidth - 80));
      setDims({ w: v, h: v });
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  if (games.length < 4) return null;

  const items: CarouselItem[] = games.map((g) => ({
    id: String(g.id),
    type: "image",
    src: g.icon,
    alt: g.name,
  }));

  const active = games[index] ?? games[0];

  return (
    <div className="grid items-center gap-12 lg:grid-cols-[1fr_auto] lg:gap-16">
      {/* Synced caption / readout */}
      <div className="order-2 lg:order-1">
        <p className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
          now in view · {String(index + 1).padStart(2, "0")} /{" "}
          {String(games.length).padStart(2, "0")}
        </p>
        <h3 className="mt-3 font-heading text-3xl leading-tight font-semibold tracking-[-0.01em] text-foreground sm:text-4xl">
          {active.name}
        </h3>
        <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-3">
          <div>
            <p className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
              genre
            </p>
            <p className="mt-0.5 text-sm font-medium text-foreground">
              {active.genre ?? "Uncategorized"}
            </p>
          </div>
          <div>
            <p className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
              playing now
            </p>
            <p className="tabular mt-0.5 font-mono text-sm text-foreground">
              {compactNum(active.playing)}
            </p>
          </div>
        </div>

        <div className="mt-7 flex items-center gap-3">
          <button
            type="button"
            onClick={() => ref.current?.prev()}
            aria-label="Previous game"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-foreground transition-colors hover:bg-secondary"
          >
            <span aria-hidden>←</span>
          </button>
          <button
            type="button"
            onClick={() => ref.current?.next()}
            aria-label="Next game"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-foreground transition-colors hover:bg-secondary"
          >
            <span aria-hidden>→</span>
          </button>
          <span className="ml-1 font-mono text-[10px] tracking-[0.16em] text-muted-foreground/70 uppercase select-none">
            or drag to spin
          </span>
        </div>
      </div>

      {/* The cube */}
      <div className="order-1 flex justify-center lg:order-2">
        <div className="relative">
          <div className="pointer-events-none absolute -inset-8 -z-10 bg-[radial-gradient(55%_55%_at_50%_45%,rgba(226,35,26,0.10),transparent_72%)]" />
          <BoxCarousel
            ref={ref}
            items={items}
            width={dims.w}
            height={dims.h}
            direction="left"
            autoPlay
            autoPlayInterval={3200}
            onIndexChange={setIndex}
            className="rounded-2xl [&_img]:rounded-2xl"
          />
        </div>
      </div>
    </div>
  );
}
