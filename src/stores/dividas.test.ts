import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useDividasStore } from './dividas'
import * as api from '../services/api'

vi.mock('../services/api', () => ({
  buscarDividas: vi.fn(),
  criarDivida: vi.fn(),
  editarDivida: vi.fn(),
  excluirDivida: vi.fn(),
  lancarParcela: vi.fn(),
}))

describe('useDividasStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(api.buscarDividas).mockReset()
    vi.mocked(api.criarDivida).mockReset()
    vi.mocked(api.editarDivida).mockReset()
    vi.mocked(api.excluirDivida).mockReset()
    vi.mocked(api.lancarParcela).mockReset()
  })

  it('criarDivida adiciona (unshift) a dívida nova com parcelas_pagas zerado', async () => {
    const nova = { id: 1, telefone: '5511999999999', descricao: 'Geladeira em 10x', categoria: 'Outros', valor_parcela: 150, total_parcelas: 10, data_primeira_parcela: '2026-08-01', ativa: 1, criado_em: '2026-07-12' }
    vi.mocked(api.criarDivida).mockResolvedValue(nova as never)
    const store = useDividasStore()

    const resultado = await store.criarDivida('5511999999999', { descricao: 'Geladeira em 10x', valor_parcela: 150, total_parcelas: 10, data_primeira_parcela: '2026-08-01' })

    expect(resultado).toEqual(nova)
    expect(store.dividas).toHaveLength(1)
    expect(store.dividas[0]!.parcelas_pagas).toBe(0)
  })

  it('criarDivida seta erroAcao e retorna null quando a API rejeita', async () => {
    vi.mocked(api.criarDivida).mockRejectedValue(new Error('falhou'))
    const store = useDividasStore()

    const resultado = await store.criarDivida('5511999999999', { descricao: 'x', valor_parcela: 1, total_parcelas: 1, data_primeira_parcela: '2026-08-01' })

    expect(resultado).toBeNull()
    expect(store.erroAcao).toBe('Erro ao criar a dívida. Tente novamente.')
    expect(store.dividas).toHaveLength(0)
  })

  it('editarDivida mescla os campos editados na dívida em memória', async () => {
    vi.mocked(api.editarDivida).mockResolvedValue({ sucesso: true })
    const store = useDividasStore()
    store.dividas = [{ id: 1, telefone: '5511999999999', descricao: 'Antigo', categoria: 'Outros', valor_parcela: 150, total_parcelas: 10, data_primeira_parcela: '2026-08-01', ativa: 1, criado_em: '2026-07-12', parcelas_pagas: 2 }]

    const resultado = await store.editarDivida(1, '5511999999999', { descricao: 'Novo', valor_parcela: 200 })

    expect(resultado).toBe(true)
    expect(store.dividas[0]!.descricao).toBe('Novo')
    expect(store.dividas[0]!.valor_parcela).toBe(200)
  })

  it('excluirDivida remove da lista quando a dívida não tinha parcela lançada', async () => {
    vi.mocked(api.excluirDivida).mockResolvedValue({ sucesso: true })
    const store = useDividasStore()
    store.dividas = [{ id: 1, telefone: '5511999999999', descricao: 'x', categoria: 'Outros', valor_parcela: 150, total_parcelas: 10, data_primeira_parcela: '2026-08-01', ativa: 1, criado_em: '2026-07-12', parcelas_pagas: 0 }]

    const resultado = await store.excluirDivida(1, '5511999999999')

    expect(resultado).toBe(true)
    expect(store.dividas).toHaveLength(0)
  })

  it('excluirDivida marca ativa=0 (sem remover) quando a dívida já tinha parcela lançada', async () => {
    vi.mocked(api.excluirDivida).mockResolvedValue({ sucesso: true })
    const store = useDividasStore()
    store.dividas = [{ id: 1, telefone: '5511999999999', descricao: 'x', categoria: 'Outros', valor_parcela: 150, total_parcelas: 10, data_primeira_parcela: '2026-08-01', ativa: 1, criado_em: '2026-07-12', parcelas_pagas: 3 }]

    const resultado = await store.excluirDivida(1, '5511999999999')

    expect(resultado).toBe(true)
    expect(store.dividas).toHaveLength(1)
    expect(store.dividas[0]!.ativa).toBe(0)
  })

  it('lancarParcela incrementa parcelas_pagas quando não estava lançada ainda', async () => {
    vi.mocked(api.lancarParcela).mockResolvedValue({ sucesso: true, jaLancada: false, quitada: false })
    const store = useDividasStore()
    store.dividas = [{ id: 1, telefone: '5511999999999', descricao: 'x', categoria: 'Outros', valor_parcela: 150, total_parcelas: 10, data_primeira_parcela: '2026-08-01', ativa: 1, criado_em: '2026-07-12', parcelas_pagas: 3 }]

    const resultado = await store.lancarParcela(1)

    expect(resultado).toEqual({ sucesso: true, jaLancada: false, quitada: false })
    expect(store.dividas[0]!.parcelas_pagas).toBe(4)
    expect(store.dividas[0]!.ativa).toBe(1)
  })

  it('lancarParcela marca ativa=0 quando quitada=true', async () => {
    vi.mocked(api.lancarParcela).mockResolvedValue({ sucesso: true, jaLancada: false, quitada: true })
    const store = useDividasStore()
    store.dividas = [{ id: 1, telefone: '5511999999999', descricao: 'x', categoria: 'Outros', valor_parcela: 150, total_parcelas: 10, data_primeira_parcela: '2026-08-01', ativa: 1, criado_em: '2026-07-12', parcelas_pagas: 9 }]

    await store.lancarParcela(1)

    expect(store.dividas[0]!.parcelas_pagas).toBe(10)
    expect(store.dividas[0]!.ativa).toBe(0)
  })

  it('lancarParcela não incrementa quando jaLancada=true (idempotente)', async () => {
    vi.mocked(api.lancarParcela).mockResolvedValue({ sucesso: true, jaLancada: true, quitada: false })
    const store = useDividasStore()
    store.dividas = [{ id: 1, telefone: '5511999999999', descricao: 'x', categoria: 'Outros', valor_parcela: 150, total_parcelas: 10, data_primeira_parcela: '2026-08-01', ativa: 1, criado_em: '2026-07-12', parcelas_pagas: 3 }]

    await store.lancarParcela(1)

    expect(store.dividas[0]!.parcelas_pagas).toBe(3)
  })

  it('resetar limpa dividas, erro e erroAcao', () => {
    const store = useDividasStore()
    store.dividas = [{ id: 1, telefone: '5511999999999', descricao: 'x', categoria: 'Outros', valor_parcela: 150, total_parcelas: 10, data_primeira_parcela: '2026-08-01', ativa: 1, criado_em: '2026-07-12', parcelas_pagas: 0 }]
    store.erro = 'Erro ao buscar'
    store.erroAcao = 'Erro ao criar'

    store.resetar()

    expect(store.dividas).toHaveLength(0)
    expect(store.erro).toBeNull()
    expect(store.erroAcao).toBeNull()
  })
})
