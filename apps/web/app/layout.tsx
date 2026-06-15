import type { Metadata } from "next";
import { Host_Grotesk, Azeret_Mono, Aleo } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { OrganizationJsonLd } from "@/components/seo/json-ld";
import { site } from "@/lib/site";
import "./globals.css";

// Primary face — a refined, low-contrast grotesque. Headings run light (300);
// body weights 300–600. Twenty.com's signature type voice.
const hostGrotesk = Host_Grotesk({
  variable: "--font-host-grotesk",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

// Mono — labels, buttons, numerics. Used uppercase for UI chrome.
const azeretMono = Azeret_Mono({
  variable: "--font-azeret-mono",
  subsets: ["latin"],
  weight: ["300", "500"],
  display: "swap",
});

// Editorial serif accent — sparing display moments (Aleo light).
const aleo = Aleo({
  variable: "--font-aleo",
  subsets: ["latin"],
  weight: ["300", "400"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s — ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  keywords: [
    "Roblox",
    "AI agent",
    "Roblox game ideas",
    "what Roblox game to make",
    "Roblox niche analysis",
    "emergent Roblox niches",
    "Roblox market analysis",
    "Roblox game discovery",
    "Roblox saturation",
    "Roblox breakout games",
    "Roblox analytics",
    "Roblox developer tools",
  ],
  authors: [{ name: site.name }],
  creator: site.name,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: site.url,
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
    siteName: site.name,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${hostGrotesk.variable} ${azeretMono.variable} ${aleo.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <OrganizationJsonLd />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
