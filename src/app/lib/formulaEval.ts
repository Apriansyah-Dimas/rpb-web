/**
 * Safely evaluates a formula expression using L, W, H, T variables.
 * Example: "2*(L+W)*H/1000000" with L=3000, W=2000, H=2500, T=100
 */
export function evalFormula(
  formula: string,
  L: number,
  W: number,
  H: number,
  T: number
): number {
  try {
    const sanitized = formula.replace(/[^0-9LWHTMathceilfloorround.+\-*/()%\s]/g, "");
    // eslint-disable-next-line no-new-func
    const fn = new Function("L", "W", "H", "T", "Math", `return ${sanitized}`);
    const result = fn(L, W, H, T, Math);
    if (typeof result !== "number" || isNaN(result) || !isFinite(result)) return 0;
    return Math.max(0, result);
  } catch {
    return 0;
  }
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(n: number, decimals = 2): string {
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(n);
}
