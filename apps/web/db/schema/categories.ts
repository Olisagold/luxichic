import { pgTable, smallint, text, unique, uuid } from 'drizzle-orm/pg-core';
import { createdAt, division, publicRead, updatedAt } from './_shared';

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    division: division('division').notNull(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    /** Mega-menu column the category appears under, e.g. "Wigs" or "Hair Care". */
    groupName: text('group_name').notNull(),
    imageUrl: text('image_url'),
    sortOrder: smallint('sort_order').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [unique('categories_division_slug_key').on(t.division, t.slug), publicRead('categories: public read')],
);
