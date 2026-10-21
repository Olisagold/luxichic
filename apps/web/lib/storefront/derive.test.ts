import { describe, expect, it } from 'vitest';
import { buildInitialDb } from '@/data/prototype-store';
import { deriveStorefront, type StorefrontSource } from './derive';

function source(overrides: Partial<StorefrontSource>): StorefrontSource {
  const store = buildInitialDb();
  return { ...store, settings: store.settings, reviewQuotes: [], ...overrides };
}

describe('homepage testimonials', () => {
  const base = source({});
  const quote = (text: string, status: 'active' | 'archived' = 'active') => ({
    ...base.content.testimonials[0],
    text,
    status,
  });

  it('shows the admin’s active quotes first, then real reviews; archived quotes never', () => {
    const data = deriveStorefront(
      source({
        content: { ...base.content, testimonials: [quote('From the CEO’s list'), quote('Old one', 'archived')] },
        reviewQuotes: [
          { authorName: 'Adaeze Okafor', rating: 5, body: 'Lovely hair, soft and full.', productName: 'Body Wave Wig' },
        ],
      }),
    );
    expect(data.content.testimonials).toEqual([
      expect.objectContaining({ text: 'From the CEO’s list' }),
      { name: 'Adaeze Okafor', initials: 'AO', rating: 5, item: 'Body Wave Wig', text: 'Lovely hair, soft and full.' },
    ]);
  });

  it('is empty (so the section hides) with no quotes and no reviews', () => {
    const data = deriveStorefront(source({ content: { ...base.content, testimonials: [quote('Old', 'archived')] } }));
    expect(data.content.testimonials).toEqual([]);
  });

  it('shortens a long review at a word break', () => {
    const body = `${'Really good hair '.repeat(30)}end`;
    const data = deriveStorefront(
      source({
        content: { ...base.content, testimonials: [] },
        reviewQuotes: [{ authorName: 'Ngozi', rating: 4, body, productName: 'Wig' }],
      }),
    );
    const text = data.content.testimonials[0].text;
    expect(text.length).toBeLessThanOrEqual(240);
    expect(text).toMatch(/hair…$/);
  });
});
