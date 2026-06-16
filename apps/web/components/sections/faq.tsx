import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { faqs } from "@/lib/faqs";
import { Section, Eyebrow } from "./section";

export function Faq() {
  return (
    <Section tone="muted" id="faq" innerClassName="max-w-3xl py-24 sm:py-32">
      <div className="mb-12">
        <Eyebrow>FAQ</Eyebrow>
        <h2 className="mt-5 text-[2rem] leading-[1.08] font-semibold tracking-tight text-foreground sm:text-[2.75rem]">
          Questions, answered.
        </h2>
      </div>

      <Accordion className="w-full border-t border-border">
        {faqs.map((faq, i) => (
          <AccordionItem
            key={faq.question}
            value={`item-${i}`}
            className="border-border"
          >
            <AccordionTrigger className="py-6 text-left text-[17px] font-medium tracking-[-0.01em] text-foreground hover:no-underline">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent className="pb-6 text-[15px] leading-relaxed text-muted-foreground">
              {faq.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </Section>
  );
}
