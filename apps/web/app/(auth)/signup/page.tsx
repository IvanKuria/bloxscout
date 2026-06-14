import type { Metadata } from "next";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create a bloxscout account.",
  robots: { index: false, follow: false },
};

// Same passwordless flow as /login — magic-link / Discord both create the
// account on first sign-in.
export default function SignupPage() {
  return <AuthForm />;
}
