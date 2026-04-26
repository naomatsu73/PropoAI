import type { TaxRate, RoundingType } from "@/types"

function applyRounding(value: number, rounding: RoundingType): number {
  switch (rounding) {
    case "floor":
      return Math.floor(value)
    case "round":
      return Math.round(value)
    case "ceil":
      return Math.ceil(value)
  }
}

export function calculateTax(
  subtotal: number,
  taxRate: TaxRate,
  rounding: RoundingType,
  withholding: boolean
): { taxAmount: number; withholdingTaxAmount: number; total: number } {
  const taxAmount = applyRounding(subtotal * (taxRate / 100), rounding)
  // 源泉徴収は法定で切り捨て
  const withholdingTaxAmount = withholding ? Math.floor(subtotal * 0.1021) : 0
  const total = subtotal + taxAmount - withholdingTaxAmount

  return { taxAmount, withholdingTaxAmount, total }
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }).format(amount)
}

export function validateInvoiceNumber(value: string): boolean {
  return /^T\d{13}$/.test(value)
}
