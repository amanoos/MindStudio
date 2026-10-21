import { describe, it, expect } from 'vitest'
import { normalizeHeadword, slugify } from '../src/lib/server/normalize.js'

describe('normalizeHeadword', () => {
  it.each([
    ['Sanguine', 'sanguine'],
    ['  SANGUINE  ', 'sanguine'],
    ['well-being', 'well being'],
    ['well being', 'wellbeing'],
    ['Naïve', 'naive'],
    ['palimpsest', 'palimpsests'],
    ['obfuscate', 'obfuscated'],
    ['obfuscate', 'obfuscating'],
    ['stop', 'stopped'],
    ['ruby', 'rubies'],
    ['focus', 'focuses'],
    ["rock 'n' roll", 'rock-n-roll']
  ])('treats %s and %s as the same headword', (a, b) => {
    expect(normalizeHeadword(a)).toBe(normalizeHeadword(b))
  })

  it.each([
    ['equivocal', 'equivocate'],
    ['intransigent', 'intransigence'],
    ['bare', 'bar'],
    ['sanguine', 'sanguinary']
  ])('keeps %s and %s distinct', (a, b) => {
    expect(normalizeHeadword(a)).not.toBe(normalizeHeadword(b))
  })

  it('honors manual lemma overrides', () => {
    const key = normalizeHeadword('sanguine')
    expect(normalizeHeadword('sanguinely', { [normalizeHeadword('sanguinely')]: key })).toBe(key)
  })
})

describe('slugify', () => {
  it('makes URL-safe slugs', () => {
    expect(slugify('Naïve Realism!')).toBe('naive-realism')
  })
})
