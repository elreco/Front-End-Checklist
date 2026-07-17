const MICROEUROS_PER_EURO = 1_000_000

/** Convert a stored micro-euro amount into a value suitable for budget controls. */
export function microeurosToEuros(microeuros: number): number {
  return microeuros / MICROEUROS_PER_EURO
}

/** Format integer credit values consistently throughout billing UI. */
export function formatAiCredits(credits: number): string {
  return new Intl.NumberFormat('en-GB').format(credits)
}

/** Format metered AI spending in euros without hiding cents. */
export function formatAiSpending(microeuros: number): string {
  return new Intl.NumberFormat('en-IE', {
    currency: 'EUR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: 'currency'
  }).format(microeurosToEuros(microeuros))
}

/** Format billing reset dates in the product's current English interface. */
export function formatBillingDate(value: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date(value))
}
