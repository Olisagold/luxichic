import { z } from 'zod';

/** A cart line as the browser sends it: never a price, only what to price. Server code validates with this. */
export const cartLineSchema = z.object({
  productId: z.string().min(1).max(64),
  selection: z.record(z.string().max(100)).refine((s) => Object.keys(s).length <= 10),
  quantity: z.number().int(),
  savedForLater: z.boolean().optional(),
});
