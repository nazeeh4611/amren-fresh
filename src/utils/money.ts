/**
 * All money is stored as integer fils (1 AED = 100 fils) to avoid floating point
 * rounding errors in financial calculations. Never do arithmetic on decimal AED
 * values directly - convert to fils first.
 */

export function aedToFils(aed: number): number {
  return Math.round(aed * 100);
}

export function filsToAed(fils: number): number {
  return fils / 100;
}

export function formatAED(fils: number): string {
  const aed = filsToAed(fils);
  return `AED ${aed.toLocaleString("en-AE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** quantity may be fractional (e.g. 2.5 KG); unitPriceFils is an integer. */
export function calculateLineTotalFils(quantity: number, unitPriceFils: number): number {
  return Math.round(quantity * unitPriceFils);
}
