// lib/utils/currency.ts
// Indonesian Rupiah formatting helpers

/**
 * Format a number as Indonesian Rupiah
 * e.g. 8500000 → "Rp 8.500.000"
 */
export function formatRupiah(amount: number, compact = false): string {
  if (compact && Math.abs(amount) >= 1_000_000) {
    const juta = amount / 1_000_000;
    return `Rp ${juta % 1 === 0 ? juta : juta.toFixed(1)} jt`;
  }
  if (compact && Math.abs(amount) >= 1_000) {
    const ribu = amount / 1_000;
    return `Rp ${Math.round(ribu)} rb`;
  }
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format with explicit +/- sign
 * e.g. income: "+Rp 8.500.000", expense: "-Rp 3.120.000"
 */
export function formatCashflow(
  amount: number,
  type: "income" | "expense"
): string {
  const prefix = type === "income" ? "+" : "-";
  return `${prefix}${formatRupiah(Math.abs(amount))}`;
}

/**
 * Parse a formatted Rupiah string back to number
 */
export function parseRupiah(value: string): number {
  return Number(value.replace(/[^0-9,-]/g, "").replace(",", "."));
}

