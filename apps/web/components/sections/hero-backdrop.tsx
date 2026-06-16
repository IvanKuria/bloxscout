/**
 * HeroBackdrop — a calm, token-based ambient glow behind the hero in the
 * OpenAI/ChatGPT idiom. No WebGL, no loud effect: just a faint primary-tinted
 * radial bloom and a soft neutral wash that read correctly in light and dark.
 * Purely decorative and motion-free, so it's reduced-motion safe by default.
 */
export function HeroBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {/* faint green bloom from the top */}
      <div className="absolute inset-x-0 -top-40 h-[28rem] bg-[radial-gradient(60%_60%_at_50%_0%,var(--accent-tint),transparent_70%)]" />
      {/* soft neutral wash to lift the product window off the page */}
      <div className="absolute inset-x-0 bottom-0 h-72 bg-gradient-to-b from-transparent to-muted/60" />
    </div>
  );
}
