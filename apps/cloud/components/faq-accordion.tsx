'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@repo/design-system/ui/accordion'

export interface FaqItem {
  answer: string
  question: string
}

/** Reusable CodeRocket FAQ disclosure with one optional open item. */
export function FaqAccordion({ items }: { items: FaqItem[] }) {
  return (
    <Accordion className="border-border border-t" collapsible type="single">
      {items.map(item => (
        <AccordionItem
          className="border-border border-b bg-surface px-1"
          key={item.question}
          value={item.question}
        >
          <AccordionTrigger className="px-5 py-5 text-left font-heading font-semibold text-lg hover:text-signal">
            {item.question}
          </AccordionTrigger>
          <AccordionContent className="max-w-3xl px-5 pb-6 text-muted leading-7">
            {item.answer}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}
