import { describe, it, expect } from 'vitest'
import { PALETA_CORES } from './paletaCategorias'

describe('PALETA_CORES', () => {
  it('tem 24 cores', () => {
    expect(PALETA_CORES).toHaveLength(24)
  })

  it('todas em #rrggbb minúsculo', () => {
    for (const cor of PALETA_CORES) {
      expect(cor).toMatch(/^#[0-9a-f]{6}$/)
    }
  })

  it('não repete nenhuma cor', () => {
    expect(new Set(PALETA_CORES).size).toBe(PALETA_CORES.length)
  })
})
