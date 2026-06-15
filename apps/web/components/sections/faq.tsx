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
    <Section scheme="muted" id="faq" innerClassName="max-w-3xl py-24 sm:py-32">
      <div className="mb-12">
        <Eyebrow>FAQ</Eyebrow>
        <h2 className="mt-5 text-[2rem] leading-[1.08] font-light tracking-[-0.04em] text-foreground sm:text-[2.75rem]">
          Questions, answered.
        </h2>
      </div>

      <Accordion className="w-full border-t border-foreground/10">
        {faqs.map((faq, i) => (
          <AccordionItem
            key={faq.question}
            value={`item-${i}`}
            className="border-foreground/10"
          >
            <AccordionTrigger className="py-6 text-left text-[17px] font-normal tracking-[-0.01em] text-foreground hover:no-underline">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent className="pb-6 text-[15px] leading-relaxed text-foreground/60">
              {faq.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </Section>
  );
}
