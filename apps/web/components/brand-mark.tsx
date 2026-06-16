/**
 * BrandMark — bloxscout's logo mark: a radar / scope monogram (it "scouts" the
 * Roblox economy). Concentric rings + a sweep line in `currentColor` (so it
 * inherits ink/white per surface) with a single magenta blip on the accent.
 * Crisp at any size; pass `className` to size + colour the rings.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className}
    >
      {/* scope rings */}
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <circle
        cx="12"
        cy="12"
        r="4.5"
        stroke="currentColor"
        strokeWidth="1.4"
        opacity="0.45"
      />
      {/* sweep line to the blip */}
      <path
        d="M12 12 L18.4 6.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {/* the blip — the one accent moment */}
      <circle cx="18.4" cy="6.2" r="2.1" fill="var(--accent)" />
    </svg>
  );
}

/** Wordmark lockup: the mark + "bloxscout" in the grotesque. */
export function BrandLockup({
  className,
  markClassName = "size-5",
}: {
  className?: string;
  markClassName?: string;
}) {
  return (
    <span className={className}>
      <BrandMark className={markClassName} />
      <span className="font-medium tracking-[-0.01em]">bloxscout</span>
    </span>
  );
}
