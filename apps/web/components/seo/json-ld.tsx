import { site } from "@/lib/site";
import { capabilityGroups } from "@/lib/tools";
import { faqs } from "@/lib/faqs";

// Escape characters that are meaningful to the HTML parser before injecting the
// JSON string into a <script> tag. Roblox game names / FAQ text are
// attacker-controllable and flow into JSON-LD, so an unescaped "</script>" (or a
// U+2028/U+2029 line separator, which is invalid in a JS string literal) could
// break out of the script element. The \uXXXX escapes below remain valid JSON.
// U+2028/U+2029 are matched via fromCharCode so no raw separator is in source.
const LINE_SEPARATOR = String.fromCharCode(0x2028);
const PARAGRAPH_SEPARATOR = String.fromCharCode(0x2029);

function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data)
    .replace(/[<>&]/g, (ch) => `\\u${ch.charCodeAt(0).toString(16).padStart(4, "0")}`)
    .split(LINE_SEPARATOR)
    .join("\\u2028")
    .split(PARAGRAPH_SEPARATOR)
    .join("\\u2029");
}

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}

export function OrganizationJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${site.url}#organization`,
        name: site.name,
        url: site.url,
        description: site.description,
        logo: `${site.url}/icon`,
      },
      {
        "@type": "WebSite",
        "@id": `${site.url}#website`,
        url: site.url,
        name: site.name,
        description: site.tagline,
        publisher: { "@id": `${site.url}#organization` },
      },
    ],
  };
  return <JsonLd data={data} />;
}

export function SoftwareApplicationJsonLd() {
  const featureList = capabilityGroups.map((g) => g.name);
  const data = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: site.name,
    description: site.description,
    url: site.url,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    browserRequirements: "Requires a modern web browser",
    featureList,
    author: {
      "@type": "Person",
      name: site.author,
    },
  };
  return <JsonLd data={data} />;
}

export function FaqJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
  return <JsonLd data={data} />;
}
