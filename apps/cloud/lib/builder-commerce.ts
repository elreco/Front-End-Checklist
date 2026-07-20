const currencySymbols: Record<string, string> = {
  A$: 'aud',
  CA$: 'cad',
  CHF: 'chf',
  EUR: 'eur',
  GBP: 'gbp',
  USD: 'usd',
  '€': 'eur',
  '£': 'gbp',
  $: 'usd'
}

export interface BuilderPrice {
  currency: string
  unitAmount: number
}

/** Convert one owner-visible product price into Stripe's minor currency unit. */
export function readBuilderPrice(
  value: string | undefined,
  defaultCurrency = 'eur'
): BuilderPrice | undefined {
  if (!value) return undefined
  const normalized = value.replaceAll('\u00a0', ' ').trim()
  const currency = readCurrency(normalized, defaultCurrency)
  if (!currency) return undefined
  const amount = readDecimalAmount(normalized)
  if (!(amount && amount > 0)) return undefined
  const unitAmount = Math.round(amount * 100)
  return unitAmount > 0 && unitAmount <= 99_999_999 ? { currency, unitAmount } : undefined
}

function readCurrency(value: string, fallback: string): string | undefined {
  const upper = value.toUpperCase()
  for (const [marker, currency] of Object.entries(currencySymbols)) {
    if (marker.length > 1 && upper.includes(marker)) return currency
  }
  if (value.includes('€')) return 'eur'
  if (value.includes('£')) return 'gbp'
  if (value.includes('$')) {
    const safeFallback = fallback.toLowerCase()
    return safeFallback === 'usd' || safeFallback === 'cad' || safeFallback === 'aud'
      ? safeFallback
      : 'usd'
  }
  const safeFallback = fallback.toLowerCase()
  return ['eur', 'usd', 'gbp', 'cad', 'aud', 'chf'].includes(safeFallback)
    ? safeFallback
    : undefined
}

function readDecimalAmount(value: string): number | undefined {
  const match = value.match(/\d[\d\s'.,]*/)
  if (!match) return undefined
  let number = match[0].replaceAll(' ', '').replaceAll("'", '')
  const comma = number.lastIndexOf(',')
  const dot = number.lastIndexOf('.')
  if (comma >= 0 && dot >= 0) {
    const decimal = comma > dot ? ',' : '.'
    number = number.replaceAll(decimal === ',' ? '.' : ',', '').replace(decimal, '.')
  } else {
    const separator = comma >= 0 ? ',' : dot >= 0 ? '.' : undefined
    if (separator) {
      const parts = number.split(separator)
      const finalPart = parts.at(-1) ?? ''
      number =
        finalPart.length === 1 || finalPart.length === 2
          ? `${parts.slice(0, -1).join('')}.${finalPart}`
          : parts.join('')
    }
  }
  const parsed = Number(number)
  return Number.isFinite(parsed) ? parsed : undefined
}
