import { describe, it, expect } from 'vitest'
import { gerarCsv } from './exportar'
import type { Transacao } from '../stores/gastos'

const transacaoExemplo = (sobrescritas: Partial<Transacao> = {}): Transacao => ({
  id: 1,
  telefone: '5511999999999',
  descricao: 'mercado',
  categoria: 'Alimentação',
  valor: 50,
  data: '2026-07-05T12:00:00.000Z',
  tipo: 'despesa',
  ...sobrescritas,
})

describe('gerarCsv', () => {
  it('inclui cabeçalho e uma linha por transação', () => {
    const csv = gerarCsv([transacaoExemplo()])
    const linhas = csv.split('\r\n')
    expect(linhas).toHaveLength(2)
    expect(linhas[0]).toBe('"Data";"Descrição";"Categoria";"Valor"')
  })

  it('formata o valor com vírgula decimal', () => {
    const csv = gerarCsv([transacaoExemplo({ valor: 1234.5 })])
    expect(csv).toContain('"1234,50"')
  })

  it('escapa aspas duplas na descrição', () => {
    const csv = gerarCsv([transacaoExemplo({ descricao: 'presente "surpresa"' })])
    expect(csv).toContain('"presente ""surpresa"""')
  })

  it('usa "Outros" quando a categoria vem vazia', () => {
    const csv = gerarCsv([transacaoExemplo({ categoria: '' })])
    expect(csv).toContain('"Outros"')
  })
})
