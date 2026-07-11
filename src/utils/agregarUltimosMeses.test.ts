import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { agregarUltimosMeses } from './agregarUltimosMeses'
import type { Transacao } from '../stores/gastos'

// Fixtures usam data-hora local explícita (sem sufixo "Z") para não sofrer o
// deslocamento de fuso horário na conversão UTC → local (o mesmo cuidado
// documentado no comentário de fixtures em stores/gastos.test.ts).
function transacao(data: string, valor: number): Transacao {
  return { id: 1, telefone: '5511999999999', descricao: 'teste', categoria: 'Outros', valor, data }
}

describe('agregarUltimosMeses', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 15)) // 15 de julho de 2026
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('mês sem nenhuma transação gera um bucket com total 0', () => {
    const buckets = agregarUltimosMeses([transacao('2026-07-10T12:00:00', 100)], 3)

    expect(buckets).toHaveLength(3)
    const maio = buckets.find((b) => b.rotulo === 'mai')
    const junho = buckets.find((b) => b.rotulo === 'jun')
    expect(maio?.total).toBe(0)
    expect(junho?.total).toBe(0)
  })

  it('mês com múltiplas transações soma corretamente', () => {
    const transacoes = [
      transacao('2026-07-01T12:00:00', 100),
      transacao('2026-07-15T12:00:00', 50),
      transacao('2026-07-30T12:00:00', 25.5),
    ]

    const buckets = agregarUltimosMeses(transacoes, 3)

    const julho = buckets.find((b) => b.rotulo === 'jul')
    expect(julho?.total).toBe(175.5)
  })

  it('transação fora da janela de N meses não é contada em nenhum bucket', () => {
    // Janela de 3 meses a partir de julho/2026 cobre mai, jun, jul — uma
    // transação de janeiro/2026 fica fora dela.
    const transacoes = [transacao('2026-01-10T12:00:00', 999)]

    const buckets = agregarUltimosMeses(transacoes, 3)

    const totalGeral = buckets.reduce((acc, b) => acc + b.total, 0)
    expect(totalGeral).toBe(0)
  })
})
