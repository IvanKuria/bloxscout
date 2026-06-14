import type { Metadata } from "next";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to bloxscout.",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return <AuthForm />;
}
