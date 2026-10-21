'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { useStorefront } from '@/components/storefront/StorefrontProvider';
import { cn } from '@/lib/utils/cn';
import { NotFound } from '@/views/info/NotFound';

export function Policy() {
  const { slug } = useParams<{ slug: string }>();
  const { policies } = useStorefront().content;
  const policy = policies[slug];
  if (!policy) return <NotFound />;

  return (
    <div className="mx-auto max-w-site px-5 pb-24 pt-10 lg:px-8">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: policy.title }]} />
      <div className="mt-6 grid grid-cols-1 gap-12 lg:grid-cols-[240px_1fr]">
        <nav aria-label="Policies" className="lg:sticky lg:top-28 lg:h-fit">
          <ul className="no-scrollbar -mx-5 flex gap-2 relative overflow-x-auto px-5 lg:mx-0 lg:flex-col lg:px-0">
            {Object.entries(policies).map(([key, p]) => (
              <li key={key}>
                <Link
                  href={`/policies/${key}`}
                  className={cn(
                    'block whitespace-nowrap rounded-full px-4 py-2 text-sm lg:rounded-xl',
                    key === slug ? 'bg-ink text-white' : 'text-charcoal hover:bg-white',
                  )}
                >
                  {p.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <article className="max-w-3xl">
          <h1 className="font-display text-5xl text-ink">{policy.title}</h1>
          {policy.sections.map((s, i) => (
            <section key={s.heading} className="mt-10">
              <h2 className="font-display text-2xl text-ink">
                {i + 1}. {s.heading}
              </h2>
              <PolicyText text={s.body} />
            </section>
          ))}
        </article>
      </div>
    </div>
  );
}

/** A policy section's text: blank lines start paragraphs, and lines starting with "- " are bullet points. */
function PolicyText({ text }: { text: string }) {
  return (
    <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-charcoal">
      {text
        .split(/\n\s*\n/)
        .map((block) => block.trim())
        .filter(Boolean)
        .map((block, i) => {
          const lines = block.split('\n').map((l) => l.trim());
          const intro = lines.filter((l) => !l.startsWith('- '));
          const bullets = lines.filter((l) => l.startsWith('- ')).map((l) => l.slice(2));
          return (
            <React.Fragment key={i}>
              {intro.length > 0 && <p>{intro.join(' ')}</p>}
              {bullets.length > 0 && (
                <ul className="list-disc space-y-1.5 pl-5 marker:text-pink-deep">
                  {bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              )}
            </React.Fragment>
          );
        })}
    </div>
  );
}
