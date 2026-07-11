import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useGastosStore } from './gastos'
import * as api from '../services/api'

vi.mock('../services/api', () => ({
  excluirGasto: vi.fn().mockResolvedValue({ sucesso: true }),
}))

// O ambiente de teste roda em Node puro (sem jsdom — ver Task 1), e o store lê/escreve
// em localStorage ao ser instanciado. Node não tem localStorage global por padrão
// (confirmado: `node -e "console.log(typeof localStorage)"` retorna "undefined" mesmo
// no Node 24), então stubamos um substituto mínimo em memória.
function criarLocalStorageFalso() {
  const armazenamento = new Map<string, string>()
  return {
    getItem: (chave: string) => armazenamento.get(chave) ?? null,
    setItem: (chave: string, valor: string) => { armazenamento.set(chave, valor) },
    removeItem: (chave: string) => { armazenamento.delete(chave) },
    clear: () => armazenamento.clear(),
  }
}

vi.stubGlobal('localStorage', criarLocalStorageFalso())

describe('useGastosStore — excluir com desfazer', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
    vi.mocked(api.excluirGasto).mockClear()
  })

  it('some da lista visível imediatamente, mas não chama a API antes do tempo de graça', () => {
    const store = useGastosStore()
    store.transacoes = [
      { id: 1, telefone: '5511999999999', descricao: 'mercado', categoria: 'Alimentação', valor: 50, data: '2026-07-01' },
    ]

    store.marcarParaExcluir(1)

    expect(store.transacoesVisiveis).toHaveLength(0)
    expect(api.excluirGasto).not.toHaveBeenCalled()
  })

  it('desfazer restaura o item e nunca chama a API', () => {
    const store = useGastosStore()
    store.transacoes = [
      { id: 1, telefone: '5511999999999', descricao: 'mercado', categoria: 'Alimentação', valor: 50, data: '2026-07-01' },
    ]

    store.marcarParaExcluir(1)
    store.desfazerExclusao(1)

    expect(store.transacoesVisiveis).toHaveLength(1)

    vi.advanceTimersByTime(6000)
    expect(api.excluirGasto).not.toHaveBeenCalled()
  })

  it('sem desfazer, chama a API de verdade após o tempo de graça e remove definitivamente', async () => {
    const store = useGastosStore()
    store.transacoes = [
      { id: 1, telefone: '5511999999999', descricao: 'mercado', categoria: 'Alimentação', valor: 50, data: '2026-07-01' },
    ]

    store.marcarParaExcluir(1)
    await vi.advanceTimersByTimeAsync(5000)

    expect(api.excluirGasto).toHaveBeenCalledWith(1, '')
    expect(store.transacoes).toHaveLength(0)
  })
})
