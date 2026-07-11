import { describe, it, expect } from 'vitest'
import { formatarMoeda } from './formatarMoeda'

describe('formatarMoeda', () => {
  it('formata valor inteiro como moeda BRL', () => {
    expect(formatarMoeda(1500)).toBe('R$ 1.500,00')
  })

  it('formata valor decimal como moeda BRL', () => {
    expect(formatarMoeda(42.5)).toBe('R$ 42,50')
  })

  it('aceita valor em string (vindo da API)', () => {
    expect(formatarMoeda('99.90')).toBe('R$ 99,90')
  })
})
