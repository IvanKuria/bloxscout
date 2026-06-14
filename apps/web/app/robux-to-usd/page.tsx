import { permanentRedirect } from "next/navigation";

// `/robux-to-usd` is the high-intent alias for the DevEx calculator. We send it
// to the canonical calculator route so there's a single indexable surface.
export default function RobuxToUsd() {
  permanentRedirect("/calculators/devex");
}
