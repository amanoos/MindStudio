import { render, screen } from '@testing-library/svelte'
import { describe, it, expect } from 'vitest'
import Mascot from '../../src/lib/components/Mascot.svelte'

describe('Mascot', () => {
  it('exposes an accessible label by default', () => {
    render(Mascot)
    expect(screen.getByRole('img', { name: /professor hoot/i })).toBeTruthy()
  })

  it('applies the requested mood class', () => {
    const { container } = render(Mascot, { mood: 'sleep' })
    expect(container.querySelector('svg.sleep')).toBeTruthy()
  })
})
