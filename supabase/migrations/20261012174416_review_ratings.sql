CREATE UNIQUE INDEX "reviews_product_user_key" ON "reviews" USING btree ("product_id","user_id") WHERE "reviews"."user_id" is not null;--> statement-breakpoint

-- Product ratings from real reviews. products.rating is the average of a product's visible reviews (one
-- decimal) and products.review_count how many there are; hidden and archived reviews don't count. The trigger
-- keeps both current whenever a review is added, edited, moderated or deleted.

CREATE FUNCTION public.refresh_product_rating(pid uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  UPDATE public.products p
     SET rating = coalesce(x.average, 0),
         review_count = x.n
    FROM (SELECT round(avg(r.rating)::numeric, 1) AS average, count(*)::int AS n
            FROM public.reviews r
           WHERE r.product_id = pid AND r.status = 'visible') x
   WHERE p.id = pid;
$$;--> statement-breakpoint

CREATE FUNCTION public.reviews_refresh_product_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM public.refresh_product_rating(NEW.product_id);
  END IF;
  IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.product_id <> NEW.product_id) THEN
    PERFORM public.refresh_product_rating(OLD.product_id);
  END IF;
  RETURN NULL;
END;
$$;--> statement-breakpoint

CREATE TRIGGER reviews_refresh_product_rating
  AFTER INSERT OR DELETE OR UPDATE OF rating, status, product_id ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.reviews_refresh_product_rating();--> statement-breakpoint

REVOKE ALL ON FUNCTION public.refresh_product_rating(uuid) FROM PUBLIC, anon, authenticated;--> statement-breakpoint
REVOKE ALL ON FUNCTION public.reviews_refresh_product_rating() FROM PUBLIC, anon, authenticated;--> statement-breakpoint

-- Replace the prototype's sample ratings with the real ones (products without reviews get 0).
UPDATE public.products p
   SET rating = coalesce(x.average, 0),
       review_count = x.n
  FROM (SELECT p2.id, round(avg(r.rating)::numeric, 1) AS average, count(r.id)::int AS n
          FROM public.products p2
          LEFT JOIN public.reviews r ON r.product_id = p2.id AND r.status = 'visible'
         GROUP BY p2.id) x
 WHERE x.id = p.id;
