export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount ?? 0);
}

// Für Y-Achse im Chart: 1.200.000 € -> 1,2 Mio. usw. (einfach & lesbar)
export function formatChartAxis(value: number) {
  const v = Number(value ?? 0);

  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(".", ",")} Mio.`;
  if (Math.abs(v) >= 1_000) return `${Math.round(v / 1_000)} Tsd.`;
  return `${Math.round(v)}`;
}
