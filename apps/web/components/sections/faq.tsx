import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { faqs } from "@/lib/faqs";

export function Faq() {
  return (
    <section
      id="faq"
      className="scroll-mt-16 border-b border-border bg-secondary/40"
    >
      <div className="mx-auto max-w-3xl px-6 py-24 sm:py-28">
        <div className="mb-10">
          <p className="mb-3 inline-flex items-center gap-2 font-mono text-xs tracking-wider text-accent uppercase">
            <span className="h-px w-6 bg-accent" aria-hidden />
            FAQ
          </p>
          <h2 className="text-3xl font-medium tracking-[-0.01em] text-foreground sm:text-4xl">
            Questions, answered.
          </h2>
        </div>

        <Accordion className="w-full">
          {faqs.map((faq, i) => (
            <AccordionItem
              key={faq.question}
              value={`item-${i}`}
              className="border-border"
            >
              <AccordionTrigger className="py-5 text-left text-base font-medium text-foreground hover:no-underline">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="pb-5 text-[15px] leading-relaxed text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
