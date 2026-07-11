import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useMetasStore } from './metas'
import * as api from '../services/api'

vi.mock('../services/api', () => ({
  buscarMetas: vi.fn(),
  salvarMeta: vi.fn(),
  removerMeta: vi.fn(),
}))

describe('useMetasStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(api.buscarMetas).mockReset()
    vi.mocked(api.salvarMeta).mockReset()
    vi.mocked(api.removerMeta).mockReset()
  })

  it('salvarMeta atualiza em memória uma meta existente (upsert in-place) sem duplicar', async () => {
    vi.mocked(api.salvarMeta).mockResolvedValue({ sucesso: true })
    const store = useMetasStore()
    store.metas = [{ telefone: '5511999999999', categoria: 'Alimentação', valor_teto: 200 }]

    const resultado = await store.salvarMeta('5511999999999', 'Alimentação', 300)

    expect(resultado).toBe(true)
    expect(store.metas).toHaveLength(1)
    expect(store.metas[0]!.valor_teto).toBe(300)
  })

  it('salvarMeta adiciona (push) quando a categoria ainda não tem meta', async () => {
    vi.mocked(api.salvarMeta).mockResolvedValue({ sucesso: true })
    const store = useMetasStore()
    store.metas = [{ telefone: '5511999999999', categoria: 'Alimentação', valor_teto: 200 }]

    const resultado = await store.salvarMeta('5511999999999', 'Transporte', 150)

    expect(resultado).toBe(true)
    expect(store.metas).toHaveLength(2)
    expect(store.metas[1]).toEqual({ telefone: '5511999999999', categoria: 'Transporte', valor_teto: 150 })
  })

  it('removerMeta filtra a meta certa de metas.value', async () => {
    vi.mocked(api.removerMeta).mockResolvedValue({ sucesso: true })
    const store = useMetasStore()
    store.metas = [
      { telefone: '5511999999999', categoria: 'Alimentação', valor_teto: 200 },
      { telefone: '5511999999999', categoria: 'Transporte', valor_teto: 150 },
    ]

    const resultado = await store.removerMeta('5511999999999', 'Alimentação')

    expect(resultado).toBe(true)
    expect(store.metas).toHaveLength(1)
    expect(store.metas[0]!.categoria).toBe('Transporte')
  })

  it('salvarMeta seta erroAcao e não corrompe metas.value quando a API rejeita', async () => {
    vi.mocked(api.salvarMeta).mockRejectedValue(new Error('falhou'))
    const store = useMetasStore()
    store.metas = [{ telefone: '5511999999999', categoria: 'Alimentação', valor_teto: 200 }]

    const resultado = await store.salvarMeta('5511999999999', 'Alimentação', 300)

    expect(resultado).toBe(false)
    expect(store.erroAcao).toBe('Erro ao salvar a meta. Tente novamente.')
    expect(store.metas).toEqual([{ telefone: '5511999999999', categoria: 'Alimentação', valor_teto: 200 }])
  })

  it('removerMeta seta erroAcao e não corrompe metas.value quando a API rejeita', async () => {
    vi.mocked(api.removerMeta).mockRejectedValue(new Error('falhou'))
    const store = useMetasStore()
    store.metas = [{ telefone: '5511999999999', categoria: 'Alimentação', valor_teto: 200 }]

    const resultado = await store.removerMeta('5511999999999', 'Alimentação')

    expect(resultado).toBe(false)
    expect(store.erroAcao).toBe('Erro ao remover a meta. Tente novamente.')
    expect(store.metas).toEqual([{ telefone: '5511999999999', categoria: 'Alimentação', valor_teto: 200 }])
  })
})
