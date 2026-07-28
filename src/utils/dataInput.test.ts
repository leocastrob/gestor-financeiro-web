import { describe, it, expect, afterEach, vi } from 'vitest'
import { hojeISO, paraInputDate } from './dataInput'

afterEach(() => {
  vi.useRealTimers()
})

describe('hojeISO', () => {
  it('devolve o dia local em AAAA-MM-DD, com zero à esquerda', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 0, 5, 23, 40, 0))

    expect(hojeISO()).toBe('2026-01-05')
  })
})

describe('paraInputDate', () => {
  it('converte um Date para o dia local', () => {
    expect(paraInputDate(new Date(2026, 6, 28, 14, 32, 7))).toBe('2026-07-28')
  })

  it('devolve uma string AAAA-MM-DD inalterada, sem passar por Date', () => {
    // new Date('2026-07-28') seria meia-noite UTC e viraria 27/07 em BRT
    expect(paraInputDate('2026-07-28')).toBe('2026-07-28')
  })

  it('converte o ISO completo que a API devolve para o dia local', () => {
    const iso = new Date(2026, 6, 28, 14, 32, 7).toISOString()

    expect(paraInputDate(iso)).toBe('2026-07-28')
  })

  it('devolve string vazia para valor inválido, em vez de chutar uma data', () => {
    expect(paraInputDate('banana')).toBe('')
    expect(paraInputDate('')).toBe('')
  })
})
