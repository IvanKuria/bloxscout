import { site } from "@/lib/site";
import { toolCategories } from "@/lib/tools";
import { faqs } from "@/lib/faqs";

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
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
        sameAs: [site.github, site.npm],
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
  const featureList = toolCategories.flatMap((c) =>
    c.tools.map((t) => t.name),
  );
  const data = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: site.name,
    description: site.description,
    url: site.url,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "macOS, Linux, Windows",
    softwareRequirements: "Node.js 20+",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    license: "https://opensource.org/license/mit",
    featureList,
    softwareVersion: "0.1.2",
    downloadUrl: site.npm,
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
