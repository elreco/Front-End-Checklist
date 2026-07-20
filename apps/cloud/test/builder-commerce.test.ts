import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { readBuilderPrice } from '../lib/builder-commerce'

describe('published website product prices', () => {
  it('reads common non-technical price formats', () => {
    assert.deepEqual(readBuilderPrice('29 €'), { currency: 'eur', unitAmount: 2900 })
    assert.deepEqual(readBuilderPrice('$19.95', 'usd'), {
      currency: 'usd',
      unitAmount: 1995
    })
    assert.deepEqual(readBuilderPrice('1 299,50 EUR'), {
      currency: 'eur',
      unitAmount: 129_950
    })
    assert.deepEqual(readBuilderPrice('£1,299.00'), {
      currency: 'gbp',
      unitAmount: 129_900
    })
  })

  it('uses the connected account currency when no marker is shown', () => {
    assert.deepEqual(readBuilderPrice('49.90', 'chf'), {
      currency: 'chf',
      unitAmount: 4990
    })
  })

  it('rejects missing, free, unsupported, and implausibly large amounts', () => {
    assert.equal(readBuilderPrice(undefined), undefined)
    assert.equal(readBuilderPrice('Free'), undefined)
    assert.equal(readBuilderPrice('0 EUR'), undefined)
    assert.equal(readBuilderPrice('10 JPY', 'jpy'), undefined)
    assert.equal(readBuilderPrice('1000000 EUR'), undefined)
  })
})
