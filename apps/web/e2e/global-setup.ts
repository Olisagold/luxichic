import postgres from 'postgres';
import { localSupabase } from './local-supabase';

/**
 * Before each run: the product the checkout tests buy is restocked (every run sells a few), and Pay on Delivery
 * starts switched off, so runs don't depend on earlier ones.
 */
export default async function globalSetup() {
  const db = postgres(localSupabase().dbUrl, { prepare: false, max: 1 });
  try {
    await db`
      update inventory set stock = 500
      where product_id = (select id from products where slug = 'ceramic-flat-iron-straightener')`;
    await db`update settings set value = '{"enabled": false}'::jsonb where key = 'pay_on_delivery'`;
  } finally {
    await db.end();
  }
}
