// Pure analytics helpers (no DB) — unit-testable.

export const round1 = (n: number) => Math.round(n * 10) / 10;

// Period-over-period growth as a percentage.
export function growthPct(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return round1(((current - previous) / previous) * 100);
}

// Average order value.
export const aov = (revenue: number, orders: number) => (orders === 0 ? 0 : Math.round(revenue / orders));

// Conversion rate (%) of carts → paid orders.
export const conversionRate = (paidOrders: number, sessions: number) =>
  sessions === 0 ? 0 : round1((paidOrders / sessions) * 100);

// Fill gaps in a daily series so charts don't skip empty days.
export function fillDailySeries(rows: { date: string; value: number }[], from: Date, to: Date): { date: string; value: number }[] {
  const byDate = new Map(rows.map((r) => [r.date, r.value]));
  const out: { date: string; value: number }[] = [];
  const d = new Date(from);
  while (d <= to) {
    const key = d.toISOString().slice(0, 10);
    out.push({ date: key, value: byDate.get(key) ?? 0 });
    d.setDate(d.getDate() + 1);
  }
  return out;
}
