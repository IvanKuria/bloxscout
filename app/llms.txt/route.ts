import { site } from "@/lib/site";
import { toolCategories, totalToolCount } from "@/lib/tools";
import { integrations } from "@/lib/integrations";
import { faqs } from "@/lib/faqs";

export const dynamic = "force-static";

export async function GET(): Promise<Response> {
  const toolsSection = toolCategories
    .map((category) => {
      const tools = category.tools
        .map((tool) => `- \`${tool.name}\` — ${tool.description}`)
        .join("\n");
      return `### ${category.name}\n${tools}`;
    })
    .join("\n\n");

  const integrationsSection = integrations
    .map((integration) => `- ${integration.name}`)
    .join("\n");

  const faqSection = faqs
    .map((faq) => `### ${faq.question}\n${faq.answer}`)
    .join("\n\n");

  const body = `# ${site.name}

> ${site.tagline}

${site.description}

## Install

${site.installCommand}

Also works in Cursor, Windsurf, and Zed via standard MCP config. See ${site.github} for full instructions.

## Tools (${totalToolCount} total)

${toolsSection}

## Integrations
${integrationsSection}

## FAQ

${faqSection}

## Links
- Site: ${site.url}
- GitHub: ${site.github}
- npm: ${site.npm}
- License: ${site.license}
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
