ALTER TABLE "products" ADD COLUMN "search_document" "tsvector";--> statement-breakpoint
CREATE INDEX "products_search_idx" ON "products" USING gin ("search_document");--> statement-breakpoint

-- Product search (lib/storefront/search.ts).
--
-- products.search_document holds the words a product can be found by, weighted so better matches rank higher:
--   A  name
--   B  category names, texture, construction, origin, lace type, brand, lengths ("22 inches"), features
--   C  short description
--   D  description and specifications
-- The triggers below rebuild it whenever any of those change, including category renames and category links.

CREATE FUNCTION public.product_search_document(p public.products)
RETURNS tsvector
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    setweight(to_tsvector('english', coalesce(p.name, '')), 'A') ||
    setweight(to_tsvector('english', concat_ws(' ',
      (SELECT string_agg(c.name || ' ' || replace(c.slug, '-', ' '), ' ')
         FROM public.product_categories pc
         JOIN public.categories c ON c.id = pc.category_id
        WHERE pc.product_id = p.id),
      p.attributes ->> 'texture',
      p.attributes ->> 'construction',
      p.attributes ->> 'origin',
      p.attributes ->> 'laceType',
      p.attributes ->> 'brand',
      (SELECT string_agg(l || ' inches ' || l || 'inch', ' ')
         FROM jsonb_array_elements_text(coalesce(p.attributes -> 'lengths', '[]'::jsonb)) l),
      (SELECT string_agg(f, ' ')
         FROM jsonb_array_elements_text(coalesce(p.attributes -> 'features', '[]'::jsonb)) f)
    )), 'B') ||
    setweight(to_tsvector('english', coalesce(p.short_description, '')), 'C') ||
    setweight(to_tsvector('english', concat_ws(' ',
      p.description,
      (SELECT string_agg(concat_ws(' ', s ->> 'label', s ->> 'value'), ' ')
         FROM jsonb_array_elements(coalesce(p.specs, '[]'::jsonb)) s)
    )), 'D')
$$;
--> statement-breakpoint

CREATE FUNCTION public.products_set_search_document()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.search_document := public.product_search_document(NEW);
  RETURN NEW;
END;
$$;
--> statement-breakpoint

CREATE TRIGGER products_search_document
  BEFORE INSERT OR UPDATE OF name, short_description, description, attributes, specs ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.products_set_search_document();
--> statement-breakpoint

-- Linking or unlinking a category changes which category names a product is found by.
CREATE FUNCTION public.product_categories_refresh_search_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.products p
     SET search_document = public.product_search_document(p)
   WHERE p.id IN (SELECT product_id FROM new_rows);
  RETURN NULL;
END;
$$;
--> statement-breakpoint

CREATE FUNCTION public.product_categories_refresh_search_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.products p
     SET search_document = public.product_search_document(p)
   WHERE p.id IN (SELECT product_id FROM old_rows);
  RETURN NULL;
END;
$$;
--> statement-breakpoint

CREATE TRIGGER product_categories_search_insert
  AFTER INSERT ON public.product_categories
  REFERENCING NEW TABLE AS new_rows
  FOR EACH STATEMENT EXECUTE FUNCTION public.product_categories_refresh_search_insert();
--> statement-breakpoint

CREATE TRIGGER product_categories_search_delete
  AFTER DELETE ON public.product_categories
  REFERENCING OLD TABLE AS old_rows
  FOR EACH STATEMENT EXECUTE FUNCTION public.product_categories_refresh_search_delete();
--> statement-breakpoint

-- Renaming a category changes the words its products are found by.
CREATE FUNCTION public.categories_refresh_search()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.products p
     SET search_document = public.product_search_document(p)
   WHERE p.id IN (SELECT product_id FROM public.product_categories WHERE category_id = NEW.id);
  RETURN NULL;
END;
$$;
--> statement-breakpoint

CREATE TRIGGER categories_search
  AFTER UPDATE OF name, slug ON public.categories
  FOR EACH ROW
  WHEN (OLD.name IS DISTINCT FROM NEW.name OR OLD.slug IS DISTINCT FROM NEW.slug)
  EXECUTE FUNCTION public.categories_refresh_search();
--> statement-breakpoint

REVOKE EXECUTE ON FUNCTION
  public.product_search_document(public.products),
  public.products_set_search_document(),
  public.product_categories_refresh_search_insert(),
  public.product_categories_refresh_search_delete(),
  public.categories_refresh_search()
FROM public, anon, authenticated;
--> statement-breakpoint

-- Existing products.
UPDATE public.products p SET search_document = public.product_search_document(p);
--> statement-breakpoint

-- Typo-tolerant fallback when a search finds nothing ("bone stright"): trigram similarity on product names.
-- No index: it only runs after a search came back empty, over published products.
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
