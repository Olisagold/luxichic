import React from 'react';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { Accordion } from '../../components/ui/Accordion';
import { WhatsAppButton } from '../../components/ui/WhatsAppButton';
import { faqs } from '../../data/content';
import { businessConfig } from '../../data/config';

export function FAQ() {
  return (
    <div className="mx-auto max-w-7xl px-5 pb-24 pt-10 lg:px-8">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'FAQs' }]} />
      <div className="mt-6 grid gap-12 lg:grid-cols-[260px_1fr]">
        <aside className="lg:sticky lg:top-28 lg:h-fit">
          <h1 className="font-display text-5xl text-ink">FAQs</h1>
          <nav aria-label="FAQ categories" className="mt-6 hidden lg:block">
            <ul className="space-y-2 text-sm">
              {faqs.map((c) => <li key={c.category}><a href={`#faq-${c.category}`} className="text-subtle hover:text-ink">{c.category}</a></li>)}
            </ul>
          </nav>
          <p className="mt-8 text-sm text-subtle">Still have questions?</p>
          <WhatsAppButton number={businessConfig.whatsapp.general} message="Hello LUXICHIC, I have a question." size="sm" className="mt-3" />
        </aside>
        <div className="space-y-14">
          {faqs.map((c) =>
          <section key={c.category} id={`faq-${c.category}`} className="scroll-mt-28" aria-labelledby={`faq-h-${c.category}`}>
              <h2 id={`faq-h-${c.category}`} className="mb-4 font-display text-3xl text-ink">{c.category}</h2>
              <Accordion items={c.items} />
            </section>
          )}
          <p className="text-xs text-subtle">Answers marked [Placeholder] will be finalised by LUXICHIC.</p>
        </div>
      </div>
    </div>);

}