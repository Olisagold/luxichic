const formatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0
});

export function formatNaira(amount: number): string {
  return formatter.format(amount).replace('NGN', '₦').replace(/\s/, '');
}

export function discountPercent(price: number, original?: number): number | null {
  if (!original || original <= price) return null;
  return Math.round((original - price) / original * 100);
}